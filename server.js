require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const labRoutes = require('./routes/labRoutes'); // Import your lab routes
const errorHandler = require('./middleware/errorHandler');
const { startSession } = require('./services/ecsService');

const app = express();
const server = http.createServer(app); // Create an HTTP server using the express app

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const { taskId, command, clusterName, containerName } = JSON.parse(message);

      // Execute the command
      const commandOutput = await startSession(clusterName, taskId, containerName, command);

      // Send the command output back to the client
      ws.send(JSON.stringify({
        success: true,
        output: commandOutput,
      }));
    } catch (err) {
      console.error('Error handling command:', err);
      ws.send(JSON.stringify({
        success: false,
        error: 'Failed to execute command',
      }));
    }
  });
});


  
// Use the existing lab routes for lab provisioning
app.use(cors());
app.use(bodyParser.json());
app.use('/api/labs', labRoutes); // Mount the lab routes
app.use(errorHandler); // Custom error handler middleware

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
