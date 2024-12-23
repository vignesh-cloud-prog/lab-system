require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ECSClient, RunTaskCommand, DescribeTasksCommand } = require("@aws-sdk/client-ecs");
const { SSMClient, StartSessionCommand, TerminateSessionCommand, SendCommandCommand, GetCommandInvocationCommand } = require("@aws-sdk/client-ssm");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const ecsClient = new ECSClient({ region: process.env.AWS_REGION });
const ssmClient = new SSMClient({ region: process.env.AWS_REGION });

const CLUSTER_NAME = process.env.ECS_CLUSTER_NAME;
const TASK_DEFINITION = process.env.ECS_TASK_DEFINITION;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

io.on("connection", (socket) => {
  console.log("New client connected, socket ID:", socket.id);
  let sessionId = null;
  let taskArn = null;

  socket.on("start_session", async () => {
    console.log("Received start_session event from client");
    try {
      console.log("Starting ECS task...");
      const runTaskResponse = await ecsClient.send(new RunTaskCommand({
        cluster: CLUSTER_NAME,
        taskDefinition: TASK_DEFINITION,
        launchType: "FARGATE",
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: [process.env.SUBNET_ID],
            securityGroups: [process.env.SECURITY_GROUP_ID],
            assignPublicIp: "ENABLED"
          }
        }
      }));

      taskArn = runTaskResponse.tasks?.[0].taskArn;
      console.log("Task started:", taskArn);

      if (!taskArn) {
        throw new Error("Failed to start task");
      }

      let taskRunning = false;
      let retries = 0;
      const maxRetries = 30;
      while (!taskRunning && retries < maxRetries) {
        console.log(`Checking task status, attempt ${retries + 1}...`);
        const describeTasksResponse = await ecsClient.send(new DescribeTasksCommand({
          cluster: CLUSTER_NAME,
          tasks: [taskArn]
        }));

        const taskStatus = describeTasksResponse.tasks?.[0].lastStatus;
        const desiredStatus = describeTasksResponse.tasks?.[0].desiredStatus;
        const stoppedReason = describeTasksResponse.tasks?.[0].stoppedReason || 'N/A';
        const containers = describeTasksResponse.tasks?.[0].containers || [];

        console.log(`Task status: ${taskStatus}, Desired status: ${desiredStatus}, Reason: ${stoppedReason}`);
        console.log("Container statuses:", JSON.stringify(containers.map(c => ({ name: c.name, status: c.lastStatus })), null, 2));

        if (taskStatus === "RUNNING") {
          taskRunning = true;
          console.log("Task is now in RUNNING state");
        } else if (taskStatus === "STOPPED") {
          throw new Error(`Task stopped unexpectedly. Reason: ${stoppedReason}`);
        } else {
          retries++;
          await delay(10000); // Wait 10 seconds between retries
        }
      }

      if (!taskRunning) {
        throw new Error("Task failed to reach RUNNING state within the expected time");
      }

      const taskId = taskArn.split('/').pop();

      if (!taskId) {
        throw new Error("Failed to extract task ID from ARN");
      }

      console.log("Waiting for SSM agent to initialize...");
      await delay(30000); // Wait 30 seconds for SSM agent to initialize

      console.log("Attempting to start SSM session...");
      let ssmConnected = false;
      retries = 0;
      const maxSSMRetries = 60; // Increase max retries for SSM
      while (!ssmConnected && retries < maxSSMRetries) {
        try {
          console.log(`Attempt ${retries + 1} to start SSM session...`);
          const startSessionResponse = await ssmClient.send(new StartSessionCommand({
            Target: taskId
          }));
          sessionId = startSessionResponse.SessionId;
          ssmConnected = true;
          console.log("SSM session started successfully");
        } catch (error) {
          retries++;
          console.log(`SSM agent not ready, retrying... (Attempt ${retries}). Error: ${error.message}`);
          console.log(`Error details: ${JSON.stringify(error, null, 2)}`);

          // Check ECS task status again
          const describeTasksResponse = await ecsClient.send(new DescribeTasksCommand({
            cluster: CLUSTER_NAME,
            tasks: [taskArn]
          }));
          const taskStatus = describeTasksResponse.tasks?.[0].lastStatus;
          const taskDetails = describeTasksResponse.tasks?.[0];
          console.log(`Current task status during SSM connection attempts: ${taskStatus}`);
          console.log(`Task details: ${JSON.stringify(taskDetails, null, 2)}`);

          if (taskStatus === "STOPPED") {
            const stoppedReason = describeTasksResponse.tasks?.[0].stoppedReason || 'N/A';
            throw new Error(`Task stopped during SSM connection attempts. Reason: ${stoppedReason}`);
          }

          await delay(10000); // Wait 10 seconds between retries
        }
      }

      if (!ssmConnected) {
        throw new Error("SSM agent failed to connect within the expected time");
      }

      if (!sessionId) {
        throw new Error("Failed to start SSM session");
      }

      socket.emit("session_started", sessionId);
      console.log("Session started and emitted to client:", sessionId);
    } catch (error) {
      console.error("Error starting session:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      socket.emit("error", "Failed to start session: " + error.message);
    }
  });

  socket.on("execute_command", async (data) => {
    console.log("Received execute_command event:", data);
    try {
      if (!sessionId || !taskArn) {
        throw new Error("No active session");
      }

      console.log("Sending command to SSM...");
      const sendCommandResponse = await ssmClient.send(new SendCommandCommand({
        InstanceIds: [taskArn],
        DocumentName: "AWS-RunShellScript",
        Parameters: {
          commands: [data.command]
        }
      }));

      const commandId = sendCommandResponse.Command?.CommandId;

      if (!commandId) {
        throw new Error("Failed to execute command");
      }

      console.log("Command sent successfully, command ID:", commandId);

      let commandCompleted = false;
      while (!commandCompleted) {
        console.log("Checking command execution status...");
        const getCommandInvocationResponse = await ssmClient.send(new GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: taskArn
        }));

        const status = getCommandInvocationResponse.Status;
        const output = getCommandInvocationResponse.StandardOutputContent || '';

        console.log("Command status:", status);
        if (output) {
          console.log("Command output:", output);
          socket.emit("command_output", output);
        }

        if (status === 'Success' || status === 'Failed' || status === 'Cancelled') {
          commandCompleted = true;
          console.log("Command execution completed with status:", status);
          if (status !== 'Success') {
            const errorOutput = getCommandInvocationResponse.StandardErrorContent || 'Command execution failed';
            console.error("Command error:", errorOutput);
            socket.emit("command_error", errorOutput);
          }
        } else {
          await delay(1000); // Wait for 1 second before checking again
        }
      }
    } catch (error) {
      console.error("Error executing command:", error);
      socket.emit("error", "Failed to execute command: " + error.message);
    }
  });

  socket.on("end_session", async () => {
    console.log("Received end_session event");
    try {
      if (sessionId) {
        console.log("Terminating SSM session:", sessionId);
        await ssmClient.send(new TerminateSessionCommand({
          SessionId: sessionId
        }));
        console.log("Session ended:", sessionId);
        sessionId = null;
        taskArn = null;
      }
    } catch (error) {
      console.error("Error ending session:", error);
      socket.emit("error", "Failed to end session: " + error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected, socket ID:", socket.id);
    if (sessionId) {
      console.log("Terminating SSM session due to client disconnect:", sessionId);
      ssmClient.send(new TerminateSessionCommand({ SessionId: sessionId }))
        .catch(error => console.error("Error terminating session on disconnect:", error));
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

