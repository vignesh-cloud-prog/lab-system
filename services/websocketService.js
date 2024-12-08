// services/websocketService.js
const WebSocket = require('ws');
const { startSession } = require('./ecsService'); // to initiate ECS commands

// Function to set up WebSocket server
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('Client connected');
    
    // Handle user input (from terminal-like commands)
    ws.on('message', async (message) => {
      const { taskId, command, clusterName, containerName } = JSON.parse(message);
      
      try {
        // Start session in the container with command
        const response = await startSession(clusterName, taskId, containerName, command);
        ws.send(JSON.stringify({ success: true, response }));
      } catch (error) {
        ws.send(JSON.stringify({ success: false, error: error.message }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', (err) => {
      console.log('WebSocket error: ', err);
    });
  });

  console.log('WebSocket server is listening...');
}

module.exports = { setupWebSocketServer };
