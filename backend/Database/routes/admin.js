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
// ADMIN APPROVAL WORKFLOW ROUTES
// =================================================================

// Get pending employee approvals with enhanced details
router.get('/pending-employee-approvals', async (req, res) => {
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
router.post('/approve-employee/:userId', async (req, res) => {
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
router.post('/reject-employee/:userId', async (req, res) => {
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

// Legacy approval routes for backward compatibility
router.get('/pending-approvals', async (req, res) => {
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

router.post('/approve-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

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

router.post('/reject-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

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
// DATA MANAGEMENT ROUTES
// =================================================================

// Fetch all data with filtering and sorting options
router.get('/all-data', async (req, res) => {
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
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (source === 'employee') {
      whereClause.image1 = { [Op.not]: null };
    } else if (source === 'office') {
      whereClause.image1 = { [Op.is]: null };
    }
    
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
        'id', 'detail', 'price_per_unit', 'total_price', 'destination',
        'pickup_location', 'drop_location', 'c_id', 'e_id', 'status',
        'image1', 'image2', 'image3', 'video', 'video1', 'video2', 'video3',
        'address', 'pincode', 'latitude', 'longitude', 'name', 'phone',
        'unit', 'quantity', 'offer', 'need_product', 'shipment_date',
        'createdAt', 'updatedAt'
      ]
    });

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

// Update status of material
router.put('/update-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
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

// =================================================================
// STATISTICS AND DASHBOARD ROUTES
// =================================================================

// Get approval statistics for admin dashboard
router.get('/approval-stats', async (req, res) => {
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

// Dashboard overview statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    const usersCount = await SignUp.count();
    const materialsCount = await Material.count();
    const projectsCount = await Material.count({
      where: { status: 'approved' }
    });
    const billsCount = await Bill.count();
    const pendingApprovalsCount = await SignUp.count({
      where: {
        [Op.or]: [
          { isApproved: false },
          { isApproved: null }
        ],
        status: 'pending_approval'
      }
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await SignUp.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    const recentMaterials = await Material.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        counts: {
          users: usersCount || 0,
          materials: materialsCount || 0,
          projects: projectsCount || 0,
          bills: billsCount || 0,
          pendingApprovals: pendingApprovalsCount || 0
        },
        recent: {
          users: recentUsers || 0,
          materials: recentMaterials || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// System statistics
router.get('/system-stats', async (req, res) => {
  try {
    // Users by type
    const usersByType = await SignUp.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type']
    });

    // Materials by status
    const materialsByStatus = await Material.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Bills by payment status
    const billsByStatus = await Bill.findAll({
      attributes: [
        'paymentStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['paymentStatus']
    });

    // Monthly growth (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyGrowth = await SignUp.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: twelveMonthsAgo
        }
      },
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: {
        usersByType,
        materialsByStatus,
        billsByStatus,
        monthlyGrowth
      }
    });

  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Legacy counts route for backward compatibility
router.get('/counts', async (req, res) => {
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

module.exports = router;