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

// Import models FIRST before routes
const SignUp = require('./models/signup');
const Material = require('./models/shipmentorder');
const Bill = require('./models/bill');
const SalesOrder = require('./models/SalesOrder');
const Customer = require('./models/Customer');

// Import route handlers AFTER models
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

// =================================================================
// PRODUCTION SECURITY MIDDLEWARE
// =================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware
app.use(compression());

// Request logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// =================================================================
// CORS CONFIGURATION
// =================================================================

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://192.168.29.161:3000',
      'http://192.168.29.161:3001',
      // Add your production domains here
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (NODE_ENV === 'development') {
      return callback(null, true); // Allow all origins in development
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// =================================================================
// BODY PARSING MIDDLEWARE
// =================================================================

app.use(express.json({ 
  limit: '50mb',
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 50000
}));

// =================================================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// =================================================================

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Global upload middleware for routes that need it
app.use('/api/materials/submit', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'video1', maxCount: 1 },
  { name: 'video2', maxCount: 1 },
  { name: 'video3', maxCount: 1 }
]));

app.use('/api/orders/admin', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'video1', maxCount: 1 }
]));

// =================================================================
// STATIC FILE SERVING
// =================================================================

app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// =================================================================
// SECURITY HEADERS MIDDLEWARE
// =================================================================

app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// =================================================================
// REQUEST LOGGING MIDDLEWARE
// =================================================================

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// =================================================================
// DATABASE ASSOCIATIONS & RELATIONSHIPS
// =================================================================

async function setupDatabaseAssociations() {
  try {
    // Bill associations
    Bill.belongsTo(SignUp, { foreignKey: 'clientId', as: 'Client' });
    Bill.belongsTo(Material, { foreignKey: 'orderId', as: 'Order' });
    Bill.belongsTo(SignUp, { foreignKey: 'createdBy', as: 'Creator' });

    SignUp.hasMany(Bill, { foreignKey: 'clientId', as: 'Bills' });
    Material.hasOne(Bill, { foreignKey: 'orderId', as: 'Bill' });

    // Material and SignUp associations
    Material.belongsTo(SignUp, { foreignKey: 'c_id', as: 'Client' });
    SignUp.hasMany(Material, { foreignKey: 'c_id', as: 'Materials' });

    // Customer ↔ SalesOrder
    Customer.hasMany(SalesOrder, {
      foreignKey: 'customerId',
      as: 'orders'
    });
    SalesOrder.belongsTo(Customer, {
      foreignKey: 'customerId',
      as: 'customer'
    });

    // SignUp ↔ Customer
    SignUp.hasMany(Customer, {
      foreignKey: 'createdBy',
      as: 'customers'
    });
    Customer.belongsTo(SignUp, {
      foreignKey: 'createdBy',
      as: 'user'
    });

    // SignUp ↔ SalesOrder
    SignUp.hasMany(SalesOrder, {
      foreignKey: 'createdBy',
      as: 'orders'
    });
    SalesOrder.belongsTo(SignUp, {
      foreignKey: 'createdBy',
      as: 'user'
    });

    console.log('Database associations set up successfully');
  } catch (error) {
    console.error('Error setting up database associations:', error);
    throw error;
  }
}

// =================================================================
// HEALTH CHECK ROUTES
// =================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Database health check
app.get('/api/health/database', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      success: true,
      message: 'Database connection is healthy'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// =================================================================
// ROUTE MOUNTING WITH ERROR HANDLING
// =================================================================

try {
  // API routes
  app.use('/api/auth', authRoutes);
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
} catch (error) {
  console.error('❌ Error mounting routes:', error);
  process.exit(1);
}

// =================================================================
// 404 HANDLER
// =================================================================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/health',
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'GET /api/users',
      'GET /api/materials/getdata',
      'POST /api/materials/submit',
      'GET /api/orders',
      'POST /api/orders/admin',
      'GET /api/bills',                    // ← ADD THIS
      'GET /api/bills/client/:clientId',   // ← ADD THIS
      'GET /api/bills/client/bill/:billId',// ← ADD THIS
      'GET /api/client/bills/:clientId',   // ← ADD THIS
      'GET /api/client/bill/:billId',      // ← ADD THIS
      'POST /api/bills',                   // ← ADD THIS
      'GET /api/products',                 // ← ADD THIS
      'GET /api/feedback',
      'GET /api/admin/dashboard',
      'GET /api/sales',                    // ← ADD THIS
      'GET /api/utils'                     // ← ADD THIS
    ]
  });
});

// =================================================================
// ERROR HANDLING MIDDLEWARE
// =================================================================

// Multer error handling
app.use((error, req, res, next) => {
  console.error('Error middleware caught:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.',
        code: 'TOO_MANY_FILES'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message,
      code: 'UPLOAD_ERROR'
    });
  }
  
  if (error.message && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'FILE_TYPE_NOT_ALLOWED'
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.message,
      code: 'VALIDATION_ERROR'
    });
  }

  if (error.name === 'SequelizeConnectionError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error',
      code: 'DATABASE_ERROR'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    error: NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// =================================================================
// GRACEFUL SHUTDOWN HANDLING
// =================================================================

const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    await sequelize.close();
    console.log('✅ Database connections closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// =================================================================
// SERVER STARTUP
// =================================================================

async function startServer() {
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    // Set up database associations
    await setupDatabaseAssociations();

    // Sync database (be careful in production)
    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✅ Database synchronized');
    }

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 Server starting up...');
      console.log(`📡 Environment: ${NODE_ENV}`);
      console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`🔒 Security features enabled: ${NODE_ENV === 'production' ? 'Full' : 'Development'}`);
      console.log('\n📋 Available endpoints:');
      console.log('   GET  /health - Server health check');
      console.log('   GET  /api/health - API health check');
      console.log('   POST /api/auth/signup - User registration');
      console.log('   POST /api/auth/login - User login');
      console.log('   GET  /api/users - Get users');
      console.log('   GET  /api/materials/getdata - Get materials');
      console.log('   POST /api/materials/submit - Submit material');
      console.log('   GET  /api/orders - Get orders');
      console.log('   GET  /api/admin/dashboard - Admin dashboard');
      console.log('\n✅ Server is ready to accept connections!\n');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;