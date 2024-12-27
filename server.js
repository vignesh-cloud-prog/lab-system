require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const SSH_CONFIG = {
  host: process.env.EC2_HOST,
  port: 22,
  username: process.env.EC2_USERNAME,
  privateKey: require('fs').readFileSync(process.env.EC2_PRIVATE_KEY_PATH)
};

io.on('connection', (socket) => {
  console.log('A user connected');
  let sshClient = new Client();
  let sshStream = null;

  socket.on('start_session', () => {
    console.log('Attempting to start SSH session');
    sshClient.on('ready', () => {
      console.log('SSH connection established');
      socket.emit('session_started');
      
      sshClient.shell((err, stream) => {
        if (err) {
          console.error('Failed to start shell:', err);
          socket.emit('error', 'Failed to start shell');
          return;
        }

        sshStream = stream;
        console.log('Shell started');

        stream.on('data', (data) => {
          console.log('Received output:', data.toString('utf8'));
          socket.emit('output', data.toString('utf8'));
        });

        stream.on('close', () => {
          console.log('Shell stream closed');
          socket.emit('session_ended');
          sshClient.end();
        });
      });
    }).on('error', (err) => {
      console.error('SSH connection error:', err);
      socket.emit('error', 'Failed to connect to the server: ' + err.message);
    }).connect(SSH_CONFIG);
  });

  socket.on('input', (data) => {
    if (sshStream) {
      console.log('Received input:', data);
      sshStream.write(data);
    } else {
      console.error('SSH stream not available');
      socket.emit('error', 'SSH connection not established');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    if (sshClient) {
      sshClient.end();
    }
  });
});

const PORT = process.env.PORT || 3001;
// Health check endpoint for Elastic Beanstalk
app.get('/health', (req, res) => {
  res.sendStatus(200);
});
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

