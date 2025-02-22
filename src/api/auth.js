import express from 'express';
import { createUser, login, getUserById } from '../auth/auth.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

const router = express.Router();

console.log('Auth router loaded. Registered routes:', router.stack.map(layer => layer.route ? layer.route.path : 'N/A'));

// Debug middleware for auth routes
router.use((req, res, next) => {
  console.log('Auth route hit:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

router.post('/register', async (req, res) => {
  console.log('Register request received:', {
    method: req.method,
    url: req.url,
    body: req.body,
    contentType: req.headers['content-type']
  });

  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        received: Object.keys(req.body)
      });
    }

    const userId = await createUser(email, password, name);
    const token = jwt.sign({ userId }, JWT_SECRET);

    console.log('Registration successful:', { userId, email });

    return res.status(201).json({
      user: {
        id: userId,
        email,
        name,
        role: 'member' // Explicitly include default role
      },
      token
    });
  } catch (error) {
    console.error('Registration failed:', error);
    return res.status(400).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await login(email, password);

    console.log('Login user data before response:', user); // Debug log

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role // Explicitly include role
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.userId);

    console.log('GET /me - Retrieved user:', user);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Don't modify the role, send it as is from the database
    res.json({ user });
  } catch (error) {
    console.error('GET /me - Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Catch-all for auth routes to see if the request is handled by this router
router.all('*', (req, res) => {
  console.log('Auth router catch-all reached:', req.method, req.url);
  res.status(404).json({ error: 'Auth router catch-all: route not found' });
});

export default router;
