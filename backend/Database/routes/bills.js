const express = require('express');
const { Op } = require('sequelize');
const Bill = require('../models/bill');
const Material = require('../models/shipmentorder');
const SignUp = require('../models/signup');
const router = express.Router();

// Helper function to generate bill number
function generateBillNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `BILL-${timestamp}-${random}`;
}

// =================================================================
// BILL MANAGEMENT ROUTES
// =================================================================

// Send bill for order
router.post('/orders/:orderId/send-bill', async (req, res) => {
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
router.get('/admin', async (req, res) => {
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

    // Search functionality - FIXED
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
router.get('/admin/:billId', async (req, res) => {
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
router.patch('/admin/:billId/payment', async (req, res) => {
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
router.get('/client/:clientId', async (req, res) => {
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
router.get('/client/bill/:billId', async (req, res) => {
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
router.patch('/client/:billId/payment', async (req, res) => {
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
// STATISTICS AND UTILITY ROUTES
// =================================================================

// GET: Dashboard statistics for bills
router.get('/stats/overview', async (req, res) => {
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

// GET: Revenue analytics
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;

    let dateGrouping;
    if (period === 'daily') {
      dateGrouping = 'DATE(createdAt)';
    } else if (period === 'weekly') {
      dateGrouping = 'WEEK(createdAt)';
    } else {
      dateGrouping = 'MONTH(createdAt)';
    }

    const revenueData = await Bill.findAll({
      attributes: [
        [Bill.sequelize.fn('DATE_FORMAT', Bill.sequelize.col('createdAt'), '%Y-%m'), 'period'],
        [Bill.sequelize.fn('SUM', Bill.sequelize.col('totalAmount')), 'revenue'],
        [Bill.sequelize.fn('COUNT', Bill.sequelize.col('id')), 'billCount']
      ],
      where: {
        paymentStatus: 'successful',
        createdAt: {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59)
          ]
        }
      },
      group: [Bill.sequelize.fn('DATE_FORMAT', Bill.sequelize.col('createdAt'), '%Y-%m')],
      order: [[Bill.sequelize.fn('DATE_FORMAT', Bill.sequelize.col('createdAt'), '%Y-%m'), 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: revenueData
    });

  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Outstanding bills report
router.get('/reports/outstanding', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: outstandingBills } = await Bill.findAndCountAll({
      where: {
        paymentStatus: 'pending',
        dueDate: {
          [Op.lt]: new Date()
        }
      },
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone']
        }
      ],
      order: [['dueDate', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalOutstanding = await Bill.sum('totalAmount', {
      where: {
        paymentStatus: 'pending',
        dueDate: {
          [Op.lt]: new Date()
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        bills: outstandingBills,
        totalOutstanding: totalOutstanding || 0,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + outstandingBills.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching outstanding bills:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE: Delete bill (Admin only)
router.delete('/:billId', async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await Bill.findByPk(billId);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Check if bill can be deleted (e.g., not if payment is successful)
    if (bill.paymentStatus === 'successful') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bill with successful payment'
      });
    }

    await bill.destroy();

    res.status(200).json({
      success: true,
      message: 'Bill deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;