const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../Database/DB');
const Customer = require('../models/Customer');
const SalesOrder = require('../models/SalesOrder');
const SignUp = require('../models/signup');
const router = express.Router();

// =================================================================
// CUSTOMER MANAGEMENT ROUTES
// =================================================================

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      customerType,
      isActive = true
    } = req.query;

    let whereClause = {
      role: 'sales_purchase',
      type: 'customer_entry'
    };

    // Add filters
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (customerType) {
      whereClause.customerType = customerType;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { customerName: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows: customers } = await Customer.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: SignUp,
          as: 'user',
          attributes: ['id', 'fullname'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new customer
router.post('/customers', async (req, res) => {
  try {
    const {
      customerName,
      phoneNumber,
      email,
      alternatePhone,
      address,
      city,
      state,
      pincode,
      gstin,
      customerType = 'individual',
      creditLimit,
      paymentTerms = 30,
      contactPerson,
      website,
      businessCategory,
      notes,
      createdBy
    } = req.body;

    // Validation
    if (!customerName || !phoneNumber || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: customerName, phoneNumber, address, city, state, pincode'
      });
    }

    // Phone number validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Email validation (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address'
        });
      }
    }

    // Pincode validation
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit pincode'
      });
    }

    // Check for existing customer with same phone
    const existingCustomer = await Customer.findOne({
      where: { phoneNumber: phoneNumber.replace(/\D/g, '') }
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    const customer = await Customer.create({
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.replace(/\D/g, ''),
      email: email?.trim() || null,
      alternatePhone: alternatePhone?.replace(/\D/g, '') || null,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.replace(/\D/g, ''),
      gstin: gstin?.toUpperCase().trim() || null,
      customerType,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      paymentTerms: paymentTerms ? parseInt(paymentTerms) : 30,
      contactPerson: contactPerson?.trim() || null,
      website: website?.trim() || null,
      businessCategory: businessCategory?.trim() || null,
      notes: notes?.trim() || null,
      createdBy: createdBy || null,
      role: 'sales_purchase',
      type: 'customer_entry'
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update customer
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'customer_entry'
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validation for required fields
    if (updateData.customerName && !updateData.customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    if (updateData.phoneNumber) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(updateData.phoneNumber.replace(/\D/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit phone number'
        });
      }
      updateData.phoneNumber = updateData.phoneNumber.replace(/\D/g, '');
    }

    if (updateData.email && updateData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address'
        });
      }
    }

    if (updateData.pincode) {
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(updateData.pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 6-digit pincode'
        });
      }
      updateData.pincode = updateData.pincode.replace(/\D/g, '');
    }

    // Process alternate phone
    if (updateData.alternatePhone) {
      updateData.alternatePhone = updateData.alternatePhone.replace(/\D/g, '') || null;
    }

    // Clean and process text fields
    ['customerName', 'address', 'city', 'state', 'contactPerson', 'website', 'businessCategory', 'notes'].forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field]?.trim() || null;
      }
    });

    if (updateData.gstin) {
      updateData.gstin = updateData.gstin.toUpperCase().trim() || null;
    }

    if (updateData.creditLimit !== undefined) {
      updateData.creditLimit = updateData.creditLimit ? parseFloat(updateData.creditLimit) : null;
    }

    if (updateData.paymentTerms !== undefined) {
      updateData.paymentTerms = updateData.paymentTerms ? parseInt(updateData.paymentTerms) : 30;
    }

    const updatedCustomer = await customer.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete customer
