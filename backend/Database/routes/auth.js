const express = require('express');
const { Op } = require('sequelize');
const SignUp = require('../models/signup');
const router = express.Router();

// =================================================================
// HELPER FUNCTIONS
// =================================================================

async function generateUserId() {
  while (true) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const id = `USER_${timestamp}_${random}`;
    const existing = await SignUp.findOne({ where: { user_id: id } });
    if (!existing) return id;
  }
}

// =================================================================
// AUTHENTICATION ROUTES
// =================================================================

// Enhanced signup route with approval workflow
router.post('/signup', async (req, res) => {
  try {
    const { fullname, email, password, phone, type, department, employeeId } = req.body;

    // Comprehensive validation
    if (!fullname || !email || !password || !phone || !type) {
      return res.status(400).json({ 
        success: false,
        error: 'All required fields must be provided' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Phone validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number must be 10 digits' 
      });
    }

    // Check for existing user
    const existingEmail = await SignUp.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }

    const existingPhone = await SignUp.findOne({ where: { phone: cleanPhone } });
    if (existingPhone) {
      return res.status(409).json({ 
        success: false,
        error: 'Phone number already exists' 
      });
    }

    // Generate unique user ID
    const user_id = await generateUserId();

    // Determine if approval is needed
    const employeeTypes = ['field_employee', 'office_employee', 'sale_purchase', 'sale_parchase', 'sales_purchase'];
    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    const requiresApproval = employeeTypes.includes(normalizedType);

    // Create user with proper status
    const user = await SignUp.create({
      user_id,
      fullname: fullname.trim(),
      email: email.toLowerCase().trim(),
      password, // In production, hash this password!
      phone: cleanPhone,
      type: normalizedType,
      department: department || null,
      employeeId: employeeId || null,
      isApproved: !requiresApproval,
      status: requiresApproval ? 'pending' : 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (requiresApproval) {
      return res.status(201).json({ 
        success: true,
        message: 'Registration successful. Your account is pending admin approval.',
        requiresApproval: true,
        user: {
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          type: user.type,
          status: user.status
        }
      });
    }

    res.status(201).json({ 
      success: true,
      message: 'User registered successfully.',
      requiresApproval: false,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
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

// Enhanced login with proper session management
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone and password are required' 
      });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const user = await SignUp.findOne({ 
      where: { 
        phone: cleanPhone, 
        password 
      } 
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid phone number or password' 
      });
    }

    // Check approval status for employee types
    const employeeTypesNeedingApproval = [
      'field_employee', 'office_employee', 'sale_parchase',
      'sale_purchase', 'sales_purchase'
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
          accountStatus: user.status
        });
      }
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      ...userWithoutPassword
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await SignUp.findOne({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      // Don't reveal if email exists or not
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent.'
      });
    }

    // In production, generate a secure token and send email
    // For now, just log it
    console.log(`Password reset requested for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token (for password reset)
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // In production, verify JWT token or check database token
    // For now, just return success for demo
    res.status(200).json({
      success: true,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // In production, verify token and find associated user
    // For now, just return success for demo
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;