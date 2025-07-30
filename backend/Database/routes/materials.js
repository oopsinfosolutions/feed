const express = require('express');
const { Op } = require('sequelize');
const Material = require('../models/shipmentorder');
const SignUp = require('../models/signup');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Helper function to generate product user ID
function generateProductUserId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `PROD_${timestamp}_${random}`;
}

// =================================================================
// MATERIAL/DATA MANAGEMENT ROUTES
// =================================================================

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

// POST: Submit material data
router.post('/submit', async (req, res) => {
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
      image1: req.files && req.files['image1'] ? req.files['image1'][0].filename : null,
      image2: req.files && req.files['image2'] ? req.files['image2'][0].filename : null,
      image3: req.files && req.files['image3'] ? req.files['image3'][0].filename : null,
      video1: req.files && req.files['video1'] ? req.files['video1'][0].filename : null,
      video2: req.files && req.files['video2'] ? req.files['video2'][0].filename : null,
      video3: req.files && req.files['video3'] ? req.files['video3'][0].filename : null,
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
// EMPLOYEE DATA ROUTES
// =================================================================

// Enhanced employee material submission with file metadata
router.post('/employee-details', async (req, res) => {
  try {
    const { name, phone, address, pincode, latitude, longitude, detail, employeeId, employeeName } = req.body;

    if (!name || !phone || !address || !detail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, phone, address, detail'
      });
    }

    const userId = employeeId || 'EMP-' + Math.floor(100000 + Math.random() * 900000);

    // Process file information with sizes
    const fileData = {};
    const allowedFields = ['image1', 'image2', 'image3', 'video1', 'video2', 'video3'];
    
    allowedFields.forEach(field => {
      if (req.files && req.files[field] && req.files[field][0]) {
        const file = req.files[field][0];
        fileData[field] = file.filename;
        fileData[`${field}_size`] = file.size;
        fileData[`${field}_type`] = file.mimetype;
        fileData[`${field}_original_name`] = file.originalname;
      }
    });

    const material = await Material.create({
      userId,
      role: 'employee',
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      address: address.trim(),
      pincode: pincode || null,
      latitude: latitude || null,
      longitude: longitude || null,
      detail: detail.trim(),
      employeeId: employeeId || null,
      employeeName: employeeName || name.trim(),
      ...fileData,
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Employee material submitted successfully',
      data: material
    });

  } catch (error) {
    console.error('Error submitting employee material:', error);
    
    // Clean up uploaded files if database operation fails
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

// Enhanced get employee details with employee info
router.get('/employee-details', async (req, res) => {
  try {
    const { employeeId, status, page = 1, limit = 50 } = req.query;
    
    let whereClause = { role: 'employee' };
    
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: data } = await Material.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'userId', 'employeeId', 'employeeName', 'name', 'phone', 
        'address', 'pincode', 'latitude', 'longitude', 'detail', 
        'image1', 'image1_size', 'image1_type', 'image1_original_name',
        'image2', 'image2_size', 'image2_type', 'image2_original_name',
        'image3', 'image3_size', 'image3_type', 'image3_original_name',
        'video1', 'video1_size', 'video1_type', 'video1_original_name',
        'video2', 'video2_size', 'video2_type', 'video2_original_name',
        'video3', 'video3_size', 'video3_type', 'video3_original_name',
        'status', 'createdAt', 'updatedAt'
      ]
    });

    res.status(200).json({ 
      success: true, 
      data,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        hasNext: offset + data.length < count,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Error fetching employee data:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching employee data', 
      error: err.message 
    });
  }
});

// =================================================================
// OFFICE EMPLOYEE ROUTES
// =================================================================

// Enhanced office employee routes
router.post('/office-details', async (req, res) => {
  try {
    const { name, phone, address, detail, employeeId, employeeName } = req.body;

    if (!name || !phone || !address || !detail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, phone, address, detail'
      });
    }

    const userId = employeeId || 'OFFICE-' + Math.floor(100000 + Math.random() * 900000);

    const material = await Material.create({
      userId,
      role: 'office',
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      address: address.trim(),
      detail: detail.trim(),
      employeeId: employeeId || null,
      employeeName: employeeName || name.trim(),
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Office employee request submitted successfully',
      data: material
    });

  } catch (error) {
    console.error('Error creating office material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Enhanced office employee edit functionality
router.put('/update-details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, detail } = req.body;

    if (!name || !phone || !address || !detail) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const material = await Material.findOne({
      where: { id, role: 'office' }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Office employee request not found'
      });
    }

    await material.update({
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      address: address.trim(),
      detail: detail.trim(),
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      data: material
    });

  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.get('/view-details', async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    
    let whereClause = { role: 'office' };
    
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const data = await Material.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      attributes: [
        'id', 'userId', 'employeeId', 'employeeName', 'name', 'phone', 
        'address', 'detail', 'status', 'createdAt', 'updatedAt'
      ]
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

// Legacy routes for backward compatibility
router.post('/add_details', async (req, res) => {
  try {
    let { userId, name, address, phone, detail } = req.body;

    if (!userId) {
      userId = generateProductUserId();
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

router.get('/view_details', async (req, res) => {
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

// =================================================================
// COMBINED EMPLOYEE DATA ROUTES
// =================================================================

// Admin sees both employees data
router.get('/both-employees', async (req, res) => {
  try {
    const allData = await Material.findAll({ 
      order: [['createdAt', 'DESC']] 
    });

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
// UTILITY ROUTES
// =================================================================

// Update material status by ID
router.put('/:id', async (req, res) => {
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

// Delete material by ID
router.delete('/:id', async (req, res) => {
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

// Get material by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findByPk(id, {
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone'],
          required: false
        }
      ]
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.status(200).json({
      success: true,
      data: material
    });

  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Search materials
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const whereClause = {
      [Op.or]: [
        { name: { [Op.like]: `%${q}%` } },
        { address: { [Op.like]: `%${q}%` } },
        { detail: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } }
      ]
    };

    const offset = (page - 1) * limit;
    const { count, rows: materials } = await Material.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: materials,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        hasNext: offset + materials.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error searching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;