router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'customer_entry'
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has orders
    const hasOrders = await SalesOrder.findOne({
      where: { customerId: id }
    });

    if (hasOrders) {
      // Soft delete - just mark as inactive
      await customer.update({ isActive: false });
      
      res.status(200).json({
        success: true,
        message: 'Customer marked as inactive (has existing orders)'
      });
    } else {
      // Hard delete if no orders
      await customer.destroy();
      
      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// SALES ORDER MANAGEMENT ROUTES
// =================================================================

// Get all sales orders
router.get('/orders', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      orderType,
      status,
      priority,
      customerId
    } = req.query;

    let whereClause = {
      role: 'sales_purchase',
      type: 'order_entry'
    };

    // Add filters
    if (orderType) {
      whereClause.orderType = orderType;
    }

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { productName: { [Op.like]: `%${search}%` } },
        { productCategory: { [Op.like]: `%${search}%` } },
        { orderNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows: orders } = await SalesOrder.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'customerName', 'phoneNumber', 'customerType'],
          required: false
        },
        {
          model: SignUp,
          as: 'user',
          attributes: ['id', 'fullname'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new sales order
router.post('/orders', async (req, res) => {
  try {
    const {
      productName,
      productCategory,
      description,
      quantity,
      unit = 'pcs',
      unitPrice,
      discount = 0,
      orderType = 'sale',
      priority = 'medium',
      expectedDeliveryDate,
      customerId,
      createdBy
    } = req.body;

    // Validation
    if (!productName || !quantity || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: productName, quantity, unitPrice'
      });
    }

    // Validate numeric fields
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const discountPercent = parseFloat(discount) || 0;

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid positive number'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit price must be a valid positive number'
      });
    }

    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Discount must be a valid percentage between 0 and 100'
      });
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await Customer.findByPk(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    const order = await SalesOrder.create({
      productName: productName.trim(),
      productCategory: productCategory?.trim() || null,
      description: description?.trim() || null,
      quantity: qty,
      unit: unit.trim(),
      unitPrice: price,
      discount: discountPercent,
      orderType,
      priority,
      expectedDeliveryDate: expectedDeliveryDate?.trim() || null,
      customerId: customerId || null,
      createdBy: createdBy || null,
      role: 'sales_purchase',
      type: 'order_entry'
    });

    // Fetch the created order with associations
    const createdOrder = await SalesOrder.findByPk(order.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'customerName', 'phoneNumber'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: createdOrder
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update sales order
router.put('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const order = await SalesOrder.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'order_entry'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validation for required fields
    if (updateData.productName && !updateData.productName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (updateData.quantity !== undefined) {
      const qty = parseFloat(updateData.quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a valid positive number'
        });
      }
      updateData.quantity = qty;
    }

    if (updateData.unitPrice !== undefined) {
      const price = parseFloat(updateData.unitPrice);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit price must be a valid positive number'
        });
      }
      updateData.unitPrice = price;
    }

    if (updateData.discount !== undefined) {
      const discountPercent = parseFloat(updateData.discount) || 0;
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be a valid percentage between 0 and 100'
        });
      }
      updateData.discount = discountPercent;
    }

    // Validate customer if provided
    if (updateData.customerId) {
      const customer = await Customer.findByPk(updateData.customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    // Clean text fields
    ['productName', 'productCategory', 'description', 'unit', 'expectedDeliveryDate'].forEach(field => {
      if (updateData[field] !== undefined) {
        updateData[field] = updateData[field]?.trim() || null;
      }
    });

    const updatedOrder = await order.update(updateData);

    // Fetch updated order with associations
    const orderWithAssociations = await SalesOrder.findByPk(updatedOrder.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'customerName', 'phoneNumber'],
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: orderWithAssociations
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete sales order
router.delete('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await SalesOrder.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'order_entry'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be deleted based on status
    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete shipped or delivered orders'
      });
    }

    await order.destroy();

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actualDeliveryDate } = req.body;

    const validStatuses = ['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const order = await SalesOrder.findOne({
      where: { 
        id: id,
        role: 'sales_purchase',
        type: 'order_entry'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updateData = { status };
    
    // Set actual delivery date if status is delivered
    if (status === 'delivered' && actualDeliveryDate) {
      updateData.actualDeliveryDate = new Date(actualDeliveryDate);
    }

    const updatedOrder = await order.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// DASHBOARD AND ANALYTICS ROUTES
// =================================================================

// Sales dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      };
    }

    // Customer statistics
    const totalCustomers = await Customer.count({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        isActive: true,
        ...dateFilter
      }
    });

    const businessCustomers = await Customer.count({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        customerType: 'business',
        isActive: true,
        ...dateFilter
      }
    });

    const individualCustomers = await Customer.count({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        customerType: 'individual',
        isActive: true,
        ...dateFilter
      }
    });

    // Order statistics
    const totalOrders = await SalesOrder.count({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        ...dateFilter
      }
    });

    const saleOrders = await SalesOrder.count({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'sale',
        ...dateFilter
      }
    });

    const purchaseOrders = await SalesOrder.count({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'purchase',
        ...dateFilter
      }
    });

    // Order status breakdown
    const ordersByStatus = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        ...dateFilter
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Priority breakdown
    const ordersByPriority = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        ...dateFilter
      },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });

    // Revenue statistics
    const revenueStats = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'sale',
        status: { [Op.in]: ['delivered', 'confirmed'] },
        ...dateFilter
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.col('totalAmount')), 'averageOrderValue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'completedOrders']
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          business: businessCustomers,
          individual: individualCustomers
        },
        orders: {
          total: totalOrders,
          sales: saleOrders,
          purchases: purchaseOrders,
          byStatus: ordersByStatus,
          byPriority: ordersByPriority
        },
        revenue: revenueStats[0] || {
          totalRevenue: 0,
          averageOrderValue: 0,
          completedOrders: 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get sales analytics
router.get('/analytics/sales', async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;

    const salesData = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'sale',
        createdAt: {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59)
          ]
        }
      },
      attributes: [
        [SalesOrder.sequelize.fn('DATE_FORMAT', SalesOrder.sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [SalesOrder.sequelize.fn('COUNT', SalesOrder.sequelize.col('id')), 'orderCount'],
        [SalesOrder.sequelize.fn('SUM', SalesOrder.sequelize.col('totalAmount')), 'totalRevenue'],
        [SalesOrder.sequelize.fn('AVG', SalesOrder.sequelize.col('totalAmount')), 'averageOrderValue']
      ],
      group: [SalesOrder.sequelize.fn('DATE_FORMAT', SalesOrder.sequelize.col('createdAt'), '%Y-%m')],
      order: [[SalesOrder.sequelize.fn('DATE_FORMAT', SalesOrder.sequelize.col('createdAt'), '%Y-%m'), 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: salesData
    });

  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get customer analytics
router.get('/analytics/customers', async (req, res) => {
  try {
    // Top customers by order value
    const topCustomers = await Customer.findAll({
      include: [
        {
          model: SalesOrder,
          as: 'orders',
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'id',
        'customerName',
        'customerType',
        'phoneNumber',
        [sequelize.fn('COUNT', sequelize.col('orders.id')), 'totalOrders'],
        [sequelize.fn('SUM', sequelize.col('orders.totalAmount')), 'totalValue']
      ],
      group: ['Customer.id'],
      order: [[sequelize.fn('SUM', sequelize.col('orders.totalAmount')), 'DESC']],
      limit: 10
    });

    // Customer distribution by type
    const customersByType = await Customer.findAll({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        isActive: true
      },
      attributes: [
        'customerType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['customerType']
    });

    // New customers trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const customerGrowth = await Customer.findAll({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry',
        createdAt: {
          [Op.gte]: twelveMonthsAgo
        }
      },
      attributes: [
        [Customer.sequelize.fn('DATE_FORMAT', Customer.sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [Customer.sequelize.fn('COUNT', Customer.sequelize.col('id')), 'newCustomers']
      ],
      group: [Customer.sequelize.fn('DATE_FORMAT', Customer.sequelize.col('createdAt'), '%Y-%m')],
      order: [[Customer.sequelize.fn('DATE_FORMAT', Customer.sequelize.col('createdAt'), '%Y-%m'), 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: {
        topCustomers,
        customersByType,
        customerGrowth
      }
    });

  } catch (error) {
    console.error('Error fetching customer analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get product performance analytics
router.get('/analytics/products', async (req, res) => {
  try {
    const { period = 'monthly', limit = 10 } = req.query;

    // Top selling products
    const topProducts = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'sale'
      },
      attributes: [
        'productName',
        'productCategory',
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
      ],
      group: ['productName', 'productCategory'],
      order: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'DESC']],
      limit: parseInt(limit)
    });

    // Product categories performance
    const categoryPerformance = await SalesOrder.findAll({
      where: {
        role: 'sales_purchase',
        type: 'order_entry',
        orderType: 'sale',
        productCategory: { [Op.not]: null }
      },
      attributes: [
        'productCategory',
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.col('totalAmount')), 'averageOrderValue']
      ],
      group: ['productCategory'],
      order: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        topProducts,
        categoryPerformance
      }
    });

  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// =================================================================
// UTILITY ROUTES
// =================================================================

// Get single customer by ID
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      where: {
        id: id,
        role: 'sales_purchase',
        type: 'customer_entry'
      },
      include: [
        {
          model: SalesOrder,
          as: 'orders',
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get single order by ID
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await SalesOrder.findOne({
      where: {
        id: id,
        role: 'sales_purchase',
        type: 'order_entry'
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          required: false
        },
        {
          model: SignUp,
          as: 'user',
          attributes: ['id', 'fullname'],
          required: false
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Bulk operations for orders
router.post('/orders/bulk-action', async (req, res) => {
  try {
    const { action, orderIds, newStatus } = req.body;

    if (!action || !orderIds || !Array.isArray(orderIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action and orderIds array are required'
      });
    }

    let result;
    switch (action) {
      case 'update_status':
        if (!newStatus) {
          return res.status(400).json({
            success: false,
            message: 'New status is required for update_status action'
          });
        }
        result = await SalesOrder.update(
          { status: newStatus, updatedAt: new Date() },
          {
            where: {
              id: { [Op.in]: orderIds },
              role: 'sales_purchase',
              type: 'order_entry'
            }
          }
        );
        break;
      case 'delete':
        result = await SalesOrder.destroy({
          where: {
            id: { [Op.in]: orderIds },
            role: 'sales_purchase',
            type: 'order_entry',
            status: { [Op.notIn]: ['shipped', 'delivered'] } // Prevent deletion of completed orders
          }
        });
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
    console.error('Error in bulk order operation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Export customers to CSV format
router.get('/customers/export/csv', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: {
        role: 'sales_purchase',
        type: 'customer_entry'
      },
      attributes: [
        'customerName', 'phoneNumber', 'email', 'address',
        'city', 'state', 'pincode', 'customerType',
        'creditLimit', 'paymentTerms', 'createdAt'
      ],
      order: [['customerName', 'ASC']]
    });

    // Format data for CSV
    const csvData = customers.map(customer => ({
      'Customer Name': customer.customerName,
      'Phone Number': customer.phoneNumber,
      'Email': customer.email || '',
      'Address': customer.address,
      'City': customer.city,
      'State': customer.state,
      'Pincode': customer.pincode,
      'Type': customer.customerType,
      'Credit Limit': customer.creditLimit || '',
      'Payment Terms': customer.paymentTerms,
      'Created Date': customer.createdAt.toISOString().split('T')[0]
    }));

    res.status(200).json({
      success: true,
      data: csvData,
      message: 'Customer data exported successfully'
    });

  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;