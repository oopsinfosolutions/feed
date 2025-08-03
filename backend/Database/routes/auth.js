const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const SignUp = require('../models/signup');
const router = express.Router();

console.log('✅ auth.js loaded at:', __filename);
console.log('🔍 Auth routes defined:');
router.stack.forEach(layer => {
  console.log(`   ${layer.route.stack[0].method.toUpperCase()} /api/auth${layer.route.path}`);
});

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
    console.log('\n🔄 === LOGIN ATTEMPT STARTED ===');
    console.log('📨 Request body:', req.body);
    console.log('📍 Request headers:', req.headers);
    
    const { phone, password, email } = req.body;

    // Enhanced validation with better logging
    if ((!phone && !email) || !password) {
      console.log('❌ Validation failed: Missing phone/email or password');
      return res.status(400).json({
        success: false,
        error: 'Phone/Email and password are required'
      });
    }

    // Prepare search criteria with logging
    let whereClause = {};
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      whereClause.phone = cleanPhone;
      console.log('🔍 Searching by phone:', cleanPhone);
    }
    if (email) {
      whereClause.email = email.toLowerCase().trim();
      console.log('🔍 Searching by email:', email.toLowerCase().trim());
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
      console.log('🔍 Searching with OR condition:', whereClause);
    }

    console.log('🔍 Final where clause:', JSON.stringify(whereClause, null, 2));

    // Test database connection first
    try {
      console.log('🗄️  Testing database connection...');
      await SignUp.findOne({ limit: 1 });
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database connection error'
      });
    }

    // Find user with enhanced logging
    console.log('🔍 Searching for user...');
    const user = await SignUp.findOne({ where: whereClause });

    if (!user) {
      console.log('❌ User not found with criteria:', whereClause);
      
      // Debug: Show what users exist (be careful in production!)
      const allUsers = await SignUp.findAll({ 
        attributes: ['id', 'phone', 'email', 'fullname'],
        limit: 5 
      });
      console.log('📊 Sample users in database:', allUsers.map(u => ({
        id: u.id,
        phone: u.phone,
        email: u.email,
        fullname: u.fullname
      })));
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    console.log('✅ User found:', {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullname: user.fullname,
      type: user.type,
      isApproved: user.isApproved,
      status: user.status
    });

    // Enhanced password verification with logging
    console.log('🔐 Verifying password...');
    let passwordValid = false;
    
    try {
      // First try bcrypt (for hashed passwords)
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        console.log('🔐 Using bcrypt verification...');
        passwordValid = await bcrypt.compare(password, user.password);
      } else {
        console.log('🔐 Using plain text comparison...');
        passwordValid = (password === user.password);
      }
      
      console.log('🔐 Password verification result:', passwordValid);
    } catch (passwordError) {
      console.error('❌ Password verification error:', passwordError);
      return res.status(500).json({
        success: false,
        error: 'Password verification failed'
      });
    }

    if (!passwordValid) {
      console.log('❌ Invalid password for user:', user.email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check approval status with enhanced logging
    console.log('✅ Password valid, checking approval status...');
    const employeeTypesNeedingApproval = [
      'field_employee', 'office_employee', 'sales_purchase',
      'sale_parchase', 'employee', 'officeemp'
    ];

    const normalizedType = user.type.toLowerCase().replace(/\s+/g, '_');
    console.log('👤 User type (normalized):', normalizedType);
    console.log('🔒 Needs approval:', employeeTypesNeedingApproval.includes(normalizedType));
    console.log('✅ Is approved:', user.isApproved);
    console.log('📊 Status:', user.status);

    if (employeeTypesNeedingApproval.includes(normalizedType)) {
      if (!user.isApproved || user.status !== 'approved') {
        let message = 'Your account is pending approval from admin.';

        if (user.status === 'rejected') {
          message = 'Your account has been rejected. Please contact admin for more information.';
        } else if (user.status === 'suspended') {
          message = 'Your account has been suspended. Please contact admin.';
        }

        console.log(`❌ User not approved: ${message}`);
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

    // Update last login with error handling
    try {
      console.log('📅 Updating last login...');
      await user.update({
        lastLogin: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Last login updated');
    } catch (updateError) {
      console.error('⚠️  Warning: Failed to update last login:', updateError);
      // Don't fail the login for this
    }

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
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

    console.log('✅ JWT token generated');
    console.log(`🎉 Login successful for: ${user.fullname} (${user.email})`);
    console.log('=== LOGIN ATTEMPT COMPLETED ===\n');

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
    console.error('\n❌ === LOGIN ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== END LOGIN ERROR ===\n');
    
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
console.log('🔍 Auth routes defined:');
router.stack.forEach(layer => {
  console.log(`   ${layer.route.stack[0].method.toUpperCase()} /api/auth${layer.route.path}`);
});

// Export the router and middleware
router.verifyToken = verifyToken;
module.exports = router;
