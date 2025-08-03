// backend/Database/server.js

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

// Import route handlers
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const materialRoutes = require('./routes/materials');
const orderRoutes = require('./routes/orders');
const billRoutes = require('./routes/bills');
const productRoutes = require('./routes/products');
const feedbackRoutes = require('./routes/feedback');
const salesRoutes = require('./routes/sales');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const utilsRoutes = require('./routes/utils');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// REQUEST LOGGING (FIRST MIDDLEWARE)
// ============================================================================
app.use((req, res, next) => {
  console.log(`📥 Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================================================
console.log('🔎 typeof authRoutes:', typeof authRoutes);
console.log('🔎 authRoutes keys:', Object.keys(authRoutes));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['http://localhost:8081', 'http://192.168.29.161:8081']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Compression middleware
app.use(compression());

// Request logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate limiting (COMMENTED OUT FOR DEBUGGING - uncomment after fixing)
// const createRateLimit = (windowMs, max, message) => rateLimit({
//   windowMs,
//   max,
//   message: { success: false, message },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// // General rate limit
// app.use('/api', createRateLimit(
//   15 * 60 * 1000, // 15 minutes
//   NODE_ENV === 'production' ? 100 : 1000,
//   'Too many requests, please try again later.'
// ));

// // Auth rate limit
// app.use('/api/auth', createRateLimit(
//   15 * 60 * 1000, // 15 minutes
//   NODE_ENV === 'production' ? 20 : 100,
//   'Too many authentication attempts, please try again later.'
// ));

// Body parsing middleware
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON in request body'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request ID middleware
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============================================================================
// DATABASE CONNECTION & ASSOCIATIONS
// ============================================================================

async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Setup associations
    await setupDatabaseAssociations();

    // Sync database
    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    } else {
      await sequelize.sync();
      console.log('✅ Database sync completed');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

async function setupDatabaseAssociations() {
  try {
    // Enhanced associations with proper foreign keys and aliases
    
    // SignUp associations
    SignUp.hasMany(Material, { foreignKey: 'c_id', as: 'orders' });
    SignUp.hasMany(Bill, { foreignKey: 'clientId', as: 'bills' });
    SignUp.hasMany(SalesOrder, { foreignKey: 'createdBy', as: 'salesOrders' });

    // Material associations
    Material.belongsTo(SignUp, { foreignKey: 'c_id', as: 'Client' });
    Material.hasMany(Bill, { foreignKey: 'orderId', as: 'bills' });

    // Bill associations
    Bill.belongsTo(SignUp, { foreignKey: 'clientId', as: 'Client' });
    Bill.belongsTo(Material, { foreignKey: 'orderId', as: 'Order' });

    // SalesOrder associations
    SalesOrder.belongsTo(SignUp, { foreignKey: 'createdBy', as: 'user' });

    console.log('✅ Database associations configured');
  } catch (error) {
    console.error('❌ Error setting up associations:', error);
    throw error;
  }
}

// ============================================================================
// HEALTH CHECK ROUTES (BEFORE OTHER ROUTES)
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    version: '2.0.0',
    status: 'healthy'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    
    res.status(200).json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: 'connected',
      environment: NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'API health check failed',
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Detailed health check
app.get('/api/health/detailed', async (req, res) => {
  const healthCheck = {
    success: true,
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'unknown',
    routes: 'loaded'
  };

  try {
    await sequelize.authenticate();
    healthCheck.database = 'connected';
  } catch (error) {
    healthCheck.success = false;
    healthCheck.database = 'disconnected';
    healthCheck.databaseError = error.message;
  }

  res.status(healthCheck.success ? 200 : 503).json(healthCheck);
});

// ============================================================================
// ROUTE MOUNTING
// ============================================================================

async function mountRoutes() {
  try {
    console.log('🔄 Mounting API routes...');
    
    // Debug authRoutes before mounting
    console.log('🔍 Debugging authRoutes:');
    console.log('typeof authRoutes:', typeof authRoutes);
    console.log('authRoutes.stack length:', authRoutes.stack ? authRoutes.stack.length : 'undefined');
    
    if (authRoutes.stack) {
      console.log('Routes in authRoutes.stack:');
      authRoutes.stack.forEach((layer, index) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          console.log(`  ${index}: ${methods.join(',').toUpperCase()} ${layer.route.path}`);
        } else {
          console.log(`  ${index}: middleware function`);
        }
      });
    }

    // Mount auth routes with debugging middleware
    console.log('🔧 Mounting /api/auth routes...');
    app.use('/api/auth', (req, res, next) => {
      console.log(`🎯 Auth middleware hit: ${req.method} ${req.path}`);
      next();
    }, authRoutes);
    
    // Mount other routes
    app.use('/api/users', userRoutes);
    app.use('/api/materials', materialRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/bills', billRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/feedback', feedbackRoutes);
    app.use('/api/sales', salesRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/client', clientRoutes);
    app.use('/api/utils', utilsRoutes);

    // Legacy routes for backward compatibility
    app.use('/Users', userRoutes);
    app.use('/signup', authRoutes);
    app.use('/login', authRoutes);
    app.use('/materials', materialRoutes);

    console.log('✅ All routes mounted successfully');
    
    // Test route registration
    console.log('🧪 Testing route mounting...');
    console.log('Express app routes after mounting:');
    
    // List all registered routes
    app._router.stack.forEach((middleware, index) => {
      if (middleware.route) {
        // Direct route
        console.log(`  Direct route: ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
      } else if (middleware.name === 'router' && middleware.regexp) {
        // Router middleware
        const routePath = middleware.regexp.source
          .replace('\\', '')
          .replace('/?(?=\\/|$)', '')
          .replace('^', '')
          .replace('$', '');
        console.log(`  Router middleware: ${routePath} (${middleware.handle.stack ? middleware.handle.stack.length : 0} routes)`);
        
        // List routes within this router
        if (middleware.handle && middleware.handle.stack) {
          middleware.handle.stack.forEach((routerLayer, routerIndex) => {
            if (routerLayer.route) {
              const methods = Object.keys(routerLayer.route.methods);
              console.log(`    ${routerIndex}: ${methods.join(',').toUpperCase()} ${routePath}${routerLayer.route.path}`);
            }
          });
        }
      }
    });
    
    console.log('🔍 Final route verification:');
    console.log('Total middleware/routes registered:', app._router.stack.length);
    
  } catch (error) {
    console.error('❌ Error mounting routes:', error);
    throw error;
  }
}

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

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
    requestId: req.id,
    ...(NODE_ENV === 'development' && { stack: error.stack })
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
        console.log('🗄️  Database connection closed');
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

    // Mount routes FIRST
    await mountRoutes();

    // CRITICAL: 404 handler MUST be registered AFTER all routes
    app.use('*', (req, res) => {
      console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
      
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
        availableRoutes: {
          auth: [
            'POST /api/auth/signup',
            'POST /api/auth/login',
            'POST /api/auth/logout',
            'GET /api/auth/profile'
          ],
          admin: [
            'GET /api/admin/dashboard',
            'GET /api/admin/dashboard-overview',
            'GET /api/admin/users',
            'POST /api/admin/approve-user/:userId',
            'POST /api/admin/reject-user/:userId'
          ],
          bills: [
            'GET /api/bills/admin',
            'POST /api/bills',
            'PATCH /api/bills/:billId/payment',
            'GET /api/bills/stats/overview'
          ],
          client: [
            'GET /api/client/bills/:clientId',
            'GET /api/client/bill/:billId',
            'POST /api/client/feedback',
            'GET /api/client/feedback/:clientId'
          ],
          feedback: [
            'GET /api/feedback',
            'POST /api/feedback',
            'GET /api/feedback/admin',
            'PATCH /api/feedback/:id/respond'
          ],
          health: [
            'GET /health',
            'GET /api/health',
            'GET /api/health/detailed'
          ]
        }
      });
    });

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🌐 Server running on port ${PORT}`);
      console.log(`🔗 Local: http://localhost:${PORT}`);
      console.log(`🔗 Network: http://192.168.29.161:${PORT}`);
      console.log(`📋 Environment: ${NODE_ENV === 'production' ? 'Production' : 'Development'}`);
      
      console.log('\n📋 Available API endpoints:');
      console.log('   🔐 Authentication:');
      console.log('      POST /api/auth/signup');
      console.log('      POST /api/auth/login');
      console.log('      GET  /api/auth/profile');
      
      console.log('   👑 Admin Management:');
      console.log('      GET  /api/admin/dashboard');
      console.log('      GET  /api/admin/dashboard-overview');
      console.log('      GET  /api/admin/users');
      console.log('      POST /api/admin/approve-user/:userId');
      console.log('      GET  /api/admin/feedback');
      
      console.log('   💰 Bills & Payments:');
      console.log('      GET  /api/bills/admin');
      console.log('      POST /api/bills');
      console.log('      GET  /api/client/bills/:clientId');
      
      console.log('   📝 Feedback System:');
      console.log('      GET  /api/feedback');
      console.log('      POST /api/feedback');
      console.log('      GET  /api/feedback/admin');
      
      console.log('   ⚕️  Health Checks:');
      console.log('      GET  /health');
      console.log('      GET  /api/health');
      console.log('      GET  /api/health/detailed');
      
      console.log('\n✅ Server is ready to accept connections!\n');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.log('💡 Try using a different port or kill the process using this port');
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;