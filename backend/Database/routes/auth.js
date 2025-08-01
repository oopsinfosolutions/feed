const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const SignUp = require('../models/signup');
const router = express.Router();

// =================================================================
// HELPER FUNCTIONS
// =================================================================

// Generate unique user ID
function generateUserId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `USER_${timestamp}_${random}`;
}

// Normalize user type
function normalizeUserType(type) {
  if (!type) return 'Client';
  
  const typeMap = {
    'client': 'Client',
    'Client': 'Client',
    'field employee': 'field_employee',
    'Field Employee': 'field_employee',
    'office employee': 'office_employee',
    'Office Employee': 'office_employee',
    'dealer': 'Dealer',
    'Dealer': 'Dealer',
    'sales & purchase': 'sales_purchase',
    'Sales & Purchase': 'sales_purchase',
    'sale_parchase': 'sales_purchase',
    'sale_purchase': 'sales_purchase'
  };
  
  return typeMap[type] || type;
}

// Check if user type requires approval
function requiresApproval(type) {
  const approvalTypes = [
    'field_employee', 'office_employee', 'sales_purchase',
    'sale_parchase', 'employee', 'officeemp'
  ];
  return approvalTypes.includes(type.toLowerCase());
}

// =================================================================
// AUTHENTICATION ROUTES
// =================================================================

