const express = require("express");
const cors = require("cors");
const multer = require('multer');
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

const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
// MIDDLEWARE CONFIGURATION (BEFORE ROUTES)
// =================================================================

// CORS configuration - Allow all origins for development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =================================================================
// DATABASE ASSOCIATIONS & RELATIONSHIPS
// =================================================================

// Define all associations BEFORE starting server
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

  console.log('Database associations configured successfully');
} catch (error) {
  console.error('Error configuring database associations:', error);
}

// =================================================================
// MULTER CONFIGURATION & FILE HANDLING
// =================================================================

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Enhanced multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// File filter for security and type validation
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'];
  const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedDocTypes];
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed!`), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 6 // Maximum 6 files per request
  }
});

// Export upload middleware for use in routes
module.exports.upload = upload;

// =================================================================
// ROUTE MOUNTING
// =================================================================

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Mount route handlers with proper error handling
try {
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

  // Legacy routes for backward compatibility
  app.use('/Users', userRoutes);
  app.use('/signup', authRoutes);
  app.use('/login', authRoutes);

  console.log('Routes mounted successfully');
} catch (error) {
  console.error('Error mounting routes:', error);
}

// =================================================================
// ERROR HANDLING MIDDLEWARE
// =================================================================

// Error handling middleware for multer
app.use((error, req, res, next) => {
  console.error('Error middleware caught:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 6 files allowed.'
      });
    }
  }
  
  if (error.message && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// =================================================================
// DATABASE SYNC AND SERVER START
// =================================================================

async function startServer() {
  try {
    console.log('Starting server...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ alter: false });
    console.log('✅ Database synchronized successfully.');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  try {
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  try {
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();