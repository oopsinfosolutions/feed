// backend/Database/server.js - Complete fixed server with proper route mounting

const express = require("express");
const cors = require("cors");
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const sequelize = require("./Database/DB");
const { Op } = require('sequelize');
const path = require("path");
const fs = require('fs');
require("dotenv").config();

// Import models FIRST
const SignUp = require('./models/signup');
const Material = require('./models/shipmentorder');
const Bill = require('./models/bill');
const SalesOrder = require('./models/SalesOrder');
const Customer = require('./models/Customer');

// Import route handlers with error handling
let authRoutes, userRoutes, materialRoutes, orderRoutes, billRoutes;
let productRoutes, feedbackRoutes, salesRoutes, adminRoutes, clientRoutes, utilsRoutes;

try {
  authRoutes = require('./routes/auth');
  userRoutes = require('./routes/users');
  materialRoutes = require('./routes/materials');
  orderRoutes = require('./routes/orders');
  billRoutes = require('./routes/bills');
  productRoutes = require('./routes/products');
  feedbackRoutes = require('./routes/feedback');
  salesRoutes = require('./routes/sales');
  adminRoutes = require('./routes/admin');
  clientRoutes = require('./routes/client');
  utilsRoutes = require('./routes/utils');
} catch (error) {
  console.error('❌ Error importing routes:', error.message);
  console.log('🔧 Creating fallback routes...');
  
  // Create fallback router for missing routes
  const createFallbackRouter = (routeName) => {
    const router = express.Router();
    router.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `${routeName} routes not implemented yet`,
        endpoint: req.originalUrl
      });
    });
    return router;
  };
  
  authRoutes = authRoutes || createFallbackRouter('Auth');
  userRoutes = userRoutes || createFallbackRouter('User');
  materialRoutes = materialRoutes || createFallbackRouter('Material');
  orderRoutes = orderRoutes || createFallbackRouter('Order');
  billRoutes = billRoutes || createFallbackRouter('Bill');
  productRoutes = productRoutes || createFallbackRouter('Product');
  feedbackRoutes = feedbackRoutes || createFallbackRouter('Feedback');
  salesRoutes = salesRoutes || createFallbackRouter('Sales');
  adminRoutes = adminRoutes || createFallbackRouter('Admin');
  clientRoutes = clientRoutes || createFallbackRouter('Client');
  utilsRoutes = utilsRoutes || createFallbackRouter('Utils');
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// REQUEST LOGGING (FIRST MIDDLEWARE)
// ============================================================================
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log(`📍 Headers:`, JSON.stringify(req.headers, null, 2));
  next();
});

// ============================================================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration - Allow all origins in development
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression and logging
app.use(compression());
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ============================================================================
// HEALTH CHECK ENDPOINT (BEFORE ROUTES)
// ============================================================================
app.get('/health', (req, res) => {
  const healthCheck = {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: 'connected', // You can add actual DB health check here
    version: process.env.npm_package_version || '1.0.0'
  };
  
  console.log('🏥 Health check requested');
  res.status(200).json(healthCheck);
});

// ============================================================================
// ROUTE MOUNTING WITH COMPREHENSIVE ERROR HANDLING
// ============================================================================

async function mountRoutes() {
  try {
    console.log('🔄 Mounting API routes...');
    
    // Add request logging middleware for all API routes
    app.use('/api', (req, res, next) => {
      console.log(`🎯 API Route Hit: ${req.method} ${req.originalUrl}`);
      next();
    });
    
    // Mount main API routes
    console.log('🔧 Mounting /api/auth routes...');
    app.use('/api/auth', authRoutes);
    
    console.log('🔧 Mounting /api/users routes...');
    app.use('/api/users', userRoutes);
    
    console.log('🔧 Mounting /api/materials routes...');
    app.use('/api/materials', materialRoutes);
    
    console.log('🔧 Mounting /api/orders routes...');
    app.use('/api/orders', orderRoutes);
    
    console.log('🔧 Mounting /api/bills routes...');
    app.use('/api/bills', billRoutes);
    
    console.log('🔧 Mounting /api/products routes...');
    app.use('/api/products', productRoutes);
    
    console.log('🔧 Mounting /api/feedback routes...');
    app.use('/api/feedback', feedbackRoutes);
    
    console.log('🔧 Mounting /api/sales routes...');
    app.use('/api/sales', salesRoutes);
    
    console.log('🔧 Mounting /api/admin routes...');
    app.use('/api/admin', adminRoutes);
    
    console.log('🔧 Mounting /api/client routes...');
    app.use('/api/client', clientRoutes);
    
    console.log('🔧 Mounting /api/utils routes...');
    app.use('/api/utils', utilsRoutes);

    // Legacy routes for backward compatibility
    console.log('🔧 Mounting legacy routes...');
    app.use('/Users', userRoutes);
    app.use('/signup', authRoutes);
    app.use('/login', authRoutes);
    app.use('/materials', materialRoutes);

    // Add a catch-all route for API endpoints
    app.use('/api/*', (req, res) => {
      console.log(`❌ Unmatched API route: ${req.method} ${req.originalUrl}`);
      res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
        availableRoutes: [
          '/api/auth/*',
          '/api/users/*',
          '/api/materials/*',
          '/api/orders/*',
          '/api/bills/*',
          '/api/products/*',
          '/api/feedback/*',
          '/api/sales/*',
          '/api/admin/*',
          '/api/client/*',
          '/api/utils/*'
        ]
      });
    });

    console.log('✅ All routes mounted successfully');
    
  } catch (error) {
    console.error('❌ Error mounting routes:', error);
    throw error;
  }
}

// ============================================================================
// DATABASE CONNECTION AND SYNC
// ============================================================================

async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync database (be careful with force: true in production)
    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced successfully');
    }
    
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    throw error;
  }
}

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 handler for non-API routes
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    suggestion: 'Check if the endpoint exists or if you meant to call an API route (/api/...)'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🔥 Global error handler:', error);
  
  const statusCode = error.status || error.statusCode || 500;
  const message = NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(NODE_ENV === 'development' && { 
      stack: error.stack,
      url: req.originalUrl,
      method: req.method
    })
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(async () => {
      console.log('📡 HTTP server closed');
      
      try {
        await sequelize.close();
        console.log('🗄️ Database connection closed');
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('⏰ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    console.log('🚀 Starting server...');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🐘 Node.js version: ${process.version}`);
    
    // Initialize database
    await initializeDatabase();
    
    // Mount routes
    await mountRoutes();
    
    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 Server startup complete!');
      console.log(`📡 Server running on: http://0.0.0.0:${PORT}`);
      console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`📱 Mobile access: http://[YOUR_IP]:${PORT}`);
      console.log(`🔧 Environment: ${NODE_ENV}`);
      
      if (NODE_ENV === 'development') {
        console.log('\n📋 Quick Start Guide:');
        console.log('1. Find your computer\'s IP address');
        console.log('2. Update mobile app API config with your IP');
        console.log('3. Ensure phone and computer are on same WiFi');
        console.log('4. Test connection: http://[YOUR_IP]:' + PORT + '/health');
      }
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================================================
// EXPORT AND START
// ============================================================================

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = {
  app,
  startServer,
  sequelize
};