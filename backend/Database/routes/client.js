const express = require('express');
const { Op } = require('sequelize');
const Bill = require('../models/bill');
const Material = require('../models/shipmentorder');
const SignUp = require('../models/signup');
const router = express.Router();

// =================================================================
// CLIENT BILL MANAGEMENT ROUTES
// =================================================================

// Get client bills with enhanced filtering
router.get('/bills/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search
    } = req.query;

    console.log(`Fetching bills for client: ${clientId}`);

    // Verify client exists
    const client = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: clientId },
          { user_id: clientId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    let whereClause = {
      clientId: client.id // Use the actual database ID
    };

    // Filter by payment status
    if (status && status !== 'all') {
      whereClause.paymentStatus = status;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { billNumber: { [Op.like]: `%${search}%` } },
        { materialName: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: bills } = await Bill.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'Order',
          attributes: ['id', 'name', 'status'],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate statistics
    const stats = {
      total: count,
      pending: bills.filter(bill => bill.paymentStatus === 'pending').length,
      successful: bills.filter(bill => bill.paymentStatus === 'successful').length,
      totalAmount: bills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0),
      pendingAmount: bills
        .filter(bill => bill.paymentStatus === 'pending')
        .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || 0), 0)
    };

    console.log(`Found ${count} bills for client ${clientId}`);

    res.status(200).json({
      success: true,
      message: 'Bills fetched successfully',
      data: {
        bills,
        stats,
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

// Get single bill details for client
router.get('/bill/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const { clientId } = req.query;

    console.log(`Fetching bill details: ${billId} for client: ${clientId}`);

    let whereClause = { id: billId };

    // If clientId is provided, verify ownership
    if (clientId) {
      const client = await SignUp.findOne({
        where: {
          [Op.or]: [
            { id: clientId },
            { user_id: clientId }
          ]
        }
      });

      if (client) {
        whereClause.clientId = client.id;
      }
    }

    const bill = await Bill.findOne({
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
          attributes: ['id', 'name', 'status', 'image1', 'image2', 'image3']
        }
      ]
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found or access denied'
      });
    }

    console.log(`Bill details found: ${bill.billNumber}`);

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

// =================================================================
// CLIENT ORDER/MATERIAL MANAGEMENT ROUTES
// =================================================================

// Get client orders/materials
router.get('/orders/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search
    } = req.query;

    console.log(`Fetching orders for client: ${clientId}`);

    // Verify client exists
    const client = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: clientId },
          { user_id: clientId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    let whereClause = {
      c_id: client.id // Use the actual database ID
    };

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { detail: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Material.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'Bill',
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`Found ${count} orders for client ${clientId}`);

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
    console.error('Error fetching client orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// CLIENT PROFILE MANAGEMENT
// =================================================================

// Get client profile
router.get('/profile/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    console.log(`Fetching profile for client: ${clientId}`);

    const client = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: clientId },
          { user_id: clientId }
        ]
      },
      attributes: [
        'id', 'user_id', 'fullname', 'email', 'phone', 'type',
        'status', 'isApproved', 'createdAt', 'updatedAt'
      ]
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get client statistics
    const orderCount = await Material.count({
      where: { c_id: client.id }
    });

    const billCount = await Bill.count({
      where: { clientId: client.id }
    });

    const pendingBills = await Bill.count({
      where: {
        clientId: client.id,
        paymentStatus: 'pending'
      }
    });

    const totalAmount = await Bill.sum('totalAmount', {
      where: { clientId: client.id }
    }) || 0;

    const pendingAmount = await Bill.sum('totalAmount', {
      where: {
        clientId: client.id,
        paymentStatus: 'pending'
      }
    }) || 0;

    const profileData = {
      ...client.toJSON(),
      statistics: {
        totalOrders: orderCount,
        totalBills: billCount,
        pendingBills,
        totalAmount: parseFloat(totalAmount),
        pendingAmount: parseFloat(pendingAmount)
      }
    };

    console.log(`Profile found for client: ${client.fullname}`);

    res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: profileData
    });

  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update client profile
router.patch('/profile/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { fullname, email, phone } = req.body;

    console.log(`Updating profile for client: ${clientId}`);

    const client = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: clientId },
          { user_id: clientId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if email is already taken by another user
    if (email && email !== client.email) {
      const existingUser = await SignUp.findOne({
        where: {
          email,
          id: { [Op.ne]: client.id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }

    // Update client information
    const updateData = {};
    if (fullname) updateData.fullname = fullname.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone.replace(/\D/g, '');
    updateData.updatedAt = new Date();

    await client.update(updateData);

    console.log(`Profile updated for client: ${client.fullname}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: client
    });

  } catch (error) {
    console.error('Error updating client profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// CLIENT FEEDBACK ROUTES
// =================================================================

// Submit feedback
router.post('/feedback', async (req, res) => {
  try {
    const {
      clientId, billId, orderId, rating, feedbackText,
      serviceQuality, deliveryTime, productQuality,
      overallSatisfaction, recommendations
    } = req.body;

    console.log(`Submitting feedback from client: ${clientId}`);

    // Validate required fields
    if (!clientId || !rating || !feedbackText) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, rating, and feedback text are required'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Verify client exists
    const client = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: clientId },
          { user_id: clientId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Create feedback record in Material table (as per existing structure)
    const feedback = await Material.create({
      userId: `FEEDBACK_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      c_id: client.id,
      orderId: orderId || null,
      role: 'feedback',
      name: 'Client Feedback',
      detail: feedbackText.trim(),
      rating: parseInt(rating),
      serviceQuality: serviceQuality || null,
      deliveryTime: deliveryTime || null,
      productQuality: productQuality || null,
      overallSatisfaction: overallSatisfaction || null,
      recommendations: recommendations ? recommendations.trim() : null,
      billId: billId || null,
      status: 'submitted',
      productType: 'feedback',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`Feedback submitted successfully: ${feedback.id}`);

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

// Get client feedback history
router.get('/feedback/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    console.log(`Fetching feedback history for client: ${clientId}`);

    // Verify client exists
    const client = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: clientId },
          { user_id: clientId }
        ]
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const offset = (page - 1) * limit;

    const { count, rows: feedback } = await Material.findAndCountAll({
      where: {
        c_id: client.id,
        role: 'feedback'
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`Found ${count} feedback records for client ${clientId}`);

    res.status(200).json({
      success: true,
      message: 'Feedback history fetched successfully',
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
    console.error('Error fetching feedback history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;