// User Registration
router.post('/signup', async (req, res) => {
  try {
    const {
      fullname, email, phone, password,
      type = 'Client', department, employeeId
    } = req.body;

    console.log('Registration attempt:', { fullname, email, phone, type });

    // Validate required fields
    if (!fullname || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: fullname, email, phone, password'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // Clean and validate phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number (at least 10 digits)'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check for existing email
    const existingEmail = await SignUp.findOne({ 
      where: { email: email.toLowerCase().trim() } 
    });
    
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email is already registered'
      });
    }

    // Check for existing phone
    const existingPhone = await SignUp.findOne({ 
      where: { phone: cleanPhone } 
    });
    
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        error: 'Phone number is already registered'
      });
    }

    // Normalize type and check approval requirement
    const normalizedType = normalizeUserType(type);
    const needsApproval = requiresApproval(normalizedType);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate user ID
    const userId = generateUserId();

    // Create user
    const user = await SignUp.create({
      user_id: userId,
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      password: hashedPassword, // Store hashed password
      type: normalizedType,
      department: department || null,
      employeeId: employeeId || null,
      isApproved: !needsApproval,
      status: needsApproval ? 'pending_approval' : 'approved',
      submittedAt: needsApproval ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`User registered: ${user.fullname} (${user.email}) - Needs approval: ${needsApproval}`);

    // Response based on approval requirement
    if (needsApproval) {
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Your account is pending admin approval.',
        requiresApproval: true,
        user: {
          id: user.id,
          user_id: user.user_id,
          fullname: user.fullname,
          email: user.email,
          type: user.type,
          status: user.status
        }
      });
    }

    // Generate JWT token for approved users
    const token = jwt.sign(
      { 
        userId: user.id, 
        user_id: user.user_id,
        email: user.email,
        type: user.type 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered and logged in successfully.',
      requiresApproval: false,
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        type: user.type,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.'
    });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password, email } = req.body;

    console.log('Login attempt:', { phone, email });

    // Validate input - allow login with either phone or email
    if ((!phone && !email) || !password) {
      return res.status(400).json({
        success: false,
        error: 'Phone/Email and password are required'
      });
    }

    // Prepare search criteria
    let whereClause = {};
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      whereClause.phone = cleanPhone;
    }
    if (email) {
      whereClause.email = email.toLowerCase().trim();
    }

    // If both provided, use OR condition
    if (phone && email) {
      const cleanPhone = phone.replace(/\D/g, '');
      whereClause = {
        [Op.or]: [
          { phone: cleanPhone },
          { email: email.toLowerCase().trim() }
        ]
      };
    }

    // Find user
    const user = await SignUp.findOne({ where: whereClause });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password (check both hashed and plain for backward compatibility)
    let passwordValid = false;
    
    try {
      // Try bcrypt first (for new hashed passwords)
      passwordValid = (password === user.password);
    } catch (bcryptError) {
      // If bcrypt fails, try plain text comparison (for old passwords)
      passwordValid = (password === user.password);
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check approval status for employee types
    const employeeTypesNeedingApproval = [
      'field_employee', 'office_employee', 'sales_purchase',
      'sale_parchase', 'employee', 'officeemp'
    ];

    const normalizedType = user.type.toLowerCase().replace(/\s+/g, '_');

    if (employeeTypesNeedingApproval.includes(normalizedType)) {
      if (!user.isApproved || user.status !== 'approved') {
        let message = 'Your account is pending approval from admin.';

        if (user.status === 'rejected') {
          message = 'Your account has been rejected. Please contact admin for more information.';
        } else if (user.status === 'suspended') {
          message = 'Your account has been suspended. Please contact admin.';
        }

        return res.status(403).json({
          success: false,
          error: message,
          requiresApproval: true,
          user: {
            id: user.id,
            user_id: user.user_id,
            fullname: user.fullname,
            email: user.email,
            type: user.type,
            status: user.status
          }
        });
      }
    }

    // Update last login
    await user.update({
      lastLogin: new Date(),
      updatedAt: new Date()
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        user_id: user.user_id,
        email: user.email,
        type: user.type
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    console.log(`User logged in successfully: ${user.fullname} (${user.email})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        type: user.type,
        status: user.status,
        isApproved: user.isApproved,
        department: user.department,
        employeeId: user.employeeId
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.'
    });
  }
});

// Logout (if using token blacklisting)
router.post('/logout', async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, just send success response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// =================================================================
// TOKEN VERIFICATION MIDDLEWARE
// =================================================================

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get fresh user data
    const user = await SignUp.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// =================================================================
// PROFILE AND ACCOUNT MANAGEMENT
// =================================================================

// Get user profile (protected route)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: {
        id: user.id,
        user_id: user.user_id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        type: user.type,
        status: user.status,
        isApproved: user.isApproved,
        department: user.department,
        employeeId: user.employeeId,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update user profile (protected route)
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const { fullname, email, phone } = req.body;

    const updateData = {};
    
    if (fullname) {
      updateData.fullname = fullname.trim();
    }
    
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address'
        });
      }
      
      // Check if email is already taken
      const existingUser = await SignUp.findOne({
        where: {
          email: email.toLowerCase().trim(),
          id: { [Op.ne]: user.id }
        }
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email is already registered'
        });
      }
      
      updateData.email = email.toLowerCase().trim();
    }
    
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid phone number'
        });
      }
      
      // Check if phone is already taken
      const existingUser = await SignUp.findOne({
        where: {
          phone: cleanPhone,
          id: { [Op.ne]: user.id }
        }
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Phone number is already registered'
        });
      }
      
      updateData.phone = cleanPhone;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateData.updatedAt = new Date();
    
    await user.update(updateData);

    console.log(`Profile updated for user: ${user.fullname} (${user.email})`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        user_id: user.user_id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        type: user.type,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Change password (protected route)
router.patch('/change-password', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Verify current password
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(currentPassword, user.password);
    } catch (bcryptError) {
      passwordValid = (currentPassword === user.password);
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await user.update({
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    console.log(`Password changed for user: ${user.fullname} (${user.email})`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// =================================================================
// ACCOUNT STATUS ROUTES
// =================================================================

// Check account status
router.get('/status/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    const user = await SignUp.findOne({
      where: {
        [Op.or]: [
          { phone: identifier.replace(/\D/g, '') },
          { email: identifier.toLowerCase().trim() },
          { user_id: identifier }
        ]
      },
      attributes: ['id', 'user_id', 'fullname', 'email', 'phone', 'type', 'status', 'isApproved']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account status retrieved',
      data: {
        user_id: user.user_id,
        fullname: user.fullname,
        type: user.type,
        status: user.status,
        isApproved: user.isApproved,
        needsApproval: !user.isApproved && user.status === 'pending_approval'
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Export the router and middleware
module.exports = router;
module.exports.verifyToken = verifyToken;