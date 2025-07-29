const express = require("express");
const cors = require("cors");
const multer = require('multer');
const sequelize = require("./Database/DB");
const { Op } = require('sequelize'); // Import Op from sequelize
const SignUp = require('./models/signup');
const Material = require('./models/shipmentorder');
const path = require("path");
const fs = require('fs');
const Bill = require('./models/bill');
const SalesOrder = require('./models/SalesOrder');
const Customer = require ('./models/Customer');
require("dotenv").config();

Customer.hasMany(SalesOrder, {
  foreignKey: 'customerId',
  as: 'orders'
});
SalesOrder.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer'
});

// === SignUp ↔ Customer ===
SignUp.hasMany(Customer, {
  foreignKey: 'createdBy',
  as: 'customers'
});
Customer.belongsTo(SignUp, {
  foreignKey: 'createdBy',
  as: 'user'
});

// === SignUp ↔ SalesOrder ===
SignUp.hasMany(SalesOrder, {
  foreignKey: 'createdBy',
  as: 'orders'
});
SalesOrder.belongsTo(SignUp, {
  foreignKey: 'createdBy',
  as: 'user'
});
// Set up associations
Bill.belongsTo(SignUp, { foreignKey: 'clientId', as: 'Client' });
Bill.belongsTo(Material, { foreignKey: 'orderId', as: 'Order' });
Bill.belongsTo(SignUp, { foreignKey: 'createdBy', as: 'Creator' });

SignUp.hasMany(Bill, { foreignKey: 'clientId', as: 'Bills' });
Material.hasOne(Bill, { foreignKey: 'orderId', as: 'Bill' });

// Set up associations for Material and SignUp
Material.belongsTo(SignUp, { foreignKey: 'c_id', as: 'Client' });
SignUp.hasMany(Material, { foreignKey: 'c_id', as: 'Materials' });

const app = express();
const PORT = process.env.PORT || 3000;

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =================================================================
// HELPER FUNCTIONS
// =================================================================

// Helper function for generating user ID
async function generateUserId() {
  while (true) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const id = `USER_${timestamp}_${random}`;
    const existing = await SignUp.findOne({ where: { user_id: id } });
    if (!existing) return id;
  }
}

// Generate unique product user ID
function generateProductUserId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `PROD_${timestamp}_${random}`;
}

// Generate unique order ID
function generateOrderId() {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  return `ORDER_${timestamp}_${randomNum}`;
}

// Generate product ID (for orderId field)
function generateProductId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD_${timestamp}_${random}`;
}

// Generate bill number
function generateBillNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `BILL-${timestamp}-${random}`;
}

// =================================================================
// AUTHENTICATION ROUTES
// =================================================================

// Enhanced signup route with approval workflow
app.post('/signup', async (req, res) => {
  try {
    const { fullname, email, password, phone, type, department, employeeId } = req.body;

    if (!fullname || !email || !phone || !password || !type) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Please enter a valid email address' 
      });
    }

    // Phone validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ 
        success: false,
        error: 'Please enter a valid 10-digit phone number' 
      });
    }

    // Check for existing user
    const existingUser = await SignUp.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        error: 'Email or phone number already exists' 
      });
    }

    const user_id = await generateUserId();

    let userData = {
      fullname,
      email,
      password,
      phone,
      type,
      user_id,
      department: department || null,
      employeeId: employeeId || null
    };

    // Define employee types that need approval
    const employeeTypesNeedingApproval = [
      'field_employee', 
      'office_employee', 
      'sale_parchase',
      'sale_purchase',
      'sales_purchase'
    ];
    
    // Normalize type for comparison
    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    
    if (employeeTypesNeedingApproval.includes(normalizedType)) {
      userData.isApproved = false;
      userData.status = 'pending_approval';
      userData.approvalRequired = true;
      userData.submittedAt = new Date();
    } else {
      // Admin, client, dealer get automatic approval
      userData.isApproved = true;
      userData.status = 'approved';
      userData.approvalRequired = false;
      userData.approvedAt = new Date();
    }

    const user = await SignUp.create(userData);

    // Send appropriate response based on approval requirement
    if (userData.status === 'pending_approval') {
      // Send notification to admin (you can implement email/SMS here)
      console.log(`New employee signup pending approval: ${fullname} (${type})`);
      
      return res.status(201).json({ 
        success: true,
        message: 'Registration submitted successfully. Your account is pending admin approval. You will be notified once approved.',
        requiresApproval: true,
        user: {
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          type: user.type,
          status: user.status
        }
      });
    }

    res.status(201).json({ 
      success: true,
      message: 'User registered successfully. You can now login.',
      requiresApproval: false,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        type: user.type,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error. Please try again.' 
    });
  }
});

// Enhanced login route with approval check
app.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone and password are required' 
      });
    }

    const user = await SignUp.findOne({ 
      where: { 
        phone: phone.replace(/\D/g, ''), 
        password 
      } 
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid phone number or password' 
      });
    }

    // Check approval status for employee types
    const employeeTypesNeedingApproval = [
      'field_employee', 
      'office_employee', 
      'sale_parchase',
      'sale_purchase',
      'sales_purchase'
    ];
    
    const normalizedType = user.type.toLowerCase().replace(/\s+/g, '_');
    
    if (employeeTypesNeedingApproval.includes(normalizedType)) {
      if (!user.isApproved || user.status !== 'approved') {
        let message = 'Your account is pending approval from admin.';
        
        if (user.status === 'rejected') {
          message = 'Your account has been rejected. Please contact admin for more information.';
        } else if (user.status === 'suspended') {
          message = 'Your account has been suspended. Please contact admin.';
        }
        
        return res.status(403).json({ 
          success: false,
          error: message,
          accountStatus: user.status
        });
      }
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      ...userWithoutPassword
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// =================================================================
// USER MANAGEMENT ROUTES
// =================================================================

// Get Users Route - Compatible with Users.js component
app.get('/Users', async (req, res) => {
  try {
    const users = await SignUp.findAll({
      order: [['id', 'DESC']]
    });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users',
      error: 'Failed to fetch users' 
    });
  }
});

// Update User Route - FIXED VERSION
app.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullname, email, password, phone, type } = req.body;

    // Validate required fields
    if (!fullname || !email || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and phone are required',
        error: 'Name, email, and phone are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address!',
        error: 'Please enter a valid email address!' 
      });
    }

    // Phone validation
    if (phone.length < 10) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid phone number!',
        error: 'Please enter a valid phone number!' 
      });
    }

    // Password validation (only if password is provided)
    if (password && password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long!',
        error: 'Password must be at least 6 characters long!' 
      });
    }

    // Find user by user_id or id - FIXED
    const user = await SignUp.findOne({ 
      where: { 
        [Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found',
        error: 'User not found' 
      });
    }

    // Check if email already exists for other users - FIXED
    const existingUser = await SignUp.findOne({ 
      where: { 
        email,
        id: { [Op.ne]: user.id }
      }
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists!',
        error: 'Email already exists!' 
      });
    }

    // Prepare update data
    const updateData = {
      fullname,
      email,
      phone,
      type: type || user.type
    };

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    // Update the user
    const updatedUser = await user.update(updateData);
    
    res.status(200).json({ 
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update User Error:', error);
    
    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        success: false,
        message: 'Email already exists!',
        error: 'Email already exists!'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Something went wrong',
      error: 'Something went wrong' 
    });
  }
});

// Delete User Route - Compatible with Users.js component - FIXED
app.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await SignUp.findOne({ 
      where: { 
        [Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found',
        error: 'User not found' 
      });
    }

    await user.destroy();
    
    res.status(200).json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete user',
      error: 'Failed to delete user' 
    });
  }
});

// =================================================================
// ADMIN APPROVAL WORKFLOW ENHANCEMENTS
// =================================================================

// Get pending employee approvals with enhanced details
app.get('/api/admin/pending-employee-approvals', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {
      [Op.and]: [
        {
          [Op.or]: [
            { isApproved: false },
            { isApproved: null }
          ]
        },
        {
          status: 'pending_approval'
        },
        {
          type: {
            [Op.in]: ['field_employee', 'office_employee', 'sale_parchase', 'sale_purchase', 'sales_purchase']
          }
        }
      ]
    };

    if (type && type !== 'all') {
      whereClause[Op.and].push({ type: type });
    }

    const { count, rows: pendingUsers } = await SignUp.findAndCountAll({
      where: whereClause,
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'fullname', 'email', 'phone', 'type', 'user_id', 
        'status', 'isApproved', 'department', 'employeeId',
        'submittedAt', 'createdAt'
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Pending approvals fetched successfully',
      data: {
        pendingUsers,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + pendingUsers.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Approve employee with notification
app.post('/api/admin/approve-employee/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId, approvalNote } = req.body;

    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: userId },
          { user_id: userId }
        ],
        status: 'pending_approval'
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pending user not found'
      });
    }

    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
    }

    const updatedUser = await user.update({
      isApproved: true,
      status: 'approved',
      approvedBy: adminId || 'admin',
      approvedAt: new Date(),
      approvalNote: approvalNote || 'Approved by admin'
    });

    // Here you can send notification to user (email/SMS)
    console.log(`Employee approved: ${user.fullname} (${user.email})`);

    res.status(200).json({
      success: true,
      message: 'Employee approved successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error approving employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Reject employee with reason
app.post('/api/admin/reject-employee/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId, rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: userId },
          { user_id: userId }
        ],
        status: 'pending_approval'
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pending user not found'
      });
    }

    const updatedUser = await user.update({
      status: 'rejected',
      rejectedBy: adminId || 'admin',
      rejectedAt: new Date(),
      rejectionReason: rejectionReason.trim()
    });

    // Here you can send notification to user (email/SMS)
    console.log(`Employee rejected: ${user.fullname} (${user.email}) - Reason: ${rejectionReason}`);

    res.status(200).json({
      success: true,
      message: 'Employee registration rejected',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error rejecting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Fetch pending approval requests (for admin)
app.get('/api/admin/pending-approvals', async (req, res) => {
  try {
    const pendingUsers = await SignUp.findAll({
      where: {
        [Op.or]: [
          { isApproved: false },
          { isApproved: null }
        ],
        [Op.or]: [
          { status: 'pending' },
          { status: 'Pending' },
          { status: 'pending_approval' }
        ],
        type: {
          [Op.in]: ['employee', 'officeemp', 'sale_parchase', 'field_employee', 'office_employee', 'sale_purchase', 'sales_purchase']
        }
      },
      order: [['id', 'DESC']],
      attributes: ['id', 'fullname', 'email', 'phone', 'type', 'user_id', 'status', 'isApproved']
    });

    console.log('Found pending users:', pendingUsers.length);

    res.status(200).json({
      success: true,
      message: 'Pending approval requests fetched successfully',
      data: pendingUsers
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Approve employee signup request
app.post('/api/admin/approve-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID or user_id
    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: userId },
          { user_id: userId }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is eligible for approval
    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
    }

    // Update user approval status - only update basic fields
    const updatedUser = await user.update({
      isApproved: true,
      status: 'approved'
    });

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Reject employee signup request
app.post('/api/admin/reject-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID or user_id
    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: userId },
          { user_id: userId }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is eligible for rejection
    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved user'
      });
    }

    // Update user rejection status - only update status field
    const updatedUser = await user.update({
      status: 'rejected'
    });

    res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// MATERIAL/DATA MANAGEMENT ROUTES
// =================================================================

// GET: Fetch all data with filtering and sorting options - FIXED
app.get('/api/admin/all-data', async (req, res) => {
  try {
    const { 
      status, 
      source, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search
    } = req.query;

    let whereClause = {};
    
    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    // Filter by source (employee or office) - FIXED
    if (source === 'employee') {
      whereClause.image1 = { [Op.not]: null };
    } else if (source === 'office') {
      whereClause.image1 = { [Op.is]: null };
    }
    
    // Search functionality - FIXED
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { detail: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    const { count, rows: materials } = await Material.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id',
        'detail',
        'price_per_unit',
        'total_price',
        'destination',
        'pickup_location',
        'drop_location',
        'c_id',
        'e_id',
        'status',
        'image1',
        'image2',
        'image3',
        'video',
        'video1',
        'video2',
        'video3',
        'address',
        'pincode',
        'latitude',
        'longitude',
        'name',
        'phone',
        'unit',
        'quantity',
        'offer',
        'need_product',
        'shipment_date',
        'createdAt',
        'updatedAt'
      ]
    });

    // Categorize data by source
    const employeeData = materials.filter(item => 
      item.image1 || item.image2 || item.image3 || 
      item.video1 || item.video2 || item.video3
    );
    
    const officeData = materials.filter(item => 
      !item.image1 && !item.image2 && !item.image3 && 
      !item.video1 && !item.video2 && !item.video3
    );

    res.status(200).json({
      success: true,
      message: 'All data fetched successfully',
      data: {
        all: materials,
        employee: employeeData,
        office: officeData,
        summary: {
          total: count,
          employee: employeeData.length,
          office: officeData.length,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + materials.length < count,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT: Update status of material
app.put('/api/admin/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'submitted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, approved, rejected, submitted'
      });
    }
    
    const [updatedRowsCount] = await Material.update(
      { status }, 
      { where: { id } }
    );
    
    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET: Fetch all submitted materials (Enhanced with admin features)
app.get('/api/getdata', async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    
    let whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    const materials = await Material.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: materials
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Employee submits data (Enhanced with better validation)
app.post('/api/submit', upload.fields([
  { name: 'image1' }, { name: 'image2' }, { name: 'image3' },
  { name: 'video1' }, { name: 'video2' }, { name: 'video3' }
]), async (req, res) => {
  try {
    const {
      name, phone, address, pincode,
      latitude, longitude, detail
    } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !detail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, phone, address, detail'
      });
    }

    const material = await Material.create({
      name,
      phone,
      address,
      pincode,
      latitude,
      longitude,
      detail,
      image1: req.files['image1']?.[0]?.filename || null,
      image2: req.files['image2']?.[0]?.filename || null,
      image3: req.files['image3']?.[0]?.filename || null,
      video1: req.files['video1']?.[0]?.filename || null,
      video2: req.files['video2']?.[0]?.filename || null,
      video3: req.files['video3']?.[0]?.filename || null,
      status: 'submitted'
    });

    res.status(201).json({
      success: true,
      message: 'Submission successful',
      data: material
    });

  } catch (error) {
    console.error('Error submitting material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// OFFICE ROUTES
// =================================================================

// Fix the missing /add_details route
app.post('/add_details', async (req, res) => {
  try {
    let { userId, name, address, phone, detail } = req.body;

    // Auto-generate a userId if not provided
    if (!userId) {
      userId = generateProductUserId(); // Use the existing function
    }

    if (!name || !address || !phone || !detail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, address, phone, detail'
      });
    }

    const material = await Material.create({
      userId,
      name,
      address,
      phone,
      detail,
      role: 'office',
      status: 'submitted_by_office',
      productType: 'office_request'
    });

    res.status(201).json({
      success: true,
      message: 'Material request created successfully',
      data: material
    });

  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Fix the missing /view_details route
app.get('/view_details', async (req, res) => {
  try {
    const data = await Material.findAll({
      where: { role: 'office' },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ 
      success: true, 
      data,
      message: 'Office data fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching office data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching office data',
      error: error.message
    });
  }
});

// Add missing /counts route for AdminScreen
app.get('/counts', async (req, res) => {
  try {
    const usersCount = await SignUp.count();
    const materialsCount = await Material.count();
    const projectsCount = await Material.count({
      where: { status: 'approved' }
    });

    res.status(200).json({
      success: true,
      usersCount: usersCount || 0,
      materialsCount: materialsCount || 0,
      projectsCount: projectsCount || 0
    });
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({
      success: false,
      usersCount: 0,
      materialsCount: 0,
      projectsCount: 0,
      error: error.message
    });
  }
});

// Fetch all employee submissions (admin view or general list)
app.get('/employee_details', async (req, res) => {
  try {
    const data = await Material.findAll({
      where: { role: 'employee' },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching employee data:', err);
    res.status(500).json({ success: false, message: 'Error fetching employee data', error: err.message });
  }
});

// Submit material from employee (userId auto-generated)
app.post('/employee_details', upload.fields([
  { name: 'image1' }, { name: 'image2' }, { name: 'image3' },
  { name: 'video1' }, { name: 'video2' }, { name: 'video3' }
]), async (req, res) => {
  try {
    const { name, phone, address, pincode, latitude, longitude, detail } = req.body;

    if (!name || !phone || !address || !pincode || !latitude || !longitude || !detail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const userId = 'EMP-' + Math.floor(100000 + Math.random() * 900000); // auto-generate

    const material = await Material.create({
      userId,
      role: 'employee',
      name,
      phone,
      address,
      pincode,
      latitude,
      longitude,
      detail,
      image1: req.files['image1']?.[0]?.filename || null,
      image2: req.files['image2']?.[0]?.filename || null,
      image3: req.files['image3']?.[0]?.filename || null,
      video1: req.files['video1']?.[0]?.filename || null,
      video2: req.files['video2']?.[0]?.filename || null,
      video3: req.files['video3']?.[0]?.filename || null,
      status: 'submitted'
    });

    res.status(201).json({
      success: true,
      message: 'Employee material submitted successfully',
      data: material
    });

  } catch (error) {
    console.error('Error submitting employee material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Admin sees both employees data
app.get('/both_employees', async (req, res) => {
  try {
    // Fetch all materials
    const allData = await Material.findAll({ order: [['createdAt', 'DESC']] });

    // Filter based on role
    const fieldEmp = allData.filter(entry => entry.role === 'employee');
    const officeEmp = allData.filter(entry => entry.role === 'office');

    res.json({
      success: true,
      total: allData.length,
      fieldEmpCount: fieldEmp.length,
      officeEmpCount: officeEmp.length,
      all: allData,
      fieldEmp,
      officeEmp
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin data',
      error: err.message
    });
  }
});

// =================================================================
// FEEDBACK ROUTES
// =================================================================

// Add feedback route for clients
app.post('/api/client/feedback', async (req, res) => {
  try {
    const { 
      clientId, 
      billId, 
      orderId,
      rating, 
      feedbackText, 
      serviceQuality,
      deliveryTime,
      productQuality,
      overallSatisfaction,
      recommendations 
    } = req.body;

    // Validate required fields
    if (!clientId || !rating || !feedbackText) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, rating, and feedback text are required'
      });
    }

    // Create feedback record
    const feedback = await Material.create({
      userId: `FEEDBACK_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      c_id: clientId,
      orderId: orderId || null,
      role: 'feedback',
      name: 'Client Feedback',
      detail: feedbackText,
      rating: parseInt(rating),
      serviceQuality: serviceQuality || null,
      deliveryTime: deliveryTime || null,
      productQuality: productQuality || null,
      overallSatisfaction: overallSatisfaction || null,
      recommendations: recommendations || null,
      billId: billId || null,
      status: 'submitted',
      productType: 'feedback'
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get feedback for admin
app.get('/api/admin/feedback', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      clientId
    } = req.query;

    let whereClause = {
      role: 'feedback'
    };

    if (clientId) {
      whereClause.c_id = clientId;
    }

    const offset = (page - 1) * limit;

    const { count, rows: feedback } = await Material.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone'],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Feedback fetched successfully',
      data: {
        feedback,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + feedback.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// ORDER MANAGEMENT ROUTES
// =================================================================

// Get clients
app.get('/clients', async (req, res) => {
  try {
    const clients = await SignUp.findAll({
      where: {
        type: 'Client' // Make sure this matches your database values
      },
      attributes: ['id', 'fullname', 'email', 'phone', 'user_id'], 
      order: [['fullname', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      clients: clients.map(client => ({
        id: client.id,
        fullName: client.fullname, // Mapping to match frontend expectation
        email: client.email,
        phone: client.phone,
        user_id: client.user_id
      }))
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
});

// Create new order
app.post('/api/admin/orders', upload.fields([
  { name: 'image1' }, 
  { name: 'video1' }
]), async (req, res) => {
  try {
    const {
      name,
      address,
      unit,
      quantity,
      unitPrice,
      vehicleName,
      vehicleNumber,
      pincode,
      offer = 0,
      status = 'active',
      isTemplate = false,
      description,
      phone,
      c_id,
      detail
    } = req.body;

    if (!name || !unit || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Name, unit, and unit price are required fields'
      });
    }

    const userId = await generateOrderId();
    const totalPrice = parseFloat(unitPrice) * (parseInt(quantity) || 1);
    const finalPrice = totalPrice - totalPrice * (parseFloat(offer) / 100);

    const newOrder = await Material.create({
      userId,
      name,
      unit,
      quantity: quantity || 1,
      unitPrice: parseFloat(unitPrice),
      totalPrice: finalPrice,
      vehicleName: vehicleName || null,
      vehicleNumber: vehicleNumber || null,
      pincode: pincode || null,
      offer: parseFloat(offer),
      image1: req.files?.['image1']?.[0]?.filename || null,
      video: req.files?.['video1']?.[0]?.filename || null,
      status,
      isTemplate: isTemplate === 'true' || isTemplate === true,
      description: description || null,
      createdBy: 'admin',
      phone: phone || null,
      c_id: c_id || null,
      role: 'admin',
      detail
    });

    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully',
      data: newOrder 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// Get all orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search,
      clientId,
      phone
    } = req.query;

    const whereClause = {
      role: 'admin' // Filter to only get order data
    };

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Text search
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
        { customerPhone: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { c_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // Dropdown filters
    if (clientId) {
      whereClause.c_id = clientId;
    }

    if (phone) {
      whereClause.phone = phone;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Material.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: {
        orders,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + orders.length < count,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update order
app.put('/api/admin/orders/:id', upload.fields([
  { name: 'image1' },
  { name: 'video1' }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      customerName,
      customerEmail,
      customerPhone,
      address,
      unit,
      quantity,
      unitPrice,
      vehicleName,
      vehicleNumber,
      pincode,
      offer = 0,
      status,
      isTemplate,
      description,
      phone,
      c_id,
      detail
    } = req.body;

    const order = await Material.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const totalPrice = parseFloat(unitPrice || order.unitPrice) * (parseInt(quantity || order.quantity) || 1);
    const finalPrice = totalPrice - (totalPrice * (parseFloat(offer || order.offer) / 100));

    const updatedOrder = await order.update({
      name: name || order.name,
      customerName: customerName || order.customerName,
      customerEmail: customerEmail || order.customerEmail,
      customerPhone: customerPhone || order.customerPhone,
      address: address || order.address,
      unit: unit || order.unit,
      quantity: quantity || order.quantity,
      unitPrice: parseFloat(unitPrice || order.unitPrice),
      totalPrice: finalPrice,
      vehicleName: vehicleName || order.vehicleName,
      vehicleNumber: vehicleNumber || order.vehicleNumber,
      pincode: pincode || order.pincode,
      offer: parseFloat(offer || order.offer),
      image1: req.files?.['image1']?.[0]?.filename || order.image1,
      video: req.files?.['video1']?.[0]?.filename || order.video,
      status: status || order.status,
      isTemplate: isTemplate === 'true' || isTemplate === true || order.isTemplate,
      description: description || order.description,
      phone: phone || order.phone,
      c_id: c_id || order.c_id,
      detail: detail || order.detail
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete order
app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Material.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.destroy();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// BILL MANAGEMENT ROUTES
// =================================================================

// Send bill for order
app.post('/api/admin/orders/:orderId/send-bill', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      clientId, 
      dueDate, 
      additionalNotes, 
      createdBy 
    } = req.body;

    // Validate required fields
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }

    // Find the order
    const order = await Material.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Find the client
    const client = await SignUp.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if bill already exists for this order
    const existingBill = await Bill.findOne({ where: { orderId } });
    if (existingBill) {
      return res.status(400).json({
        success: false,
        message: 'Bill already exists for this order'
      });
    }

    // Calculate amounts
    const subtotal = parseFloat(order.unitPrice) * parseInt(order.quantity);
    const discountPercentage = parseFloat(order.offer) || 0;
    const discountAmount = subtotal * (discountPercentage / 100);
    const totalAmount = subtotal - discountAmount;

    // Create bill
    const bill = await Bill.create({
      billNumber: generateBillNumber(),
      orderId: order.id,
      clientId: clientId,
      materialName: order.name,
      description: order.description || order.detail,
      quantity: order.quantity,
      unit: order.unit,
      unitPrice: order.unitPrice,
      subtotal: subtotal,
      discountPercentage: discountPercentage,
      discountAmount: discountAmount,
      totalAmount: totalAmount,
      deliveryAddress: order.address,
      pincode: order.pincode,
      vehicleName: order.vehicleName,
      vehicleNumber: order.vehicleNumber,
      paymentStatus: 'pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      additionalNotes: additionalNotes,
      createdBy: createdBy
    });

    // Update order status to indicate bill has been sent
    await order.update({ 
      status: 'bill_sent',
      c_id: clientId 
    });

    res.status(201).json({
      success: true,
      message: 'Bill created and sent to client successfully',
      data: {
        bill,
        client: {
          id: client.id,
          name: client.fullname,
          email: client.email,
          phone: client.phone
        }
      }
    });

  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Fetch all bills (Admin view)
app.get('/api/admin/bills', async (req, res) => {
  try {
    const {
      status,
      clientId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search
    } = req.query;

    let whereClause = {};

    // Filter by payment status
    if (status && status !== 'all') {
      whereClause.paymentStatus = status;
    }

    // Filter by client
    if (clientId) {
      whereClause.clientId = clientId;
    }

    // Search functionality
if (search) {
  whereClause[Op.or] = [
    { billNumber: { [Op.iLike]: `%${search}%` } },
    { materialName: { [Op.iLike]: `%${search}%` } },
    { '$Client.fullname$': { [Op.iLike]: `%${search}%` } },
    { '$Client.email$': { [Op.iLike]: `%${search}%` } }
  ];
}


    const offset = (page - 1) * limit;

    const { count, rows: bills } = await Bill.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone']
        },
        {
          model: Material,
          as: 'Order',
          attributes: ['id', 'name', 'status']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Bills fetched successfully',
      data: {
        bills,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + bills.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Fetch single bill details (Admin view)
app.get('/api/admin/bills/:billId', async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await Bill.findByPk(billId, {
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone']
        },
        {
          model: Material,
          as: 'Order',
          attributes: ['id', 'name', 'status', 'image1', 'image2', 'image3']
        }
      ]
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bill details fetched successfully',
      data: bill
    });

  } catch (error) {
    console.error('Error fetching bill details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH: Update bill payment status (Admin)
app.patch('/api/admin/bills/:billId/payment', async (req, res) => {
  try {
    const { billId } = req.params;
    const { 
      paymentStatus, 
      paymentMethod, 
      transactionId, 
      paymentNotes 
    } = req.body;

    // Validate payment status
    if (!['pending', 'successful'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status. Must be pending or successful'
      });
    }

    const bill = await Bill.findByPk(billId);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    const updateData = {
      paymentStatus,
      paymentMethod: paymentMethod || bill.paymentMethod,
      transactionId: transactionId || bill.transactionId,
      paymentNotes: paymentNotes || bill.paymentNotes
    };

    // Set payment date if status is successful
    if (paymentStatus === 'successful') {
      updateData.paymentDate = new Date();
    }

    const updatedBill = await bill.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Bill payment status updated successfully',
      data: updatedBill
    });

  } catch (error) {
    console.error('Error updating bill payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// CLIENT ROUTES - BILL VIEWING
// =================================================================

// GET: Fetch client's bills
app.get('/api/client/bills/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20
    } = req.query;

    let whereClause = { clientId };

    // Filter by payment status
    if (status && status !== 'all') {
      whereClause.paymentStatus = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: bills } = await Bill.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'Order',
          attributes: ['id', 'name', 'image1', 'image2', 'image3']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Client bills fetched successfully',
      data: {
        bills,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + bills.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching client bills:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Fetch single bill details for client
app.get('/api/client/bill/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const { clientId } = req.query;

    const whereClause = { id: billId };
    
    // Ensure client can only access their own bills
    if (clientId) {
      whereClause.clientId = clientId;
    }

    const bill = await Bill.findOne({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'Order',
          attributes: ['id', 'name', 'detail', 'image1', 'image2', 'image3']
        }
      ]
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bill details fetched successfully',
      data: bill
    });

  } catch (error) {
    console.error('Error fetching bill details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH: Client marks payment as complete
app.patch('/api/client/bill/:billId/payment', async (req, res) => {
  try {
    const { billId } = req.params;
    const { 
      clientId, 
      paymentMethod, 
      transactionId, 
      paymentNotes 
    } = req.body;

    // Validate required fields
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    const whereClause = { id: billId };
    
    // Ensure client can only update their own bills
    if (clientId) {
      whereClause.clientId = clientId;
    }

    const bill = await Bill.findOne({ where: whereClause });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found or access denied'
      });
    }

    // Check if bill is already paid
    if (bill.paymentStatus === 'successful') {
      return res.status(400).json({
        success: false,
        message: 'Bill is already marked as paid'
      });
    }

    const updatedBill = await bill.update({
      paymentStatus: 'successful',
      paymentMethod,
      transactionId: transactionId || null,
      paymentNotes: paymentNotes || null,
      paymentDate: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Payment marked as completed successfully',
      data: updatedBill
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// PRODUCT MANAGEMENT ROUTES
// =================================================================

// GET: Fetch all products
app.get('/api/admin/products', async (req, res) => {
  try {
    const {
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search
    } = req.query;

    let whereClause = {
      productType: 'product' // Distinguish from other material entries
    };

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { detail: { [Op.like]: `%${search}%` } },
        { unit: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows: products } = await Material.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 
        'name', 
        ['detail', 'details'],           // [column_name, alias]
        ['quantity', 'quantityInStore'], 
        'unit', 
        ['unitPrice', 'pricePerUnit'], 
        'image1', 
        'image2', 
        'createdAt', 
        'updatedAt'
      ]
    });

    // Transform the data to match frontend expectations
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      details: product.getDataValue('details') || product.detail,
      quantityInStore: product.getDataValue('quantityInStore') || product.quantity,
      unit: product.unit,
      pricePerUnit: product.getDataValue('pricePerUnit') || product.unitPrice,
      image1: product.image1,
      image2: product.image2,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: transformedProducts,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        hasNext: offset + products.length < count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Fetch single product by ID
app.get('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Material.findOne({
      where: { 
        id,
        productType: 'product'
      },
      attributes: [
        'id',
        'name',
        'detail',
        'quantity',
        'unit',
        'unitPrice',
        'image1',
        'image2',
        'createdAt',
        'updatedAt'
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Transform the data
    const transformedProduct = {
      id: product.id,
      name: product.name,
      details: product.detail,
      quantityInStore: product.quantity,
      unit: product.unit,
      pricePerUnit: product.unitPrice,
      image1: product.image1,
      image2: product.image2,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: transformedProduct
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Create new product
app.post('/api/admin/products', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, details, quantityInStore, unit, pricePerUnit, userId, role } = req.body;

    // Validation
    if (!name || !details || !unit || !quantityInStore || !pricePerUnit) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided (name, details, unit, quantityInStore, pricePerUnit)'
      });
    }

    // Validate numeric fields
    const quantity = parseFloat(quantityInStore);
    const price = parseFloat(pricePerUnit);

    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity in store must be a valid non-negative number'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per unit must be a valid positive number'
      });
    }

    // Handle image uploads
    const image1 = req.files && req.files.image1 ? req.files.image1[0].filename : null;
    const image2 = req.files && req.files.image2 ? req.files.image2[0].filename : null;

    // Create product
    const product = await Material.create({
      name: name.trim(),
      detail: details.trim(),
      quantity: quantity,
      unit: unit.trim(),
      unitPrice: price,
      image1: image1,
      image2: image2,
      productType: 'product',
      userId: userId || 1, // Use provided userId or default to 1
      role: role || 'admin', // Use provided role or default to 'admin'
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Transform response data
    const transformedProduct = {
      id: product.id,
      name: product.name,
      details: product.detail,
      quantityInStore: product.quantity,
      unit: product.unit,
      pricePerUnit: product.unitPrice,
      image1: product.image1,
      image2: product.image2,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: transformedProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Clean up uploaded files if product creation fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT: Update existing product
app.put('/api/admin/products/:id', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, details, quantityInStore, unit, pricePerUnit } = req.body;

    // Find existing product
    const existingProduct = await Material.findOne({
      where: { id, productType: 'product' }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validation
    if (!name || !details || !unit || !quantityInStore || !pricePerUnit) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided (name, details, unit, quantityInStore, pricePerUnit)'
      });
    }

    // Validate numeric fields
    const quantity = parseFloat(quantityInStore);
    const price = parseFloat(pricePerUnit);

    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity in store must be a valid non-negative number'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per unit must be a valid positive number'
      });
    }

    // Handle image uploads and cleanup
    const oldImage1 = existingProduct.image1;
    const oldImage2 = existingProduct.image2;

    const image1 = req.files && req.files.image1 ? req.files.image1[0].filename : oldImage1;
    const image2 = req.files && req.files.image2 ? req.files.image2[0].filename : oldImage2;

    // Update product
    await existingProduct.update({
      name: name.trim(),
      detail: details.trim(),
      quantity: quantity,
      unit: unit.trim(),
      unitPrice: price,
      image1: image1,
      image2: image2,
      userId: existingProduct.userId || 1,
      role: existingProduct.role || 'admin',
      updatedAt: new Date()
    });

    // Clean up old images if new ones were uploaded
    if (req.files && req.files.image1 && oldImage1) {
      fs.unlink(path.join('uploads', oldImage1), (err) => {
        if (err) console.error('Error deleting old image1:', err);
      });
    }

    if (req.files && req.files.image2 && oldImage2) {
      fs.unlink(path.join('uploads', oldImage2), (err) => {
        if (err) console.error('Error deleting old image2:', err);
      });
    }

    // Transform response data
    const transformedProduct = {
      id: existingProduct.id,
      name: existingProduct.name,
      details: existingProduct.detail,
      quantityInStore: existingProduct.quantity,
      unit: existingProduct.unit,
      pricePerUnit: existingProduct.unitPrice,
      image1: existingProduct.image1,
      image2: existingProduct.image2,
      createdAt: existingProduct.createdAt,
      updatedAt: existingProduct.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: transformedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Clean up uploaded files if update fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE: Delete product
app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find product to delete
    const product = await Material.findOne({
      where: { id, productType: 'product' }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated images
    if (product.image1) {
      fs.unlink(path.join('uploads', product.image1), (err) => {
        if (err) console.error('Error deleting image1:', err);
      });
    }

    if (product.image2) {
      fs.unlink(path.join('uploads', product.image2), (err) => {
        if (err) console.error('Error deleting image2:', err);
      });
    }

    // Delete product
    await product.destroy();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// STATISTICS AND UTILITY ROUTES
// =================================================================

// GET: Dashboard statistics for bills
app.get('/api/admin/bills/stats', async (req, res) => {
  try {
    const totalBills = await Bill.count();
    const pendingBills = await Bill.count({ where: { paymentStatus: 'pending' } });
    const successfulBills = await Bill.count({ where: { paymentStatus: 'successful' } });
    
    const totalRevenue = await Bill.sum('totalAmount', { 
      where: { paymentStatus: 'successful' } 
    });
    
    const pendingRevenue = await Bill.sum('totalAmount', { 
      where: { paymentStatus: 'pending' } 
    });

    res.status(200).json({
      success: true,
      data: {
        totalBills,
        pendingBills,
        successfulBills,
        totalRevenue: totalRevenue || 0,
        pendingRevenue: pendingRevenue || 0
      }
    });

  } catch (error) {
    console.error('Error fetching bill statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Get product statistics
app.get('/api/admin/products/stats', async (req, res) => {
  try {
    const stats = await Material.findAll({
      where: { productType: 'product' },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalProducts'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.literal('quantity * "unitPrice"')), 'totalValue'],
        [sequelize.fn('AVG', sequelize.col('unitPrice')), 'averagePrice']
      ],
      raw: true
    });

    const lowStockProducts = await Material.count({
      where: {
        productType: 'product',
        quantity: { [Op.lt]: 10 } // Products with less than 10 units
      }
    });

    res.status(200).json({
      success: true,
      message: 'Product statistics fetched successfully',
      data: {
        totalProducts: parseInt(stats[0].totalProducts) || 0,
        totalQuantity: parseFloat(stats[0].totalQuantity) || 0,
        totalValue: parseFloat(stats[0].totalValue) || 0,
        averagePrice: parseFloat(stats[0].averagePrice) || 0,
        lowStockProducts: lowStockProducts || 0
      }
    });
  } catch (error) {
    console.error('Error fetching product statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Get approval statistics for admin dashboard
app.get('/api/admin/approval-stats', async (req, res) => {
  try {
    const totalPending = await SignUp.count({
      where: {
        [Op.or]: [
          { isApproved: false },
          { isApproved: null }
        ],
        [Op.or]: [
          { status: 'pending' },
          { status: 'Pending' },
          { status: 'pending_approval' }
        ],
        type: {
          [Op.in]: ['employee', 'officeemp', 'sale_parchase', 'field_employee', 'office_employee', 'sale_purchase', 'sales_purchase']
        }
      }
    });

    const totalApproved = await SignUp.count({
      where: {
        isApproved: true,
        [Op.or]: [
          { status: 'approved' },
          { status: 'Approved' }
        ],
        type: {
          [Op.in]: ['employee', 'officeemp', 'sale_parchase', 'field_employee', 'office_employee', 'sale_purchase', 'sales_purchase']
        }
      }
    });

    const totalRejected = await SignUp.count({
      where: {
        [Op.or]: [
          { status: 'rejected' },
          { status: 'Rejected' }
        ],
        type: {
          [Op.in]: ['employee', 'officeemp', 'sale_parchase', 'field_employee', 'office_employee', 'sale_purchase', 'sales_purchase']
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalPending,
        totalApproved,
        totalRejected
      }
    });
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// UTILITY ROUTES
// =================================================================

// GET: File serve route
app.get('/file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// PUT: Update material status by ID
app.put('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const material = await Material.findByPk(id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const updatedMaterial = await material.update({ status });

    res.status(200).json({
      success: true,
      message: 'Material status updated successfully',
      data: updatedMaterial
    });

  } catch (error) {
    console.error('Error updating material status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE: Delete material by ID
app.delete('/api/materials/:id', async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Delete associated files
    const filesToDelete = [
      material.image1, material.image2, material.image3,
      material.video1, material.video2, material.video3
    ].filter(Boolean);

    filesToDelete.forEach(filename => {
      const filePath = path.join('uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await material.destroy();

    res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  
  if (error.message === 'Only image files (jpeg, jpg, png, gif, webp) are allowed!') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

// Customer Management Routes
app.get('/api/sales/customers', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      customerType,
      isActive = true
    } = req.query;

    let whereClause = {
      role: 'sales_purchase',
      type: 'customer_entry'
    };

    // Add filters
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (customerType) {
      whereClause.customerType = customerType;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { customerName: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows: customers } = await Customer.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: SignUp,
          as: 'user',
          attributes: ['id', 'fullname'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.post('/api/sales/customers', async (req, res) => {
  try {
    const {
      customerName,
      phoneNumber,
      email,
      alternatePhone,
      address,
      city,
      state,
      pincode,
      gstin,
      customerType = 'individual',
      creditLimit,
      paymentTerms = 30,
      contactPerson,
      website,
      businessCategory,
      notes,
      createdBy
    } = req.body;

    // Validation
    if (!customerName || !phoneNumber || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: customerName, phoneNumber, address, city, state, pincode'
      });
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Email validation (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address'
        });
      }
    }

    // Pincode validation
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit pincode'
      });
    }

    // Check for existing customer with same phone
    const existingCustomer = await Customer.findOne({
      where: { phoneNumber: phoneNumber.replace(/\D/g, '') }
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    const customer = await Customer.create({
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.replace(/\D/g, ''),
      email: email?.trim() || null,
      alternatePhone: alternatePhone?.replace(/\D/g, '') || null,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.replace(/\D/g, ''),
      gstin: gstin?.toUpperCase().trim() || null,
      customerType,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      paymentTerms: paymentTerms ? parseInt(paymentTerms) : 30,
      contactPerson: contactPerson?.trim() || null,
      website: website?.trim() || null,
      businessCategory: businessCategory?.trim() || null,
      notes: notes?.trim() || null,
      createdBy: createdBy || null,
      role: 'sales_purchase',
      type: 'customer_entry'
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.put('/api/sales/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'customer_entry'
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validation for required fields
    if (updateData.customerName && !updateData.customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    if (updateData.phoneNumber) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(updateData.phoneNumber.replace(/\D/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit phone number'
        });
      }
      updateData.phoneNumber = updateData.phoneNumber.replace(/\D/g, '');
    }

    if (updateData.email && updateData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address'
        });
      }
    }

    if (updateData.pincode) {
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(updateData.pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 6-digit pincode'
        });
      }
      updateData.pincode = updateData.pincode.replace(/\D/g, '');
    }

    // Process alternate phone
    if (updateData.alternatePhone) {
      updateData.alternatePhone = updateData.alternatePhone.replace(/\D/g, '') || null;
    }

    // Clean and process text fields
    ['customerName', 'address', 'city', 'state', 'contactPerson', 'website', 'businessCategory', 'notes'].forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field]?.trim() || null;
      }
    });

    if (updateData.gstin) {
      updateData.gstin = updateData.gstin.toUpperCase().trim() || null;
    }

    if (updateData.creditLimit !== undefined) {
      updateData.creditLimit = updateData.creditLimit ? parseFloat(updateData.creditLimit) : null;
    }

    if (updateData.paymentTerms !== undefined) {
      updateData.paymentTerms = updateData.paymentTerms ? parseInt(updateData.paymentTerms) : 30;
    }

    const updatedCustomer = await customer.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.delete('/api/sales/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'customer_entry'
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has orders
    const hasOrders = await SalesOrder.findOne({
      where: { customerId: id }
    });

    if (hasOrders) {
      // Soft delete - just mark as inactive
      await customer.update({ isActive: false });
      
      res.status(200).json({
        success: true,
        message: 'Customer marked as inactive (has existing orders)'
      });
    } else {
      // Hard delete if no orders
      await customer.destroy();
      
      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Sales Order Management Routes
app.get('/api/sales/orders', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      orderType,
      status,
      priority,
      customerId
    } = req.query;

    let whereClause = {
      role: 'sales_purchase',
      type: 'order_entry'
    };

    // Add filters
    if (orderType) {
      whereClause.orderType = orderType;
    }

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { productName: { [Op.like]: `%${search}%` } },
        { productCategory: { [Op.like]: `%${search}%` } },
        { orderNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows: orders } = await SalesOrder.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'customerName', 'phoneNumber', 'customerType'],
          required: false
        },
        {
          model: SignUp,
          as: 'user',
          attributes: ['id', 'fullname'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.post('/api/sales/orders', async (req, res) => {
  try {
    const {
      productName,
      productCategory,
      description,
      quantity,
      unit = 'pcs',
      unitPrice,
      discount = 0,
      orderType = 'sale',
      priority = 'medium',
      expectedDeliveryDate,
      customerId,
      createdBy
    } = req.body;

    // Validation
    if (!productName || !quantity || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: productName, quantity, unitPrice'
      });
    }

    // Validate numeric fields
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const discountPercent = parseFloat(discount) || 0;

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid positive number'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit price must be a valid positive number'
      });
    }

    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Discount must be a valid percentage between 0 and 100'
      });
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    const order = await SalesOrder.create({
      productName: productName.trim(),
      productCategory: productCategory?.trim() || null,
      description: description?.trim() || null,
      quantity: qty,
      unit: unit.trim(),
      unitPrice: price,
      discount: discountPercent,
      orderType,
      priority,
      expectedDeliveryDate: expectedDeliveryDate?.trim() || null,
      customerId: customerId || null,
      createdBy: createdBy || null,
      role: 'sales_purchase',
      type: 'order_entry'
    });

    // Fetch the created order with associations
    const createdOrder = await SalesOrder.findByPk(order.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'customerName', 'phoneNumber'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: createdOrder
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.put('/api/sales/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const order = await SalesOrder.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'order_entry'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validation for required fields
    if (updateData.productName && !updateData.productName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (updateData.quantity !== undefined) {
      const qty = parseFloat(updateData.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a valid positive number'
        });
      }
      updateData.quantity = qty;
    }

    if (updateData.unitPrice !== undefined) {
      const price = parseFloat(updateData.unitPrice);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit price must be a valid positive number'
        });
      }
      updateData.unitPrice = price;
    }

    if (updateData.discount !== undefined) {
      const discountPercent = parseFloat(updateData.discount) || 0;
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be a valid percentage between 0 and 100'
        });
      }
      updateData.discount = discountPercent;
    }

    // Validate customer if provided
    if (updateData.customerId) {
      const customer = await Customer.findByPk(updateData.customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    // Clean text fields
    ['productName', 'productCategory', 'description', 'unit', 'expectedDeliveryDate'].forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field]?.trim() || null;
      }
    });

    const updatedOrder = await order.update(updateData);

    // Fetch updated order with associations
    const orderWithAssociations = await SalesOrder.findByPk(updatedOrder.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'customerName', 'phoneNumber'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: orderWithAssociations
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.delete('/api/sales/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await SalesOrder.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'order_entry'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be deleted based on status
    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete shipped or delivered orders'
      });
    }

    await order.destroy();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Order Status Update Route
app.patch('/api/sales/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actualDeliveryDate } = req.body;

    const validStatuses = ['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const order = await SalesOrder.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'order_entry'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updateData = { status };
    
    // Set actual delivery date if status is delivered
    if (status === 'delivered' && actualDeliveryDate) {
      updateData.actualDeliveryDate = new Date(actualDeliveryDate);
    }

    const updatedOrder = await order.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Dashboard/Statistics Routes
app.get('/api/sales/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    }

    // Customer statistics
    const totalCustomers = await Customer.count({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        isActive: true,
        ...dateFilter
      }
    });

    const businessCustomers = await Customer.count({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        customerType: 'business',
        isActive: true,
        ...dateFilter
      }
    });

    const individualCustomers = await Customer.count({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        customerType: 'individual',
        isActive: true,
        ...dateFilter
      }
    });

    // Order statistics
    const totalOrders = await SalesOrder.count({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        ...dateFilter
      }
    });

    const saleOrders = await SalesOrder.count({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'sale',
        ...dateFilter
      }
    });

    const purchaseOrders = await SalesOrder.count({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'purchase',
        ...dateFilter
      }
    });

    // Order status breakdown
    const ordersByStatus = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        ...dateFilter
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Priority breakdown
    const ordersByPriority = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        ...dateFilter
      },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });

    // Revenue statistics
    const revenueStats = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'sale',
        status: { [Op.in]: ['delivered', 'confirmed'] },
        ...dateFilter
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.col('totalAmount')), 'averageOrderValue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'completedOrders']
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          business: businessCustomers,
          individual: individualCustomers
        },
        orders: {
          total: totalOrders,
          sales: saleOrders,
          purchases: purchaseOrders,
          byStatus: ordersByStatus,
          byPriority: ordersByPriority
        },
        revenue: revenueStats[0] || {
          totalRevenue: 0,
          averageOrderValue: 0,
          completedOrders: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});





// =================================================================
// DATABASE SYNC AND SERVER START
// =================================================================

// Database sync and server start
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await sequelize.sync();
    console.log('Database synchronized successfully.');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

startServer();