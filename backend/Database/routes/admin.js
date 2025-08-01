const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../Database/DB');
const SignUp = require('../models/signup');
const Material = require('../models/shipmentorder');
const Bill = require('../models/bill');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');
const router = express.Router();

// =================================================================
// COMPREHENSIVE DASHBOARD DATA ROUTES
// =================================================================

// Enhanced approval statistics with complete breakdown
router.get('/approval-stats', async (req, res) => {
  try {
    console.log('Fetching comprehensive approval statistics...');

    // User statistics
    const totalUsers = await SignUp.count();
    const totalClients = await SignUp.count({
      where: { type: 'Client' }
    });

    const employeeTypes = [
      'employee', 'officeemp', 'sale_parchase',
      'field_employee', 'office_employee',
      'sale_purchase', 'sales_purchase'
    ];

    const totalEmployees = await SignUp.count({
      where: {
        type: { [Op.in]: employeeTypes }
      }
    });

    const totalPending = await SignUp.count({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { isApproved: false },
              { isApproved: null }
            ]
          },
          {
            [Op.or]: [
              { status: 'pending' },
              { status: 'Pending' },
              { status: 'pending_approval' }
            ]
          },
          {
            type: { [Op.in]: employeeTypes }
          }
        ]
      }
    });

    const totalApproved = await SignUp.count({
      where: {
        isApproved: true,
        [Op.or]: [
          { status: 'approved' },
          { status: 'Approved' }
        ],
        type: { [Op.in]: employeeTypes }
      }
    });

    const totalRejected = await SignUp.count({
      where: {
        [Op.or]: [
          { status: 'rejected' },
          { status: 'Rejected' }
        ],
        type: { [Op.in]: employeeTypes }
      }
    });

    // Order statistics
    const totalOrders = await Material.count({
      where: { role: 'admin' }
    });

    const pendingOrders = await Material.count({
      where: {
        role: 'admin',
        status: 'pending'
      }
    });

    const completedOrders = await Material.count({
      where: {
        role: 'admin',
        status: 'completed'
      }
    });

    const cancelledOrders = await Material.count({
      where: {
        role: 'admin',
        status: 'cancelled'
      }
    });

    // Bill statistics
    const totalBills = await Bill.count();
    const pendingBills = await Bill.count({
      where: { paymentStatus: 'pending' }
    });

    const successfulBills = await Bill.count({
      where: { paymentStatus: 'successful' }
    });

    // Calculate total amounts
    const totalBillAmount = await Bill.sum('totalAmount') || 0;
    const pendingBillAmount = await Bill.sum('totalAmount', {
      where: { paymentStatus: 'pending' }
    }) || 0;

    // Feedback statistics
    const totalFeedback = await Material.count({
      where: { role: 'feedback' }
    });

    const pendingFeedback = await Material.count({
      where: {
        role: 'feedback',
        status: 'submitted'
      }
    });

    const resolvedFeedback = await Material.count({
      where: {
        role: 'feedback',
        status: 'resolved'
      }
    });

    // Calculate average rating
    const feedbackWithRatings = await Material.findAll({
      where: {
        role: 'feedback',
        rating: { [Op.not]: null }
      },
      attributes: ['rating']
    });

    const avgRating = feedbackWithRatings.length > 0 
      ? feedbackWithRatings.reduce((sum, f) => sum + f.rating, 0) / feedbackWithRatings.length 
      : 0;

    // Material/Product statistics
    const totalMaterials = await Material.count({
      where: {
        [Op.or]: [
          { role: 'employee' },
          { role: 'admin' }
        ]
      }
    });

    const submittedMaterials = await Material.count({
      where: {
        [Op.or]: [
          { role: 'employee' },
          { role: 'admin' }
        ],
        status: 'submitted'
      }
    });

    const approvedMaterials = await Material.count({
      where: {
        [Op.or]: [
          { role: 'employee' },
          { role: 'admin' }
        ],
        status: 'approved'
      }
    });

    const rejectedMaterials = await Material.count({
      where: {
        [Op.or]: [
          { role: 'employee' },
          { role: 'admin' }
        ],
        status: 'rejected'
      }
    });

    const stats = {
      users: {
        total: totalUsers,
        clients: totalClients,
        employees: totalEmployees,
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders
      },
      bills: {
        total: totalBills,
        pending: pendingBills,
        successful: successfulBills,
        totalAmount: parseFloat(totalBillAmount),
        pendingAmount: parseFloat(pendingBillAmount)
      },
      feedback: {
        total: totalFeedback,
        pending: pendingFeedback,
        resolved: resolvedFeedback,
        avgRating: Math.round(avgRating * 10) / 10
      },
      materials: {
        total: totalMaterials,
        submitted: submittedMaterials,
        approved: approvedMaterials,
        rejected: rejectedMaterials
      }
    };

    console.log('Dashboard statistics:', stats);

    res.status(200).json({
      success: true,
      message: 'Statistics fetched successfully',
      data: stats
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

// Dashboard overview with recent activities
router.get('/dashboard-overview', async (req, res) => {
  try {
    console.log('Fetching dashboard overview...');

    // Recent activities - get latest materials/orders
    const recentActivities = await Material.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email'],
          required: false
        }
      ],
      attributes: ['id', 'name', 'status', 'role', 'createdAt', 'c_id', 'detail']
    });

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await SignUp.findAll({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      },
      limit: 5,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'fullname', 'email', 'type', 'status', 'createdAt']
    });

    // Recent bills
    const recentBills = await Bill.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email'],
          required: false
        }
      ]
    });

    // System alerts/notifications
    const alerts = [];

    // Check for pending approvals
    const pendingApprovalsCount = await SignUp.count({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { isApproved: false },
              { isApproved: null }
            ]
          },
          {
            [Op.or]: [
              { status: 'pending' },
              { status: 'Pending' },
              { status: 'pending_approval' }
            ]
          }
        ]
      }
    });

    if (pendingApprovalsCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Pending Approvals',
        message: `${pendingApprovalsCount} user(s) waiting for approval`,
        action: 'pending-approvals'
      });
    }

    // Check for overdue bills
    const overdueBills = await Bill.count({
      where: {
        paymentStatus: 'pending',
        dueDate: {
          [Op.lt]: new Date()
        }
      }
    });

    if (overdueBills > 0) {
      alerts.push({
        type: 'error',
        title: 'Overdue Bills',
        message: `${overdueBills} bill(s) are overdue`,
        action: 'overdue-bills'
      });
    }

    // Check for unresolved feedback
    const unresolvedFeedback = await Material.count({
      where: {
        role: 'feedback',
        status: 'submitted'
      }
    });

    if (unresolvedFeedback > 0) {
      alerts.push({
        type: 'info',
        title: 'New Feedback',
        message: `${unresolvedFeedback} feedback(s) need attention`,
        action: 'feedback'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dashboard overview fetched successfully',
      data: {
        recentActivities,
        recentUsers,
        recentBills,
        alerts
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// USER MANAGEMENT ROUTES (Enhanced)
// =================================================================

// Get all users with comprehensive filtering
router.get('/users', async (req, res) => {
  try {
    const {
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search,
      dateFrom,
      dateTo
    } = req.query;

    let whereClause = {};

    // Filter by user type
    if (type && type !== 'all') {
      whereClause.type = type;
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Date range filter
    if (dateFrom && dateTo) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { fullname: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { user_id: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await SignUp.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'fullname', 'email', 'phone', 'type', 'user_id',
        'status', 'isApproved', 'department', 'employeeId',
        'createdAt', 'updatedAt', 'approvedAt', 'rejectedAt',
        'lastLogin', 'approvalNote', 'rejectionReason'
      ]
    });

    // Get user statistics by type
    const userTypeStats = await SignUp.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type']
    });

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: {
        users,
        statistics: userTypeStats,
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
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get pending approval requests with detailed information
router.get('/pending-approvals', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
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
          [Op.or]: [
            { status: 'pending' },
            { status: 'Pending' },
            { status: 'pending_approval' }
          ]
        },
        {
          type: {
            [Op.in]: [
              'employee', 'officeemp', 'sale_parchase',
              'field_employee', 'office_employee',
              'sale_purchase', 'sales_purchase'
            ]
          }
        }
      ]
    };

    if (type && type !== 'all') {
      whereClause[Op.and].push({ type: type });
    }

    const { count, rows: pendingUsers } = await SignUp.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'fullname', 'email', 'phone', 'type', 'user_id',
        'status', 'isApproved', 'department', 'employeeId',
        'createdAt', 'updatedAt', 'submittedAt'
      ]
    });

    // Get approval statistics by type
    const approvalStatsByType = await SignUp.findAll({
      where: {
        type: {
          [Op.in]: [
            'employee', 'officeemp', 'sale_parchase',
            'field_employee', 'office_employee',
            'sale_purchase', 'sales_purchase'
          ]
        }
      },
      attributes: [
        'type',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type', 'status']
    });

    res.status(200).json({
      success: true,
      message: 'Pending approval requests fetched successfully',
      data: {
        pendingUsers,
        statistics: approvalStatsByType,
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

// =================================================================
// FEEDBACK MANAGEMENT ROUTES
// =================================================================

// Get all feedback with client details
router.get('/feedback', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      clientId,
      rating,
      status,
      search
    } = req.query;

    let whereClause = {
      role: 'feedback'
    };

    if (clientId) {
      whereClause.c_id = clientId;
    }

    if (rating) {
      whereClause.rating = parseInt(rating);
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { detail: { [Op.like]: `%${search}%` } },
        { recommendations: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: feedback } = await Material.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'user_id', 'fullname', 'email', 'phone'],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate feedback statistics
    const feedbackStats = {
      total: count,
      avgRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      statusDistribution: {}
    };

    // Get rating distribution
    const ratingStats = await Material.findAll({
      where: { role: 'feedback', rating: { [Op.not]: null } },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('rating')), 'count']
      ],
      group: ['rating']
    });

    ratingStats.forEach(stat => {
      feedbackStats.ratingDistribution[stat.rating] = parseInt(stat.dataValues.count);
    });

    // Calculate average rating
    const totalRatings = Object.values(feedbackStats.ratingDistribution).reduce((a, b) => a + b, 0);
    if (totalRatings > 0) {
      feedbackStats.avgRating = Object.entries(feedbackStats.ratingDistribution)
        .reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0) / totalRatings;
      feedbackStats.avgRating = Math.round(feedbackStats.avgRating * 10) / 10;
    }

    // Get status distribution
    const statusStats = await Material.findAll({
      where: { role: 'feedback' },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('status')), 'count']
      ],
      group: ['status']
    });

    statusStats.forEach(stat => {
      feedbackStats.statusDistribution[stat.status] = parseInt(stat.dataValues.count);
    });

    res.status(200).json({
      success: true,
      message: 'Feedback fetched successfully',
      data: {
        feedback,
        statistics: feedbackStats,
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
// LEGACY ROUTES (for backward compatibility)
// =================================================================

// Legacy counts endpoint
router.get('/counts', async (req, res) => {
  try {
    const usersCount = await SignUp.count();
    const materialsCount = await Material.count();
    const projectsCount = await Bill.count();

    res.status(200).json({
      success: true,
      usersCount,
      materialsCount,
      projectsCount
    });
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Include all other existing routes from the previous admin routes file
// (approve-user, reject-user, update-status, etc.)

// Approve user
router.post('/approve-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId, approvalNote } = req.body;

    console.log(`Attempting to approve user: ${userId}`);

    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { id: userId },
          { user_id: userId }
        ]
      }
    });

    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isApproved) {
      console.log(`User already approved: ${userId}`);
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

    console.log(`User approved successfully: ${user.fullname} (${user.email})`);

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

// Reject user
router.post('/reject-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId, rejectionReason } = req.body;

    console.log(`Attempting to reject user: ${userId}`);

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
        ]
      }
    });

    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved user'
      });
    }

    const updatedUser = await user.update({
      status: 'rejected',
      rejectedBy: adminId || 'admin',
      rejectedAt: new Date(),
      rejectionReason: rejectionReason.trim()
    });

    console.log(`User rejected successfully: ${user.fullname} (${user.email}) - Reason: ${rejectionReason}`);

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

// Update material/order status
router.patch('/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating status for item ${id} to ${status}`);

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'submitted', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const [updatedRowsCount] = await Material.update(
      { status, updatedAt: new Date() },
      { where: { id } }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    const updatedRecord = await Material.findByPk(id, {
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone'],
          required: false
        }
      ]
    });

    console.log(`Status updated successfully for item ${id}`);

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: updatedRecord
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;