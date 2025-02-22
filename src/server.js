import express from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './api/auth.js';
import { DATABASE_URI, JWT_SECRET } from './config.js';
import mysql from 'mysql2/promise';
import { initializeDatabase } from './db/init.js';
import tasksRouter from './api/tasks.js';
import workspacesRouter from './api/workspaces.js';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.header('Content-Type', 'application/json');

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  next();
});

app.use(cors({
  origin: 'http://localhost:5173', // Vite's default dev server port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
});

// Add response logging middleware
app.use((req, res, next) => {
  const oldJson = res.json;
  res.json = function(data) {
    console.log('Response:', {
      path: req.path,
      method: req.method,
      data: data
    });
    return oldJson.call(this, data);
  };
  next();
});

// Update the authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    // Add debug logging
    console.log('Verifying token:', { token });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = { id: decoded.userId };
      console.log('Authenticated user:', req.user);
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// API routes (move these before the Vite middleware)
app.use('/api/auth', authRouter);
app.use('/api/workspaces', authenticateToken, workspacesRouter);
app.use('/api/tasks', authenticateToken, tasksRouter); // Make sure this is registered

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    user: req.user,
    params: req.params,
    query: req.query
  });
  next();
});

async function startServer() {
  try {
    await initializeDatabase();
    const pool = mysql.createPool(DATABASE_URI);

    // If in development, use Vite's middleware to serve your React app
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: 'html' }
      });
      // Use Vite's connect instance as middleware
      app.use(vite.middlewares);
    } else {
      // In production, serve built files from /dist
      const __dirname = path.resolve();
      app.use(express.static(path.join(__dirname, 'dist')));
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      });
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down...');
      server.close(() => {
        pool.end();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

startServer();

export const pool = mysql.createPool(DATABASE_URI);
