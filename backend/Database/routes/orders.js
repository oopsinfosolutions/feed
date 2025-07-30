const express = require('express');
const { Op } = require('sequelize');
const Material = require('../models/shipmentorder');
const SignUp = require('../models/signup');
const router = express.Router();

// Helper functions
function generateOrderId() {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  return `ORDER_${timestamp}_${randomNum}`;
}

function generateProductId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD_${timestamp}_${random}`;
}

// =================================================================
// ORDER MANAGEMENT ROUTES
// =================================================================

// Get clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await SignUp.findAll({
      where: {
        type: 'Client' // Make sure this matches your database values
      },
      attributes: ['id', 'fullname', 'email', 'phone', 'user_id'], 
      order: [['fullname', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      clients: clients.map(client => ({
        id: client.id,
        fullName: client.fullname, // Mapping to match frontend expectation
        email: client.email,
        phone: client.phone,
        user_id: client.user_id
      }))
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
});

// Create new order
router.post('/admin', async (req, res) => {
  try {
    const {
      name,
      address,
      unit,
      quantity,
      unitPrice,
      vehicleName,
      vehicleNumber,
      pincode,
      offer = 0,
      status = 'active',
      isTemplate = false,
      description,
      phone,
      c_id,
      detail
    } = req.body;

    if (!name || !unit || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Name, unit, and unit price are required fields'
      });
    }

    const userId = await generateOrderId();
    const totalPrice = parseFloat(unitPrice) * (parseInt(quantity) || 1);
    const finalPrice = totalPrice - totalPrice * (parseFloat(offer) / 100);

    const newOrder = await Material.create({
      userId,
      name,
      unit,
      quantity: quantity || 1,
      unitPrice: parseFloat(unitPrice),
      totalPrice: finalPrice,
      vehicleName: vehicleName || null,
      vehicleNumber: vehicleNumber || null,
      pincode: pincode || null,
      offer: parseFloat(offer),
      image1: req.files?.['image1']?.[0]?.filename || null,
      video: req.files?.['video1']?.[0]?.filename || null,
      status,
      isTemplate: isTemplate === 'true' || isTemplate === true,
      description: description || null,
      createdBy: 'admin',
      phone: phone || null,
      c_id: c_id || null,
      role: 'admin',
      detail
    });

    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully',
      data: newOrder 
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

// Get all orders
router.get('/admin', async (req, res) => {
  try {
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search,
      clientId,
      phone
    } = req.query;

    const whereClause = {
      role: 'admin' // Filter to only get order data
    };

    // Filter by status
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Text search
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
        { customerPhone: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { c_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // Dropdown filters
    if (clientId) {
      whereClause.c_id = clientId;
    }

    if (phone) {
      whereClause.phone = phone;
    }

    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Material.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: {
        orders,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + orders.length < count,
          hasPrev: page > 1
        }
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

// Get single order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Material.findByPk(orderId, {
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone'],
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

// Update order
router.put('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      customerName,
      customerEmail,
      customerPhone,
      address,
      unit,
      quantity,
      unitPrice,
      vehicleName,
      vehicleNumber,
      pincode,
      offer = 0,
      status,
      isTemplate,
      description,
      phone,
      c_id,
      detail
    } = req.body;

    const order = await Material.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const totalPrice = parseFloat(unitPrice || order.unitPrice) * (parseInt(quantity || order.quantity) || 1);
    const finalPrice = totalPrice - (totalPrice * (parseFloat(offer || order.offer) / 100));

    const updatedOrder = await order.update({
      name: name || order.name,
      customerName: customerName || order.customerName,
      customerEmail: customerEmail || order.customerEmail,
      customerPhone: customerPhone || order.customerPhone,
      address: address || order.address,
      unit: unit || order.unit,
      quantity: quantity || order.quantity,
      unitPrice: parseFloat(unitPrice || order.unitPrice),
      totalPrice: finalPrice,
      vehicleName: vehicleName || order.vehicleName,
      vehicleNumber: vehicleNumber || order.vehicleNumber,
      pincode: pincode || order.pincode,
      offer: parseFloat(offer || order.offer),
      image1: req.files?.['image1']?.[0]?.filename || order.image1,
      video: req.files?.['video1']?.[0]?.filename || order.video,
      status: status || order.status,
      isTemplate: isTemplate === 'true' || isTemplate === true || order.isTemplate,
      description: description || order.description,
      phone: phone || order.phone,
      c_id: c_id || order.c_id,
      detail: detail || order.detail
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
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

// Delete order
router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Material.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
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
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const order = await Material.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updatedOrder = await order.update({ status });

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

// Get order statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalOrders = await Material.count({ where: { role: 'admin' } });
    const pendingOrders = await Material.count({ where: { role: 'admin', status: 'pending' } });
    const confirmedOrders = await Material.count({ where: { role: 'admin', status: 'confirmed' } });
    const completedOrders = await Material.count({ 
      where: { 
        role: 'admin', 
        status: { [Op.in]: ['delivered', 'completed'] } 
      } 
    });

    const totalValue = await Material.sum('totalPrice', { 
      where: { role: 'admin' } 
    });

    const ordersByStatus = await Material.findAll({
      where: { role: 'admin' },
      attributes: [
        'status',
        [Material.sequelize.fn('COUNT', Material.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        completedOrders,
        totalValue: totalValue || 0,
        ordersByStatus
      }
    });

  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get order analytics
router.get('/analytics/trends', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyTrends = await Material.findAll({
      where: {
        role: 'admin',
        createdAt: {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59)
          ]
        }
      },
      attributes: [
        [Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [Material.sequelize.fn('COUNT', Material.sequelize.col('id')), 'orderCount'],
        [Material.sequelize.fn('SUM', Material.sequelize.col('totalPrice')), 'totalValue'],
        [Material.sequelize.fn('AVG', Material.sequelize.col('totalPrice')), 'averageValue']
      ],
      group: [Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m')],
      order: [[Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m'), 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: monthlyTrends
    });

  } catch (error) {
    console.error('Error fetching order analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Bulk operations for orders
router.post('/bulk-action', async (req, res) => {
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
        result = await Material.update(
          { status: newStatus, updatedAt: new Date() },
          {
            where: {
              id: { [Op.in]: orderIds },
              role: 'admin'
            }
          }
        );
        break;
      case 'delete':
        result = await Material.destroy({
          where: {
            id: { [Op.in]: orderIds },
            role: 'admin',
            status: { [Op.notIn]: ['shipped', 'delivered'] } // Prevent deletion of completed orders
          }
        });
        break;
      case 'mark_priority':
        result = await Material.update(
          { priority: 'high', updatedAt: new Date() },
          {
            where: {
              id: { [Op.in]: orderIds },
              role: 'admin'
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
    console.error('Error in bulk order operation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Search orders
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20, status } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let whereClause = {
      role: 'admin',
      [Op.or]: [
        { name: { [Op.like]: `%${q}%` } },
        { customerName: { [Op.like]: `%${q}%` } },
        { customerEmail: { [Op.like]: `%${q}%` } },
        { customerPhone: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { userId: { [Op.like]: `%${q}%` } }
      ]
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;
    const { count, rows: orders } = await Material.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + orders.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get orders by client
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    let whereClause = {
      role: 'admin',
      c_id: clientId
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;
    const { count, rows: orders } = await Material.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + orders.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching client orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Duplicate order (create template)
router.post('/:orderId/duplicate', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { isTemplate = false } = req.body;

    const originalOrder = await Material.findByPk(orderId);
    if (!originalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create duplicate with new ID
    const duplicateData = originalOrder.toJSON();
    delete duplicateData.id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    
    duplicateData.userId = await generateOrderId();
    duplicateData.status = 'pending'; // Reset status for new order
    duplicateData.isTemplate = isTemplate;
    duplicateData.name = `${duplicateData.name} (Copy)`;

    const duplicateOrder = await Material.create(duplicateData);

    res.status(201).json({
      success: true,
      message: 'Order duplicated successfully',
      data: duplicateOrder
    });

  } catch (error) {
    console.error('Error duplicating order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get order templates
router.get('/templates/list', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const { count, rows: templates } = await Material.findAndCountAll({
      where: {
        role: 'admin',
        isTemplate: true
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        templates,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + templates.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching order templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create order from template
router.post('/templates/:templateId/create-order', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { customizations = {} } = req.body;

    const template = await Material.findByPk(templateId);
    if (!template || !template.isTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Create order from template
    const orderData = template.toJSON();
    delete orderData.id;
    delete orderData.createdAt;
    delete orderData.updatedAt;
    
    orderData.userId = await generateOrderId();
    orderData.status = 'pending';
    orderData.isTemplate = false;
    
    // Apply customizations
    Object.keys(customizations).forEach(key => {
      if (customizations[key] !== undefined) {
        orderData[key] = customizations[key];
      }
    });

    // Recalculate total if price or quantity changed
    if (customizations.unitPrice || customizations.quantity || customizations.offer) {
      const totalPrice = parseFloat(orderData.unitPrice) * parseInt(orderData.quantity);
      orderData.totalPrice = totalPrice - (totalPrice * (parseFloat(orderData.offer) / 100));
    }

    const newOrder = await Material.create(orderData);

    res.status(201).json({
      success: true,
      message: 'Order created from template successfully',
      data: newOrder
    });

  } catch (error) {
    console.error('Error creating order from template:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Export orders to CSV format
router.get('/export/csv', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    let whereClause = { role: 'admin' };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const orders = await Material.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      attributes: [
        'userId', 'name', 'customerName', 'customerEmail', 'customerPhone',
        'unit', 'quantity', 'unitPrice', 'totalPrice', 'offer',
        'status', 'vehicleName', 'vehicleNumber', 'createdAt'
      ]
    });

    // Format data for CSV
    const csvData = orders.map(order => ({
      'Order ID': order.userId,
      'Product Name': order.name,
      'Customer Name': order.customerName || '',
      'Customer Email': order.customerEmail || '',
      'Customer Phone': order.customerPhone || '',
      'Unit': order.unit,
      'Quantity': order.quantity,
      'Unit Price': order.unitPrice,
      'Total Price': order.totalPrice,
      'Discount %': order.offer || 0,
      'Status': order.status,
      'Vehicle Name': order.vehicleName || '',
      'Vehicle Number': order.vehicleNumber || '',
      'Order Date': order.createdAt.toISOString().split('T')[0]
    }));

    res.status(200).json({
      success: true,
      data: csvData,
      message: 'Order data exported successfully'
    });

  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;