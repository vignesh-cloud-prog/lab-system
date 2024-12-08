const { ECSClient, ExecuteCommandCommand } = require('@aws-sdk/client-ecs');
const WebSocket = require('ws');
const { ecsClient } = require('../config/awsConfig');

async function startSession(clusterName, taskId, containerName, command) {
  try {
    const params = {
      cluster: clusterName,
      task: taskId,
      container: containerName,
      command: command,
      interactive: true,
    };

    const response = await ecsClient.send(new ExecuteCommandCommand(params));

    console.log('ECS Execute Command Response:', response);

    const { streamUrl, tokenValue } = response.session;

    // Connect to the WebSocket
    const ws = new WebSocket(streamUrl, {
      headers: {
        'X-Aws-Exc-Token': tokenValue,
      },
    });

    return new Promise((resolve, reject) => {
      let commandOutput = '';

      ws.on('open', () => {
        console.log('WebSocket connection established');
      });

      ws.on('message', (data) => {
        
        console.log('Message received:', data.toString());
        commandOutput += data.toString();
      });

      ws.on('close', () => {
        console.log('WebSocket closed');
        resolve(commandOutput); // Return the full output after WebSocket closes
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error starting ECS session:', error);
    throw error;
  }
}

module.exports = { startSession };
