import { ElitRequest, ElitResponse, ServerRouter } from '@elitjs/server';
import {  Database } from '@elitjs/database';
import { resolve } from 'path';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export const router = new ServerRouter();

// Store SSE clients for each room
const sseClients = new Map<string, Set<any>>();

// Helper to broadcast to all clients in a room
function broadcastToRoom(roomId: string, data: any) {
  const clients = sseClients.get(roomId);
  if (clients) {
    clients.forEach(client => {
      try {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        // Remove dead client
        clients.delete(client);
      }
    });
  }
}

// Initialize database with configuration
const db = new Database({
  dir: resolve(process.cwd(), 'databases'),
  language: 'ts'
});

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}.${derivedKey.toString('hex')}`;
}

// Helper function to verify password
async function verifyPassword(storedHash: string, suppliedPassword: string): Promise<boolean> {
  const [salt, key] = storedHash.split('.');
  const derivedKey = await scryptAsync(suppliedPassword, salt, 64) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');
  return timingSafeEqual(derivedKey, keyBuffer);
}

// Helper to execute database code
// async function executeDb(code: string): Promise<any> {
//   const result = await db.execute(code);
//   return result.namespace;
// }

// GET /api/hello
router.get('/api/hello', async (req: ElitRequest, res: ElitResponse) => {
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.send("Hello from Elit ServerRouter!");
});

// POST /api/auth/register
router.post('/api/auth/register', async (req: ElitRequest, res: ElitResponse) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide name, email, and password' });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if email already exists
    const checkEmailCode = `
      import { users } from '@db/users';
      const email = ${JSON.stringify(email)};
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        console.log('EMAIL_EXISTS');
      } else {
        console.log('EMAIL_AVAILABLE');
      }
    `;

    const checkResult = await db.execute(checkEmailCode);
    const emailStatus = checkResult.logs[0]?.args?.[0];

    if (emailStatus === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password before storing
    const hashedPassword = await hashPassword(password);

    const userId = 'user_' + Date.now();
    const userData = JSON.stringify({
      id: userId,
      name,
      email,
      password: hashedPassword,
      bio: 'New user',
      location: '',
      website: '',
      avatar: '',
      stats: {
        projects: 0,
        followers: 0,
        following: 0,
        stars: 0
      },
      createdAt: new Date().toISOString()
    });

    // Use a simpler approach without dynamic imports inside the function
    const code = `
      import { users } from '@db/users';
      const user = ${userData};
          users.push(user);
          update('users', 'users', users);
          console.log(user);
    `;

    const result = await db.execute(code);

    console.log('Registration result:', result);

    // if (!result.logs || result.logs.length === 0) {
    //   throw new Error('Failed to create user');
    // }

    // Extract the user from the first log entry's args
    const user = result.logs[0]?.args?.[0];

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.status(201).json({
      message: 'User registered successfully',
      token: token,
      user: userWithoutPassword
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/api/auth/login', async (req: ElitRequest, res: ElitResponse) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    // First, find user by email
    const findUserCode = `
      import { users } from './users';
      const email = ${JSON.stringify(email)};
      const user = users.find(u => u.email === email);
      if (user) {
        console.log(JSON.stringify(user));
      } else {
        console.error('USER_NOT_FOUND');
      }
    `;

    const findResult = await db.execute(findUserCode);

    if (!findResult.logs || findResult.logs.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userLog = findResult.logs[0]?.args?.[0];

    if (userLog === 'USER_NOT_FOUND') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = typeof userLog === 'string' ? JSON.parse(userLog) : userLog;

    // Verify password
    const isValidPassword = await verifyPassword(user.password, password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    res.json({
      message: 'Login successful',
      token: token,
      user: userWithoutPassword
    });
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/api/auth/forgot-password', async (req: ElitRequest, res: ElitResponse) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please provide email' });
  }

  res.json({
    message: 'If an account exists with this email, a password reset link has been sent'
  });
});

// Helper function to verify token and get user ID
function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    return userId || null;
  } catch {
    return null;
  }
}

// GET /api/profile
router.get('/api/profile', async (req: ElitRequest, res: ElitResponse) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  // Handle both string and string[] cases
  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (!token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
  }

  const tokenValue = token.substring(7); // Remove 'Bearer ' prefix
  const userId = verifyToken(tokenValue);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  try {
    const code = `
      import { users } from './users';
      const userId = ${JSON.stringify(userId)};
      const user = users.find(u => u.id === userId);
      if (user) {
        console.log(JSON.stringify(user));
      } else {
        console.error('USER_NOT_FOUND');
      }
    `;

    const result = await db.execute(code);

    if (!result.logs || result.logs.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userLog = result.logs[0]?.args?.[0];

    if (userLog === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = typeof userLog === 'string' ? JSON.parse(userLog) : userLog;

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// PUT /api/profile
router.put('/api/profile', async (req: ElitRequest, res: ElitResponse) => {
  const { name, bio, location, website } = req.body;

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  // Handle both string and string[] cases
  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (!token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
  }

  const tokenValue = token.substring(7); // Remove 'Bearer ' prefix
  const userId = verifyToken(tokenValue);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  try {
    const code = `
      import { users } from './users';
      const userId = ${JSON.stringify(userId)};
      const updates = ${JSON.stringify({ name, bio, location, website })};
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex === -1) {
        console.error('USER_NOT_FOUND');
      } else {
        const user = users[userIndex];
        if (updates.name) user.name = updates.name;
        if (updates.bio) user.bio = updates.bio;
        if (updates.location) user.location = updates.location;
        if (updates.website) user.website = updates.website;
        update('users', 'users', users);
        console.log(JSON.stringify(user));
      }
    `;

    const result = await db.execute(code);

    if (!result.logs || result.logs.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userLog = result.logs[0]?.args?.[0];

    if (userLog === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = typeof userLog === 'string' ? JSON.parse(userLog) : userLog;

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/users
router.get('/api/users', async (_req: ElitRequest, res: ElitResponse) => {
  try {
    const code = `
      import { users } from './users';
      // Remove passwords from users before returning
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      console.log(JSON.stringify(usersWithoutPasswords));
    `;

    const result = await db.execute(code);

    // Extract the user list from the first log entry's args and parse if string
    const userLog = result.logs && result.logs.length > 0 ? result.logs[0]?.args?.[0] : [];
    const userList = typeof userLog === 'string' ? JSON.parse(userLog) : userLog;
    res.json({ users: userList, count: Array.isArray(userList) ? userList.length : 0 });
  } catch (error: any) {
    res.json({ users: [], count: 0 });
  }
});

// GET /api/users/:id
router.get('/api/users/:id', async (req: ElitRequest, res: ElitResponse) => {
  const url = req.url || '';
  const userId = url.split('/').pop();

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  try {
    const code = `
      import { users } from './users';
      const userId = ${JSON.stringify(userId)};
      const user = users.find(u => u.id === userId);
      if (user) {
        // Remove password before sending
        const { password, ...userWithoutPassword } = user;
        console.log(JSON.stringify(userWithoutPassword));
      } else {
        console.error('USER_NOT_FOUND');
      }
    `;

    const result = await db.execute(code);

    if (!result.logs || result.logs.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userLog = result.logs[0]?.args?.[0];

    if (userLog === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = typeof userLog === 'string' ? JSON.parse(userLog) : userLog;
    res.json({ user });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== Chat API with SharedState =====

// In-memory chat messages storage (for demo)
const chatMessages = new Map<string, Array<{
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}>>();

// GET /api/chat/messages - Get messages for a room (roomId from query string)
router.get('/api/chat/messages', async (req: ElitRequest, res: ElitResponse) => {
  // Extract roomId from query string or use 'general' as default
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const roomId = url.searchParams.get('roomId') || 'general';
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = verifyToken(token.substring(7));
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const messages = chatMessages.get(roomId) || [];
    res.json({ messages, roomId });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/send - Send a message
router.post('/api/chat/send', async (req: ElitRequest, res: ElitResponse) => {
  const { roomId = 'general', message } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = verifyToken(token.substring(7));
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Get user info
    const findUserCode = `
      import { users } from './users';
      const userId = ${JSON.stringify(userId)};
      const user = users.find(u => u.id === userId);
      if (user) {
        console.log(JSON.stringify(user));
      } else {
        console.error('USER_NOT_FOUND');
      }
    `;

    const findResult = await db.execute(findUserCode);
    const userLog = findResult.logs[0]?.args?.[0];

    if (userLog === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = typeof userLog === 'string' ? JSON.parse(userLog) : userLog;

    // Create new message
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      roomId,
      userId: user.id,
      userName: user.name,
      text: message.trim(),
      timestamp: Date.now()
    };

    // Get existing messages and add new one
    const messages = chatMessages.get(roomId) || [];
    messages.push(newMessage);

    // Keep only last 100 messages
    if (messages.length > 100) {
      messages.shift();
    }

    chatMessages.set(roomId, messages);

    // Broadcast to all connected clients in this room via SSE
    broadcastToRoom(roomId, {
      type: 'new-message',
      data: newMessage
    });

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/chat/events - SSE endpoint for real-time messages
router.get('/api/chat/events', async (req: ElitRequest, res: ElitResponse) => {
  // Parse roomId from URL
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId') || 'general';

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Create client set for this room if not exists
  if (!sseClients.has(roomId)) {
    sseClients.set(roomId, new Set());
  }

  const clients = sseClients.get(roomId)!;
  clients.add(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', roomId })}\n\n`);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 30000);

  // Remove client on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

export const server = router;
