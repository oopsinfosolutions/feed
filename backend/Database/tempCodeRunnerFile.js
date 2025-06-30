const express = require("express");
const cors = require("cors");
const multer = require('multer');
const sequelize = require("./Database/DB");
const SignUp = require('./models/signup');
const Material = require('./models/shipmentorder');
const path = require("path");
const fs = require('fs');
require("dotenv").config();

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

// Helper function for generating user ID
async function generateUserId() {
  while (true) {
    const id = Math.floor(1000 + Math.random() * 9000);
    const existing = await SignUp.findOne({ where: { user_id: id } });
    if (!existing) return id;
  }
}

// AUTH ROUTES
// Signup Route
app.post('/signup', async (req, res) => {
  try {
    console.log("req.body ===>", req.body);

    const { fullname, email, password, phone, type } = req.body;

    if (!fullname) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user_id = await generateUserId();

    const user = await SignUp.create({
      fullname, 
      email,
      password,
      phone,
      type,
      user_id
    });

    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Login Route
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

    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ADMIN ROUTES - MATERIALS
// GET: Fetch all data with filtering and sorting options
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
    
    // Filter by source (employee or office)
    if (source === 'employee') {
      whereClause.image1 = { [Material.sequelize.Op.not]: null };
    } else if (source === 'office') {
      whereClause.image1 = { [Material.sequelize.Op.is]: null };
    }
    
    // Search functionality
    if (search) {
      whereClause[Material.sequelize.Op.or] = [
        { name: { [Material.sequelize.Op.iLike]: `%${search}%` } },
        { phone: { [Material.sequelize.Op.iLike]: `%${search}%` } },
        { address: { [Material.sequelize.Op.iLike]: `%${search}%` } },
        { detail: { [Material.sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    const { count, rows: materials } = await Material.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
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
    
    const material = await Material.findByPk(id);
    
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

// PUT: Update any record by ID
app.put('/api/admin/update/:id', upload.fields([
  { name: 'image1' }, { name: 'image2' }, { name: 'image3' },
  { name: 'video1' }, { name: 'video2' }, { name: 'video3' }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, address, pincode,
      latitude, longitude, detail, status
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
      status: status || material.status
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

// GET: Dashboard statistics
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const totalRecords = await Material.count();
    
    const employeeRecords = await Material.count({
      where: {
        [Material.sequelize.Op.or]: [
          { image1: { [Material.sequelize.Op.not]: null } },
          { image2: { [Material.sequelize.Op.not]: null } },
          { image3: { [Material.sequelize.Op.not]: null } },
          { video1: { [Material.sequelize.Op.not]: null } },
          { video2: { [Material.sequelize.Op.not]: null } },
          { video3: { [Material.sequelize.Op.not]: null } }
        ]
      }
    });
    
    const officeRecords = totalRecords - employeeRecords;
    
    const statusCounts = await Material.findAll({
      attributes: [
        'status',
        [Material.sequelize.fn('COUNT', Material.sequelize.col('status')), 'count']
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

// GET: Export data to CSV
app.get('/api/admin/export', async (req, res) => {
  try {
    const { format = 'json', source } = req.query;
    
    let whereClause = {};
    
    if (source === 'employee') {
      whereClause.image1 = { [Material.sequelize.Op.not]: null };
    } else if (source === 'office') {
      whereClause.image1 = { [Material.sequelize.Op.is]: null };
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
// GET: Fetch all users
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await SignUp.findAll();
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

// PUT: Update admin user by ID
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

// OFFICE ROUTES
// GET: Fetch materials with filtering
app.get('/api/materials', async (req, res) => {
  try {
    const { status, source, limit = 100 } = req.query;
    
    let whereClause = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (source === 'office') {
      whereClause.image1 = { [Material.sequelize.Op.is]: null };
    }
    
    const materials = await Material.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: materials,
      count: materials.length
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Add new material request from office (Enhanced with validation)
app.post('/api/add_by_office', async (req, res) => {
  try {
    const { name, address, phone, detail, status = 'pending' } = req.body;

    if (!name || !address || !phone || !detail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, address, phone, detail'
      });
    }

    const material = await Material.create({
      name,
      address,
      phone,
      detail,
      status
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});