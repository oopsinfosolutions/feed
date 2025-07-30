const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../Database/DB');
const Material = require('../models/shipmentorder');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// =================================================================
// PRODUCT MANAGEMENT ROUTES
// =================================================================

// GET: Fetch all products
router.get('/', async (req, res) => {
  try {
    const {
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50,
      search
    } = req.query;

    let whereClause = {
      productType: 'product' // Distinguish from other material entries
    };

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { detail: { [Op.like]: `%${search}%` } },
        { unit: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows: products } = await Material.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 
        'name', 
        ['detail', 'details'],           // [column_name, alias]
        ['quantity', 'quantityInStore'], 
        'unit', 
        ['unitPrice', 'pricePerUnit'], 
        'image1', 
        'image2', 
        'createdAt', 
        'updatedAt'
      ]
    });

    // Transform the data to match frontend expectations
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      details: product.getDataValue('details') || product.detail,
      quantityInStore: product.getDataValue('quantityInStore') || product.quantity,
      unit: product.unit,
      pricePerUnit: product.getDataValue('pricePerUnit') || product.unitPrice,
      image1: product.image1,
      image2: product.image2,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: transformedProducts,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        hasNext: offset + products.length < count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Fetch single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Material.findOne({
      where: { 
        id,
        productType: 'product'
      },
      attributes: [
        'id',
        'name',
        'detail',
        'quantity',
        'unit',
        'unitPrice',
        'image1',
        'image2',
        'createdAt',
        'updatedAt'
      ]
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Transform the data
    const transformedProduct = {
      id: product.id,
      name: product.name,
      details: product.detail,
      quantityInStore: product.quantity,
      unit: product.unit,
      pricePerUnit: product.unitPrice,
      image1: product.image1,
      image2: product.image2,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Product fetched successfully',
      data: transformedProduct
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Create new product
router.post('/', async (req, res) => {
  try {
    const { name, details, quantityInStore, unit, pricePerUnit, userId, role } = req.body;

    // Validation
    if (!name || !details || !unit || !quantityInStore || !pricePerUnit) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided (name, details, unit, quantityInStore, pricePerUnit)'
      });
    }

    // Validate numeric fields
    const quantity = parseFloat(quantityInStore);
    const price = parseFloat(pricePerUnit);

    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity in store must be a valid non-negative number'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per unit must be a valid positive number'
      });
    }

    // Handle image uploads
    const image1 = req.files && req.files.image1 ? req.files.image1[0].filename : null;
    const image2 = req.files && req.files.image2 ? req.files.image2[0].filename : null;

    // Create product
    const product = await Material.create({
      name: name.trim(),
      detail: details.trim(),
      quantity: quantity,
      unit: unit.trim(),
      unitPrice: price,
      image1: image1,
      image2: image2,
      productType: 'product',
      userId: userId || 1, // Use provided userId or default to 1
      role: role || 'admin', // Use provided role or default to 'admin'
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Transform response data
    const transformedProduct = {
      id: product.id,
      name: product.name,
      details: product.detail,
      quantityInStore: product.quantity,
      unit: product.unit,
      pricePerUnit: product.unitPrice,
      image1: product.image1,
      image2: product.image2,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: transformedProduct
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Clean up uploaded files if product creation fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT: Update existing product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, details, quantityInStore, unit, pricePerUnit } = req.body;

    // Find existing product
    const existingProduct = await Material.findOne({
      where: { id, productType: 'product' }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validation
    if (!name || !details || !unit || !quantityInStore || !pricePerUnit) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided (name, details, unit, quantityInStore, pricePerUnit)'
      });
    }

    // Validate numeric fields
    const quantity = parseFloat(quantityInStore);
    const price = parseFloat(pricePerUnit);

    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity in store must be a valid non-negative number'
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per unit must be a valid positive number'
      });
    }

    // Handle image uploads and cleanup
    const oldImage1 = existingProduct.image1;
    const oldImage2 = existingProduct.image2;

    const image1 = req.files && req.files.image1 ? req.files.image1[0].filename : oldImage1;
    const image2 = req.files && req.files.image2 ? req.files.image2[0].filename : oldImage2;

    // Update product
    await existingProduct.update({
      name: name.trim(),
      detail: details.trim(),
      quantity: quantity,
      unit: unit.trim(),
      unitPrice: price,
      image1: image1,
      image2: image2,
      userId: existingProduct.userId || 1,
      role: existingProduct.role || 'admin',
      updatedAt: new Date()
    });

    // Clean up old images if new ones were uploaded
    if (req.files && req.files.image1 && oldImage1) {
      fs.unlink(path.join('uploads', oldImage1), (err) => {
        if (err) console.error('Error deleting old image1:', err);
      });
    }

    if (req.files && req.files.image2 && oldImage2) {
      fs.unlink(path.join('uploads', oldImage2), (err) => {
        if (err) console.error('Error deleting old image2:', err);
      });
    }

    // Transform response data
    const transformedProduct = {
      id: existingProduct.id,
      name: existingProduct.name,
      details: existingProduct.detail,
      quantityInStore: existingProduct.quantity,
      unit: existingProduct.unit,
      pricePerUnit: existingProduct.unitPrice,
      image1: existingProduct.image1,
      image2: existingProduct.image2,
      createdAt: existingProduct.createdAt,
      updatedAt: existingProduct.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: transformedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Clean up uploaded files if update fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE: Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find product to delete
    const product = await Material.findOne({
      where: { id, productType: 'product' }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated images
    if (product.image1) {
      fs.unlink(path.join('uploads', product.image1), (err) => {
        if (err) console.error('Error deleting image1:', err);
      });
    }

    if (product.image2) {
      fs.unlink(path.join('uploads', product.image2), (err) => {
        if (err) console.error('Error deleting image2:', err);
      });
    }

    // Delete product
    await product.destroy();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Get product statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Material.findAll({
      where: { productType: 'product' },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalProducts'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.literal('quantity * "unitPrice"')), 'totalValue'],
        [sequelize.fn('AVG', sequelize.col('unitPrice')), 'averagePrice']
      ],
      raw: true
    });

    const lowStockProducts = await Material.count({
      where: {
        productType: 'product',
        quantity: { [Op.lt]: 10 } // Products with less than 10 units
      }
    });

    res.status(200).json({
      success: true,
      message: 'Product statistics fetched successfully',
      data: {
        totalProducts: parseInt(stats[0].totalProducts) || 0,
        totalQuantity: parseFloat(stats[0].totalQuantity) || 0,
        totalValue: parseFloat(stats[0].totalValue) || 0,
        averagePrice: parseFloat(stats[0].averagePrice) || 0,
        lowStockProducts: lowStockProducts || 0
      }
    });
  } catch (error) {
    console.error('Error fetching product statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET: Get low stock products
router.get('/low-stock', async (req, res) => {
  try {
    const { threshold = 10, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: products } = await Material.findAndCountAll({
      where: {
        productType: 'product',
        quantity: { [Op.lt]: parseInt(threshold) }
      },
      order: [['quantity', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'name', 'detail', 'quantity', 'unit', 'unitPrice', 'image1'
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Low stock products fetched successfully',
      data: products,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        hasNext: offset + products.length < count,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Bulk update product quantities
router.post('/bulk-update-quantity', async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, quantity }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and cannot be empty'
      });
    }

    const results = [];
    for (const update of updates) {
      const { id, quantity } = update;
      
      if (!id || quantity === undefined) {
        results.push({ id, success: false, message: 'ID and quantity are required' });
        continue;
      }

      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty < 0) {
        results.push({ id, success: false, message: 'Invalid quantity' });
        continue;
      }

      try {
        const [updatedRows] = await Material.update(
          { quantity: qty, updatedAt: new Date() },
          { where: { id, productType: 'product' } }
        );

        if (updatedRows > 0) {
          results.push({ id, success: true, message: 'Quantity updated' });
        } else {
          results.push({ id, success: false, message: 'Product not found' });
        }
      } catch (error) {
        results.push({ id, success: false, message: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Bulk update completed: ${successCount} successful, ${failCount} failed`,
      results
    });

  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Adjust product stock (increase/decrease)
router.post('/:id/adjust-stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body; // adjustment can be positive or negative

    if (adjustment === undefined || isNaN(parseFloat(adjustment))) {
      return res.status(400).json({
        success: false,
        message: 'Valid adjustment amount is required'
      });
    }

    const product = await Material.findOne({
      where: { id, productType: 'product' }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const adjustmentAmount = parseFloat(adjustment);
    const newQuantity = parseFloat(product.quantity) + adjustmentAmount;

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment would result in negative stock'
      });
    }

    await product.update({
      quantity: newQuantity,
      updatedAt: new Date()
    });

    // Log the adjustment (in a real app, you might want a separate audit table)
    console.log(`Stock adjustment for product ${id}: ${adjustmentAmount} (Reason: ${reason || 'No reason provided'})`);

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        productId: id,
        previousQuantity: product.quantity,
        adjustment: adjustmentAmount,
        newQuantity: newQuantity,
        reason: reason || null
      }
    });

  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;