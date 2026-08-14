/**
 * WebSocket Secure (WSS) module examples
 * Cross-runtime WSS server and client compatible with 'ws' package
 */

import { WSSServer, WSSClient, createWSSServer, createWSSClient, ReadyState } from '@elitjs/wss';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('=== WebSocket Secure (WSS) Examples ===\n');

// Example 1: Create WSS Server with certificate
console.log('--- Example 1: WSS Server ---');

// Note: In production, use real certificates
// For testing, you can generate self-signed certificates:
// openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

const wssServer = new WSSServer({
  port: 8443,
  // Uncomment when you have certificates:
  // key: readFileSync(join(__dirname, 'key.pem')),
  // cert: readFileSync(join(__dirname, 'cert.pem')),
  path: '/ws',
  clientTracking: true
});

wssServer.on('connection', (client, request) => {
  console.log('New secure client connected from:', request.headers.host);

  // Send welcome message
  client.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to secure WebSocket server'
  }));

  // Handle incoming messages
  client.on('message', (data, isBinary) => {
    console.log('Received:', isBinary ? '<binary>' : data.toString());

    // Echo the message back
    client.send(data);
  });

  // Handle close
  client.on('close', (code, reason) => {
    console.log('Client disconnected:', code, reason);
  });

  // Handle errors
  client.on('error', (error) => {
    console.error('Client error:', error.message);
  });
});

wssServer.on('error', (error) => {
  console.error('Server error:', error.message);
});

console.log('WSS Server listening on wss://localhost:8443/ws');
console.log('');

// Example 2: Create WSS Server with existing HTTPS server
console.log('--- Example 2: WSS Server with HTTPS Server ---');

const https = require('https');

const httpsServer = https.createServer({
  // Uncomment when you have certificates:
  // key: readFileSync(join(__dirname, 'key.pem')),
  // cert: readFileSync(join(__dirname, 'cert.pem'))
});

const wss = createWSSServer({
  httpsServer,
  path: '/websocket'
});

wss.on('connection', (client) => {
  console.log('Client connected via existing HTTPS server');
  client.send('Hello from existing HTTPS server!');
});

httpsServer.listen(9443, () => {
  console.log('HTTPS Server with WebSocket listening on wss://localhost:9443/websocket');
});
console.log('');

// Example 3: WSS Client
console.log('--- Example 3: WSS Client ---');

// Note: This will fail without valid certificates
// For testing with self-signed certificates, you may need to disable verification

const wssClient = new WSSClient('wss://echo.websocket.org', [], {
  // For self-signed certificates (development only):
  // rejectUnauthorized: false
});

wssClient.on('open', () => {
  console.log('Connected to secure WebSocket server');
  wssClient.send('Hello from WSS client!');
});

wssClient.on('message', (data, isBinary) => {
  console.log('Received:', isBinary ? '<binary>' : data.toString());
});

wssClient.on('close', (code, reason) => {
  console.log('Connection closed:', code, reason);
});

wssClient.on('error', (error) => {
  console.error('Connection error:', error.message);
});
console.log('');

// Example 4: Broadcast to all clients
console.log('--- Example 4: Broadcasting ---');

const broadcastServer = createWSSServer({
  port: 8444,
  clientTracking: true
});

// Broadcast function
function broadcast(message: string) {
  broadcastServer.clients.forEach(client => {
    if (client.readyState === ReadyState.OPEN) {
      client.send(message);
    }
  });
}

broadcastServer.on('connection', (client) => {
  console.log('Client connected. Total clients:', broadcastServer.clients.size);

  // Broadcast join notification
  broadcast(JSON.stringify({
    type: 'join',
    count: broadcastServer.clients.size
  }));

  client.on('message', (data) => {
    // Broadcast message to all clients
    broadcast(data.toString());
  });

  client.on('close', () => {
    console.log('Client left. Total clients:', broadcastServer.clients.size);
    broadcast(JSON.stringify({
      type: 'leave',
      count: broadcastServer.clients.size
    }));
  });
});

console.log('Broadcast server listening on wss://localhost:8444');
console.log('');

// Example 5: Room-based messaging
console.log('--- Example 5: Room-based Messaging ---');

interface ClientWithRoom extends WSSClient {
  room?: string;
}

const roomServer = createWSSServer({
  port: 8445,
  clientTracking: true
});

function broadcastToRoom(room: string, message: string, sender?: ClientWithRoom) {
  roomServer.clients.forEach((client) => {
    const c = client as ClientWithRoom;
    if (c.room === room && c !== sender && c.readyState === ReadyState.OPEN) {
      c.send(message);
    }
  });
}

roomServer.on('connection', (client) => {
  const c = client as ClientWithRoom;

  client.on('message', (data) => {
    const message = JSON.parse(data.toString());

    if (message.type === 'join') {
      c.room = message.room;
      console.log(`Client joined room: ${message.room}`);
      broadcastToRoom(message.room, JSON.stringify({
        type: 'user_joined',
        room: message.room
      }), c);
    } else if (message.type === 'message') {
      broadcastToRoom(c.room!, JSON.stringify({
        type: 'message',
        text: message.text
      }), c);
    }
  });

  client.on('close', () => {
    if (c.room) {
      broadcastToRoom(c.room, JSON.stringify({
        type: 'user_left'
      }), c);
    }
  });
});

console.log('Room server listening on wss://localhost:8445');
console.log('');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  wssServer.close();
  wss.close();
  broadcastServer.close();
  roomServer.close();
  if (wssClient.readyState === ReadyState.OPEN) {
    wssClient.close();
  }
  process.exit(0);
});

console.log('All servers running. Press Ctrl+C to stop.');
