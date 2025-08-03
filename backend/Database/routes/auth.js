const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const SignUp = require('../models/signup');
const router = express.Router();

console.log('✅ auth.js loaded at:', __filename);

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

    // Validate and clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 10-digit phone number'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await SignUp.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase().trim() },
          { phone: cleanPhone }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email or phone already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Normalize user type
    const normalizedType = normalizeUserType(type);
    const needsApproval = requiresApproval(normalizedType);

    // Create new user
    const newUser = await SignUp.create({
      user_id: generateUserId(),
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      password: hashedPassword,
      type: normalizedType,
      department: department || null,
      employeeId: employeeId || null,
      status: needsApproval ? 'pending_approval' : 'active',
      isApproved: !needsApproval,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`User registered: ${newUser.fullname} (${newUser.email})`);

    // Generate JWT token only if approved
    let token = null;
    if (!needsApproval) {
      token = jwt.sign(
        {
          userId: newUser.id,
          user_id: newUser.user_id,
          email: newUser.email,
          type: newUser.type
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );
    }

    res.status(201).json({
      success: true,
      message: needsApproval 
        ? 'Registration successful! Your account is pending approval.'
        : 'Registration successful!',
      requiresApproval: needsApproval,
      token,
      user: {
        id: newUser.id,
        user_id: newUser.user_id,
        fullname: newUser.fullname,
        email: newUser.email,
        phone: newUser.phone,
        type: newUser.type,
        status: newUser.status
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
    
    const { identifier, password, phone, email } = req.body;

    // Support both old format (phone/email) and new format (identifier)
    const loginIdentifier = identifier || phone || email;

    // Enhanced validation with better logging
    if (!loginIdentifier || !password) {
      console.log('❌ Validation failed: Missing identifier or password');
      return res.status(400).json({
        success: false,
        error: 'Phone/Email and password are required'
      });
    }

    // Prepare search criteria
    let whereClause = {};
    
    // Check if identifier looks like an email
    if (loginIdentifier.includes('@')) {
      whereClause.email = loginIdentifier.toLowerCase().trim();
      console.log('🔍 Searching by email:', loginIdentifier.toLowerCase().trim());
    } else {
      // Assume it's a phone number
      const cleanPhone = loginIdentifier.replace(/\D/g, '');
      whereClause.phone = cleanPhone;
      console.log('🔍 Searching by phone:', cleanPhone);
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

    // Find user
    console.log('🔍 Searching for user...');
    const user = await SignUp.findOne({ where: whereClause });

    if (!user) {
      console.log('❌ User not found with criteria:', whereClause);
      return res.status(401).json({
        success: false,
        error: 'Invalid phone/email or password'
      });
    }

    console.log('✅ User found:', {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      type: user.type,
      status: user.status,
      isApproved: user.isApproved
    });

    // Verify password
    console.log('🔐 Verifying password...');
console.log('🔍 Stored password:', user.password);
console.log('🔍 Provided password:', password);
console.log('🔍 Password type check:', {
  isBcrypt: user.password.startsWith('$2a$') || user.password.startsWith('$2b$'),
  length: user.password.length,
  firstChars: user.password.substring(0, 10)
});

let passwordValid = false;

try {
  // Check if password is bcrypt hashed
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
    console.log('🔐 Using bcrypt verification (hashed password)...');
    passwordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 BCrypt result:', passwordValid);
  } else {
    console.log('🔐 Using plain text comparison (legacy password)...');
    passwordValid = (password === user.password);
    console.log('🔐 Plain text result:', passwordValid);
    
    // If password matches and it's plain text, hash it for future use
    if (passwordValid) {
      console.log('🔄 Converting plain text password to bcrypt hash...');
      const hashedPassword = await bcrypt.hash(password, 10);
      await user.update({ password: hashedPassword });
      console.log('✅ Password converted to bcrypt hash');
    }
  }
  
  console.log('🔐 Final password verification result:', passwordValid);
} catch (bcryptError) {
  console.error('❌ Password verification error:', bcryptError);
  // Fallback to plain text comparison
  console.log('🔄 Falling back to plain text comparison...');
  passwordValid = (password === user.password);
  console.log('🔐 Fallback result:', passwordValid);
}

if (!passwordValid) {
  console.log('❌ Password verification failed');
  console.log('📊 Debug info:', {
    providedPassword: password,
    storedPassword: user.password,
    bcryptCheck: user.password.startsWith('$2a$') || user.password.startsWith('$2b$'),
    plainTextMatch: password === user.password
  });
  
  return res.status(401).json({
    success: false,
    error: 'Invalid phone/email or password'
  });
}

    // Check if user is approved (for employee types)
    if (requiresApproval(user.type)) {
      if (!user.isApproved || user.status !== 'active') {
        let message = 'Your account is pending approval. Please contact the administrator.';

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

    // Update last login
    try {
      console.log('📅 Updating last login...');
      await user.update({
        lastLogin: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Last login updated');
    } catch (updateError) {
      console.error('⚠️  Warning: Failed to update last login:', updateError);
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

// Logout
router.post('/logout', async (req, res) => {
  try {
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

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
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

// Get user profile
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

// Update user profile
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
      updateData.email = email.toLowerCase().trim();
    }
    
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid 10-digit phone number'
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

// Change password
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

// Log routes after they are defined
console.log('🔍 Auth routes defined:');
console.log('   POST /api/auth/signup');
console.log('   POST /api/auth/login');
console.log('   POST /api/auth/logout');
console.log('   GET /api/auth/profile');
console.log('   PATCH /api/auth/profile');
console.log('   PATCH /api/auth/change-password');
console.log('   GET /api/auth/status/:identifier');

// Export the router and middleware
router.verifyToken = verifyToken;
module.exports = router;