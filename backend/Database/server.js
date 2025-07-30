const express = require("express");
const cors = require("cors");
const multer = require('multer');
const sequelize = require("./Database/DB");
const { Op } = require('sequelize');
const path = require("path");
const fs = require('fs');
require("dotenv").config();

// Import models
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

const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
// DATABASE ASSOCIATIONS & RELATIONSHIPS
// =================================================================

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

// Bill associations
Bill.belongsTo(SignUp, { foreignKey: 'clientId', as: 'Client' });
Bill.belongsTo(Material, { foreignKey: 'orderId', as: 'Order' });
Bill.belongsTo(SignUp, { foreignKey: 'createdBy', as: 'Creator' });

SignUp.hasMany(Bill, { foreignKey: 'clientId', as: 'Bills' });
Material.hasOne(Bill, { foreignKey: 'orderId', as: 'Bill' });

// Material and SignUp associations
Material.belongsTo(SignUp, { foreignKey: 'c_id', as: 'Client' });
SignUp.hasMany(Material, { foreignKey: 'c_id', as: 'Materials' });

// =================================================================
// MULTER CONFIGURATION & FILE HANDLING
// =================================================================

// Enhanced multer configuration with file size limits and validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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
// MIDDLEWARE CONFIGURATION
// =================================================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.22:3000', '*'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// =================================================================
// ROUTE MOUNTING
// =================================================================

// Mount route handlers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/products', productRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/admin', adminRoutes);

// Legacy routes for backward compatibility
app.get('/Users', userRoutes);
app.post('/signup', authRoutes);
app.post('/login', authRoutes);

// =================================================================
// ERROR HANDLING MIDDLEWARE
// =================================================================

// Error handling middleware for multer
app.use((error, req, res, next) => {
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
  
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// =================================================================
// DATABASE SYNC AND SERVER START
// =================================================================

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync();
    console.log('Database synchronized successfully.');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer();