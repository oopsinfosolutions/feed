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
require("dotenv").config();


Bill.belongsTo(SignUp, { foreignKey: 'clientId', as: 'Client' });
Bill.belongsTo(Material, { foreignKey: 'orderId', as: 'Order' });
Bill.belongsTo(SignUp, { foreignKey: 'createdBy', as: 'Creator' });

SignUp.hasMany(Bill, { foreignKey: 'clientId', as: 'Bills' });
Material.hasOne(Bill, { foreignKey: 'orderId', as: 'Bill' });

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



// =================================================================
// HELPER FUNCTIONS - Add these after middleware setup
// =================================================================

// Helper function for generating user ID (existing function)
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
// ROUTES START HERE
// =================================================================




// Middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Signup Route - Updated
app.post('/signup', async (req, res) => {
  try {
    const { fullname, email, password, phone, type } = req.body;

    if (!fullname || !email || !phone || !password || !type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user_id = await generateUserId();

    let userData = {
      fullname,
      email,
      password,
      phone,
      type,
      user_id,
    };

    // Define employee types that need approval (excluding admin and client)
    const employeeTypesNeedingApproval = ['employee', 'officeemp', 'sale_parchase'];
    
    // If user is an employee type, mark as not approved
    if (employeeTypesNeedingApproval.includes(type.toLowerCase())) {
      userData.isApproved = false;
      userData.status = 'pending';
    } else {
      // Admin, client, dealer get automatic approval
      userData.isApproved = true;
      userData.status = 'approved';
    }

    const user = await SignUp.create(userData);

    if (userData.status === 'pending') {
      return res.json({ message: 'Signup request sent to admin for approval', user });
    }

    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Login Route - Updated
app.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required' });
    }

    const user = await SignUp.findOne({ where: { phone, password } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Define employee types that need approval (excluding admin and client)
    const employeeTypesNeedingApproval = ['employee', 'officeemp', 'sale_parchase'];
    
    // Only check approval status for employee types, not for admin/client/dealer
    if (employeeTypesNeedingApproval.includes(user.type.toLowerCase()) && !user.isApproved) {
      return res.status(401).json({ error: 'Your account is pending approval' });
    }

    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});



// AUTH ROUTES


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




// Add these routes to your server.js file after the existing user management routes

// =================================================================
// EMPLOYEE APPROVAL ROUTES
// =================================================================

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
          { status: 'Pending' }
        ],
        type: {
          [Op.in]: ['employee', 'officeemp', 'sale_parchase'] // FIXED: Using correct spelling
        }
      },
      order: [['id', 'DESC']],
      attributes: ['id', 'fullname', 'email', 'phone', 'type', 'user_id', 'status', 'isApproved']
    });

    console.log('Found pending users:', pendingUsers.length);
    console.log('Pending users data:', pendingUsers.map(u => ({
      id: u.id,
      fullname: u.fullname,
      type: u.type,
      status: u.status,
      isApproved: u.isApproved
    })));

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

