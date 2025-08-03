// Create a new file: test-server.js
// This will test if the issue is with your auth routes or server configuration

const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`📥 Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Test auth routes directly
const router = express.Router();

router.post('/login', (req, res) => {
  console.log('🎯 Login route hit!');
  res.json({
    success: false,
    message: 'Test login route working',
    body: req.body
  });
});

router.post('/signup', (req, res) => {
  console.log('🎯 Signup route hit!');
  res.json({
    success: false,
    message: 'Test signup route working'
  });
});

router.get('/profile', (req, res) => {
  console.log('🎯 Profile route hit!');
  res.json({
    success: false,
    message: 'Test profile route working'
  });
});

// Mount the router
app.use('/api/auth', router);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server running' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

const PORT = 3001; // Use different port to avoid conflicts

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`🔗 Test URLs:`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   Signup: POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`   Profile: GET http://localhost:${PORT}/api/auth/profile`);
});

// Test commands to run:
// curl http://localhost:3001/health
// curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"test":"data"}'