const { ExecuteCommandCommand } = require('@aws-sdk/client-ecs');
const { SSMClient, StartSessionCommand } = require('@aws-sdk/client-ssm');
const { ecsClient, ssmClient } = require('../config/awsConfig');


async function waitForTaskRunning(taskArn, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const describeParams = {
        cluster: process.env.ECS_CLUSTER_NAME || 'devcluster',
        tasks: [taskArn]
      };

      const describeResponse = await this.ecsClient.send(new DescribeTasksCommand(describeParams));

      if (describeResponse.tasks[0].lastStatus === 'RUNNING') {
        return true;
      }

      // Wait for 10 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.error('Error checking task status:', error);
      throw error;
    }
  }

  throw new Error('Task did not reach RUNNING state');
}


async function startSession(clusterName, taskId, containerName, command) {
  try {
    // Validate inputs
    if (!clusterName || !taskId || !containerName || !command) {
      throw new Error('Missing required parameters');
    }



    // Execute ECS command
    const executeCommandParams = {
      cluster: clusterName,
      task: taskId,
      container: containerName,
      command: command || "/bin/bash",
      interactive: true,
    };
    console.log('Execute Command Params:', JSON.stringify(executeCommandParams, null, 2));

    const executeResponse = await ecsClient.send(new ExecuteCommandCommand(executeCommandParams));

    // Log the full response for debugging
    console.log('Execute Command Response:', JSON.stringify(executeResponse, null, 2));

    // Ensure the session target is valid
    if (!executeResponse.session) {
      throw new Error("Failed to initiate ECS Execute Command session.");
    }

    // Return session details
    return {
      success: true,
      output: executeResponse.session,
    };
  } catch (error) {
    console.error('Error in ECS terminal service:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = { startSession };
