const express = require('express');
const { Op } = require('sequelize');
const SignUp = require('../models/signup');
const router = express.Router();

// =================================================================
// USER MANAGEMENT ROUTES
// =================================================================

// Enhanced get users with employee details
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      type, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC' 
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
      attributes: [
        'id', 'user_id', 'fullname', 'email', 'phone', 'type', 
        'department', 'employeeId', 'isApproved', 'status', 
        'createdAt', 'updatedAt', 'lastLoginAt'
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        hasNext: offset + users.length < count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users',
      error: 'Failed to fetch users' 
    });
  }
});

// Get single user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { user_id: userId },
          { id: userId }
        ]
      },
      attributes: [
        'id', 'user_id', 'fullname', 'email', 'phone', 'type', 
        'department', 'employeeId', 'isApproved', 'status', 
        'createdAt', 'updatedAt', 'lastLoginAt'
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Enhanced update user route
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullname, email, password, phone, type, department, employeeId } = req.body;

    // Validate required fields
    if (!fullname || !email || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and phone are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address!' 
      });
    }

    // Phone validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid 10-digit phone number!' 
      });
    }

    // Password validation (only if password is provided)
    if (password && password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long!' 
      });
    }

    // Find user
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
        message: 'User not found' 
      });
    }

    // Check for email conflicts (exclude current user)
    if (email !== user.email) {
      const existingEmail = await SignUp.findOne({ 
        where: { 
          email: email.toLowerCase().trim(),
          id: { [Op.ne]: user.id }
        } 
      });
      
      if (existingEmail) {
        return res.status(409).json({ 
          success: false,
          message: 'Email already exists' 
        });
      }
    }

    // Check for phone conflicts (exclude current user)
    if (cleanPhone !== user.phone) {
      const existingPhone = await SignUp.findOne({ 
        where: { 
          phone: cleanPhone,
          id: { [Op.ne]: user.id }
        } 
      });
      
      if (existingPhone) {
        return res.status(409).json({ 
          success: false,
          message: 'Phone number already exists' 
        });
      }
    }

    // Prepare update data
    const updateData = {
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      type: type ? type.toLowerCase().replace(/\s+/g, '_') : user.type,
      department: department || user.department,
      employeeId: employeeId || user.employeeId,
      updatedAt: new Date()
    };

    // Only update password if provided
    if (password) {
      updateData.password = password; // In production, hash this!
    }

    // Update user
    await user.update(updateData);

    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Enhanced delete user route
router.delete('/:userId', async (req, res) => {
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
      message: 'Internal server error' 
    });
  }
});

// Bulk operations
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action and userIds array are required'
      });
    }

    let result;
    switch (action) {
      case 'delete':
        result = await SignUp.destroy({
          where: {
            [Op.or]: [
              { id: { [Op.in]: userIds } },
              { user_id: { [Op.in]: userIds } }
            ]
          }
        });
        break;
      case 'approve':
        result = await SignUp.update(
          { isApproved: true, status: 'approved' },
          {
            where: {
              [Op.or]: [
                { id: { [Op.in]: userIds } },
                { user_id: { [Op.in]: userIds } }
              ]
            }
          }
        );
        break;
      case 'reject':
        result = await SignUp.update(
          { status: 'rejected' },
          {
            where: {
              [Op.or]: [
                { id: { [Op.in]: userIds } },
                { user_id: { [Op.in]: userIds } }
              ]
            }
          }
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      affectedRows: Array.isArray(result) ? result[0] : result
    });

  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalUsers = await SignUp.count();
    const activeUsers = await SignUp.count({ where: { status: 'approved' } });
    const pendingUsers = await SignUp.count({ where: { status: 'pending' } });
    const rejectedUsers = await SignUp.count({ where: { status: 'rejected' } });

    // Users by type
    const usersByType = await SignUp.findAll({
      attributes: [
        'type',
        [SignUp.sequelize.fn('COUNT', SignUp.sequelize.col('id')), 'count']
      ],
      group: ['type']
    });

    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRegistrations = await SignUp.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totals: {
          total: totalUsers,
          active: activeUsers,
          pending: pendingUsers,
          rejected: rejectedUsers
        },
        byType: usersByType,
        recentRegistrations
      }
    });

  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;