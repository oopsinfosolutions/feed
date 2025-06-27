const express = require('express');
const router = express.Router();
const multer = require('multer');
const Material = require('../models/shipmentorder');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ADMIN ROUTES

// GET: Fetch all data with filtering and sorting options
router.get('/admin/all-data', async (req, res) => {
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
router.get('/admin/data/:id', async (req, res) => {
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
router.put('/admin/update/:id', upload.fields([
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
router.delete('/admin/delete/:id', async (req, res) => {
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
router.patch('/admin/bulk-status', async (req, res) => {
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
router.get('/admin/dashboard', async (req, res) => {
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
router.get('/admin/export', async (req, res) => {
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

// EXISTING EMPLOYEE ROUTES (Enhanced)

// GET: Fetch all submitted materials (Enhanced with admin features)
router.get('/getdata', async (req, res) => {
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
router.post('/submit', upload.fields([
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

// EXISTING OFFICE ROUTES (Enhanced)

// GET all materials (Enhanced with admin features)
router.get('/materials', async (req, res) => {
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

// POST new material request from office (Enhanced with validation)
router.post('/add_by_office', async (req, res) => {
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

module.exports = router;