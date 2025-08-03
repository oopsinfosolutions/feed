// File: backend/Database/routes/admin.js (Enhanced)

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const SignUp = require('../models/signup');
const Material = require('../models/shipmentorder');
const Bill = require('../models/bill');

// ============================================================================
// ENHANCED ADMIN DASHBOARD ROUTES
// ============================================================================

// GET: Enhanced dashboard overview with comprehensive statistics
router.get('/dashboard-overview', async (req, res) => {
  try {
    console.log('Fetching comprehensive admin dashboard overview...');

    // Parallel data fetching for better performance
    const [
      totalUsers,
      pendingUsers,
      approvedUsers,
      rejectedUsers,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalBills,
      pendingBills,
      paidBills,
      totalRevenue,
      pendingRevenue,
      recentUsers,
      recentOrders,
      recentBills,
      recentActivities,
      feedbackStats
    ] = await Promise.all([
      // User statistics
      SignUp.count(),
      SignUp.count({ where: { status: 'pending' } }),
      SignUp.count({ where: { status: 'approved' } }),
      SignUp.count({ where: { status: 'rejected' } }),
      
      // Order statistics
      Material.count({ where: { role: { [Op.ne]: 'feedback' } } }),
      Material.count({ where: { status: 'pending', role: { [Op.ne]: 'feedback' } } }),
      Material.count({ where: { status: 'completed', role: { [Op.ne]: 'feedback' } } }),
      
      // Bill statistics
      Bill.count(),
      Bill.count({ where: { paymentStatus: 'pending' } }),
      Bill.count({ where: { paymentStatus: 'successful' } }),
      Bill.sum('totalAmount', { where: { paymentStatus: 'successful' } }),
      Bill.sum('totalAmount', { where: { paymentStatus: 'pending' } }),
      
      // Recent data
      SignUp.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'fullname', 'email', 'type', 'status', 'createdAt']
      }),
      Material.findAll({
        limit: 5,
        where: { role: { [Op.ne]: 'feedback' } },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'status', 'createdAt', 'c_id'],
        include: [{
          model: SignUp,
          as: 'Client',
          attributes: ['fullname']
        }]
      }),
      Bill.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{
          model: SignUp,
          as: 'Client',
          attributes: ['fullname']
        }]
      }),
      
      // Recent activities (mock data - implement based on your activity logging)
      Promise.resolve([
        {
          id: 1,
          type: 'user_approval',
          description: 'New user approved',
          timestamp: new Date(),
          severity: 'info'
        }
      ]),
      
      // Feedback statistics
      Material.count({ where: { role: 'feedback' } })
    ]);

    // Calculate growth rates (you can enhance this with historical data)
    const userGrowthRate = pendingUsers > 0 ? ((pendingUsers / Math.max(totalUsers - pendingUsers, 1)) * 100).toFixed(1) : 0;
    const revenueGrowthRate = '12.5'; // Mock data - implement with historical comparison

    // System alerts
    const alerts = [];
    
    if (pendingUsers > 10) {
      alerts.push({
        type: 'warning',
        title: 'High Pending Approvals',
        message: `${pendingUsers} users waiting for approval`,
        action: 'users',
        priority: 'high'
      });
    }
    
    if (pendingBills > 20) {
      alerts.push({
        type: 'info',
        title: 'Pending Payments',
        message: `${pendingBills} bills awaiting payment`,
        action: 'bills',
        priority: 'medium'
      });
    }
    
    if (feedbackStats > 0) {
      alerts.push({
        type: 'info',
        title: 'New Feedback',
        message: `${feedbackStats} feedback(s) received`,
        action: 'feedback',
        priority: 'low'
      });
    }

    const dashboardData = {
      // Key metrics
      keyMetrics: {
        totalUsers: totalUsers || 0,
        totalOrders: totalOrders || 0,
        totalRevenue: totalRevenue || 0,
        activeUsers: approvedUsers || 0
      },
      
      // User statistics
      userStats: {
        total: totalUsers || 0,
        pending: pendingUsers || 0,
        approved: approvedUsers || 0,
        rejected: rejectedUsers || 0,
        growthRate: userGrowthRate
      },
      
      // Order statistics
      orderStats: {
        total: totalOrders || 0,
        pending: pendingOrders || 0,
        completed: completedOrders || 0,
        inProgress: Math.max((totalOrders || 0) - (pendingOrders || 0) - (completedOrders || 0), 0)
      },
      
      // Financial statistics
      financialStats: {
        totalRevenue: totalRevenue || 0,
        pendingRevenue: pendingRevenue || 0,
        totalBills: totalBills || 0,
        paidBills: paidBills || 0,
        pendingBills: pendingBills || 0,
        revenueGrowthRate: revenueGrowthRate
      },
      
      // Recent data
      recentUsers: recentUsers || [],
      recentOrders: recentOrders || [],
      recentBills: recentBills || [],
      recentActivities: recentActivities || [],
      
      // System information
      systemInfo: {
        alerts: alerts,
        lastUpdated: new Date().toISOString(),
        serverStatus: 'healthy',
        databaseStatus: 'connected'
      }
    };

    res.status(200).json({
      success: true,
      message: 'Dashboard overview fetched successfully',
      data: dashboardData
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

// GET: Enhanced user management with comprehensive filtering
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
        { fullname: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { user_id: { [Op.iLike]: `%${search}%` } }
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
      group: ['type'],
      raw: true
    });

    // Get user statistics by status
    const userStatusStats = await SignUp.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: {
        users,
        statistics: {
          byType: userTypeStats,
          byStatus: userStatusStats
        },
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

// Enhanced user approval with detailed logging
router.post('/approve-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId, approvalNote } = req.body;

    console.log(`Admin ${adminId} attempting to approve user: ${userId}`);

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

    console.log(`User approved successfully: ${user.fullname} (${user.email})`);

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: {
        user: updatedUser,
        approvalDetails: {
          approvedBy: adminId || 'admin',
          approvedAt: new Date(),
          note: approvalNote || 'Approved by admin'
        }
      }
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

// Enhanced user rejection
router.post('/reject-user/:userId', async (req, res) => {
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
        ]
      }
    });

    if (!user) {
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

    res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: {
        user: updatedUser,
        rejectionDetails: {
          rejectedBy: adminId || 'admin',
          rejectedAt: new Date(),
          reason: rejectionReason.trim()
        }
      }
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

// ============================================================================
// ENHANCED FEEDBACK MANAGEMENT ROUTES
// ============================================================================

// GET: Admin feedback with comprehensive filtering and statistics
router.get('/feedback', async (req, res) => {
  try { 
    const {
      status,
      rating,
      clientId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search,
      dateFrom,
      dateTo
    } = req.query;

    let whereClause = {
      role: 'feedback'
    };

    // Apply filters
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (rating && rating !== 'all') {
      whereClause.rating = parseInt(rating);
    }

    if (clientId) {
      whereClause.c_id = clientId;
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
    { detail: { [Op.iLike]: `%${search}%` } },
    { recommendations: { [Op.iLike]: `%${search}%` } },
    { '$client.fullname$': { [Op.iLike]: `%${search}%` } },
    { '$client.email$': { [Op.iLike]: `%${search}%` } }
  ];
}

    const offset = (page - 1) * limit;

    const { count, rows: feedback } = await Material.findAndCountAll({
      where: whereClause,
      include: [{
        model: SignUp,
        as: 'Client',
        attributes: ['id', 'user_id', 'fullname', 'email', 'phone'],
        required: false
      }],
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
    console.error('Error fetching admin feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Feedback statistics for admin dashboard
router.get('/feedback/stats', async (req, res) => {
  try {
    const [
      totalFeedback,
      pendingFeedback,
      reviewedFeedback,
      resolvedFeedback,
      averageRating,
      ratingDistribution,
      recentFeedback
    ] = await Promise.all([
      Material.count({ where: { role: 'feedback' } }),
      Material.count({ where: { role: 'feedback', status: 'submitted' } }),
      Material.count({ where: { role: 'feedback', status: 'reviewed' } }),
      Material.count({ where: { role: 'feedback', status: 'resolved' } }),
      
      Material.findOne({
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        where: { role: 'feedback', rating: { [Op.ne]: null } },
        raw: true
      }),
      
      Material.findAll({
        attributes: [
          'rating',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { role: 'feedback', rating: { [Op.ne]: null } },
        group: ['rating'],
        order: [['rating', 'ASC']],
        raw: true
      }),
      
      Material.count({
        where: {
          role: 'feedback',
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    res.status(200).json({
      success: true,
      message: 'Feedback statistics fetched successfully',
      data: {
        total: totalFeedback || 0,
        pending: pendingFeedback || 0,
        reviewed: reviewedFeedback || 0,
        resolved: resolvedFeedback || 0,
        recent: recentFeedback || 0,
        averageRating: parseFloat(averageRating?.avgRating || 0).toFixed(1),
        ratingDistribution: ratingDistribution || []
      }
    });

  } catch (error) {
    console.error('Error fetching feedback statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PATCH: Respond to feedback
router.patch('/feedback/:feedbackId/respond', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { adminResponse, status, respondedBy } = req.body;

    if (!adminResponse || adminResponse.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Admin response is required'
      });
    }

    const feedback = await Material.findOne({
      where: {
        id: feedbackId,
        role: 'feedback'
      }
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const updatedFeedback = await feedback.update({
      adminResponse: adminResponse.trim(),
      status: status || 'reviewed',
      respondedBy: respondedBy || 'admin',
      respondedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Response submitted successfully',
      data: updatedFeedback
    });

  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