// POST: Reject employee signup request (SIMPLE VERSION)
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
          { status: 'Pending' }
        ],
        type: {
          [Op.in]: ['employee', 'officeemp', 'sale_parchase'] // FIXED: Using correct spelling
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
          [Op.in]: ['employee', 'officeemp', 'sale_parchase'] // FIXED: Using correct spelling
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
          [Op.in]: ['employee', 'officeemp', 'sale_parchase'] // FIXED: Using correct spelling
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

// GET: Get user approval history (for admin)
app.get('/api/admin/approval-history', async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {
      type: {
        // Updated to match the actual format in your database
        [Op.in]: ['employee', 'officeemp', 'sale_purchase', 'Sale Parchase', 'sale_parchase']
      }
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const { count, rows: users } = await SignUp.findAndCountAll({
      where: whereClause,
      order: [['id', 'DESC']], // Using id instead of createdAt
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'fullname', 'email', 'phone', 'type', 'user_id', 
        'status', 'isApproved', 'approvedBy'
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Approval history fetched successfully',
      data: {
        users,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + users.length < count,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH: Bulk approve/reject users
app.patch('/api/admin/bulk-approval', async (req, res) => {
  try {
    const { userIds, action, adminId, note } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }

    let updateData = {};
    
    if (action === 'approve') {
      updateData = {
        isApproved: true,
        status: 'approved',
        approvedBy: adminId || 'admin'
      };
    } else {
      updateData = {
        status: 'rejected'
      };
    }

    const [updatedCount] = await SignUp.update(updateData, {
      where: {
        [Op.or]: [
          { id: { [Op.in]: userIds } },
          { user_id: { [Op.in]: userIds } }
        ],
        [Op.or]: [
          { isApproved: false },
          { isApproved: null }
        ],
        [Op.or]: [
          { status: 'pending' },
          { status: 'Pending' }
        ]
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully ${action}d ${updatedCount} users`,
      updatedCount
    });
  } catch (error) {
    console.error('Error in bulk approval:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE: Delete rejected user permanently
app.delete('/api/admin/delete-rejected/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user by ID or user_id
    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: userId },
          { user_id: userId }
        ],
        status: 'rejected' // Only allow deletion of rejected users
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Rejected user not found'
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'Rejected user deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting rejected user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});


// ADMIN ROUTES - MATERIALS
// GET: Fetch all data with filtering and sorting options - FIXED
// Fixed API routes with proper column selection
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
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { detail: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    // FIX: Specify only the columns that exist in your table
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

// GET: Fetch single record by ID
app.get('/api/admin/data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const material = await Material.findByPk(id, {
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
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: material
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

// PUT: Update any record by ID
app.put('/api/admin/update/:id', upload.fields([
  { name: 'image1' }, { name: 'image2' }, { name: 'image3' },
  { name: 'video1' }, { name: 'video2' }, { name: 'video3' }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, address, pincode,
      latitude, longitude, detail, status,
      price_per_unit, total_price, destination,
      pickup_location, drop_location, unit, quantity
    } = req.body;

    const material = await Material.findByPk(id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    // Handle file uploads - keep existing files if no new ones uploaded
    const updateData = {
      name: name || material.name,
      phone: phone || material.phone,
      address: address || material.address,
      pincode: pincode || material.pincode,
      latitude: latitude || material.latitude,
      longitude: longitude || material.longitude,
      detail: detail || material.detail,
      status: status || material.status,
      price_per_unit: price_per_unit || material.price_per_unit,
      total_price: total_price || material.total_price,
      destination: destination || material.destination,
      pickup_location: pickup_location || material.pickup_location,
      drop_location: drop_location || material.drop_location,
      unit: unit || material.unit,
      quantity: quantity || material.quantity
    };

    // Update file fields only if new files are uploaded
    if (req.files) {
      updateData.image1 = req.files['image1']?.[0]?.filename || material.image1;
      updateData.image2 = req.files['image2']?.[0]?.filename || material.image2;
      updateData.image3 = req.files['image3']?.[0]?.filename || material.image3;
      updateData.video1 = req.files['video1']?.[0]?.filename || material.video1;
      updateData.video2 = req.files['video2']?.[0]?.filename || material.video2;
      updateData.video3 = req.files['video3']?.[0]?.filename || material.video3;
    }

    const updatedMaterial = await material.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Record updated successfully',
      data: updatedMaterial
    });

  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE: Delete record by ID
app.delete('/api/admin/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const material = await Material.findByPk(id);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
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
      message: 'Record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Add this function to check your database schema
app.get('/api/admin/check-schema', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'shipment_details' 
      AND TABLE_SCHEMA = 'feed'
      ORDER BY ORDINAL_POSITION
    `);
    
    res.json({
      success: true,
      message: 'Database schema retrieved successfully',
      columns: results
    });
  } catch (error) {
    console.error('Error checking schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH: Update status of multiple records
app.patch('/api/admin/bulk-status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!ids || !Array.isArray(ids) || !status) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide ids array and status'
      });
    }

    const updatedCount = await Material.update(
      { status },
      { where: { id: ids } }
    );

    res.status(200).json({
      success: true,
      message: `Updated ${updatedCount[0]} records successfully`,
      updated: updatedCount[0]
    });

  } catch (error) {
    console.error('Error updating bulk status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Dashboard statistics - FIXED
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const totalRecords = await Material.count();
    
    const employeeRecords = await Material.count({
      where: {
        [Op.or]: [
          { image1: { [Op.not]: null } },
          { image2: { [Op.not]: null } },
          { image3: { [Op.not]: null } },
          { video1: { [Op.not]: null } },
          { video2: { [Op.not]: null } },
          { video3: { [Op.not]: null } }
        ]
      }
    });
    
    const officeRecords = totalRecords - employeeRecords;
    
    const statusCounts = await Material.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['status']
    });

    const recentRecords = await Material.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: totalRecords,
          employee: employeeRecords,
          office: officeRecords
        },
        statusBreakdown: statusCounts,
        recentActivity: recentRecords
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

// GET: Export data to CSV - FIXED
app.get('/api/admin/export', async (req, res) => {
  try {
    const { format = 'json', source } = req.query;
    
    let whereClause = {};
    
    if (source === 'employee') {
      whereClause.image1 = { [Op.not]: null };
    } else if (source === 'office') {
      whereClause.image1 = { [Op.is]: null };
    }
    
    const materials = await Material.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    if (format === 'csv') {
      const csv = materials.map(item => ({
        ID: item.id,
        Name: item.name,
        Phone: item.phone,
        Address: item.address,
        Pincode: item.pincode,
        Detail: item.detail,
        Status: item.status,
        CreatedAt: item.createdAt,
        Source: (item.image1 || item.image2 || item.image3) ? 'Employee' : 'Office'
      }));
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=materials_export.csv');
      
      // Simple CSV conversion
      const csvHeader = Object.keys(csv[0]).join(',');
      const csvRows = csv.map(row => Object.values(row).join(','));
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.send(csvContent);
    } else {
      res.status(200).json({
        success: true,
        data: materials
      });
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ADMIN ROUTES - USER MANAGEMENT
// GET: Fetch all users (Admin route)
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await SignUp.findAll({
      order: [['id', 'DESC']]
    });
    res.status(200).json({ 
      success: true, 
      message: 'Users fetched successfully',
      data: users 
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// GET: Admin user by ID
app.get('/api/admin/users/:id', async (req, res) => {
  try {
    const user = await SignUp.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      message: 'User fetched successfully',
      data: user 
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// POST: Create admin user
app.post('/api/admin/users', async (req, res) => {
  try {
    const { fullname, email, phone, password, type } = req.body;
    
    if (!fullname || !email || !phone || !password || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: fullname, email, phone, password, type' 
      });
    }

    const user_id = await generateUserId();

    const newUser = await SignUp.create({ 
      fullname, 
      email, 
      phone, 
      password, 
      type,
      user_id
    });

    res.status(201).json({ 
      success: true, 
      message: 'User created successfully', 
      data: newUser 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// PUT: Update admin user by ID - FIXED
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email, phone, password, type } = req.body;
    
    const user = await SignUp.findByPk(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const updatedUser = await user.update({
      fullname: fullname || user.fullname,
      email: email || user.email,
      phone: phone || user.phone,
      password: password || user.password,
      type: type || user.type
    });

    res.status(200).json({ 
      success: true, 
      message: 'User updated successfully', 
      data: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// DELETE: Admin user by ID
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const user = await SignUp.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
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
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// EMPLOYEE ROUTES
// GET: Fetch all submitted materials (Enhanced with admin features) - FIXED
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

// OFFICE ROUTES
// POST: Add new material request from office
// 🔹 GET: Fetch all office data (no userId needed)
app.get('/view_details', async (req, res) => {
  try {
    const data = await Material.findAll({
      where: { role: 'office' },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching office data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching office data',
      error: error.message
    });
  }
});


// 🔹 POST: Submit material request from office
app.post('/add_details', async (req, res) => {
  try {
    let { userId, name, address, phone, detail } = req.body;

    // Auto-generate a userId if not provided
    if (!userId) {
      userId = 'OFF-' + Math.floor(100000 + Math.random() * 900000); // e.g., OFF-123456
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
      status: 'submitted_by_office'
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
// Bulk Delete Details Route - For deleting multiple details at once
app.delete('/bulk-delete-details', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of detail IDs is required'
      });
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const invalidIds = ids.filter(id => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format found in the list'
      });
    }

    const result = await Material.deleteMany({
      _id: { $in: ids }
    });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} details`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error bulk deleting details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get Details Statistics Route - For dashboard statistics
app.get('/details-stats', async (req, res) => {
  try {
    const totalDetails = await Material.countDocuments({});
    
    // Get details created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayDetails = await Material.countDocuments({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Get details created this week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const weekDetails = await Material.countDocuments({
      createdAt: {
        $gte: weekStart,
        $lt: tomorrow
      }
    });

    // Get details created this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthDetails = await Material.countDocuments({
      createdAt: {
        $gte: monthStart,
        $lt: tomorrow
      }
    });

    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        total: totalDetails,
        today: todayDetails,
        thisWeek: weekDetails,
        thisMonth: monthDetails
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
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

// UTILITY ROUTES
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


// 🔹 GET: Fetch all employee submissions (admin view or general list)
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


// 🔹 POST: Submit material from employee (userId auto-generated)
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

// Backend Routes for Order Management System

//order management //
//
//
// ADMIN ROUTES - ORDER 

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

    const userId= await generateOrderId();
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
      role:'admin',
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

function generateOrderId() {
  // Generate a unique order ID using timestamp and random number
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  return `ORDER_${timestamp}_${randomNum}`;
}

// Fixed backend routes for order management

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
      // Add this filter to only get order data (not employee/office data)
      role: 'admin' // or whatever role you use for orders
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
        { orderId: { [Op.like]: `%${search}%` } },
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

// Fixed PUT route - use Material instead of Order
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

    // Use Material model instead of Order
    const order = await Material.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Fixed calculation bug - was using finalPrice instead of totalPrice
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
      totalPrice: finalPrice, // Fixed this line
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

// Add DELETE route for orders
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

// Alternative approach - create separate routes for different data types
app.get('/api/admin/orders-only', async (req, res) => {
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
      // Only get records that are actual orders (not employee data)
      [Op.and]: [
        { role: 'admin' },
        { createdBy: 'admin' },
        // Add other conditions that identify this as an order
        { 
          [Op.or]: [
            { name: { [Op.ne]: null } },
            { unitPrice: { [Op.ne]: null } }
          ]
        }
      ]
    };

    // Add your existing filters here...
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
        { customerPhone: { [Op.like]: `%${search}%` } },
        { orderId: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { c_id: { [Op.like]: `%${search}%` } }
      ];
    }

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


//Admin sees bith employees data

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








//............................................................................................

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
// UTILITY ROUTES
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


function generateBillNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `BILL-${timestamp}-${random}`;
}




//..............................................................


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
        { name: { [Op.iLike]: `%${search}%` } },
        { detail: { [Op.iLike]: `%${search}%` } },
        { unit: { [Op.iLike]: `%${search}%` } }
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
      userId: existingProduct.userId || 1, // Keep existing userId or default to 1
      role: existingProduct.role || 'admin', // Keep existing role or default to admin
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

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

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


//.......................................................................



startServer();