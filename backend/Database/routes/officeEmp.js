const express = require('express');
const router = express.Router();
const Material = require('../models/shipmentorder');

// GET all materials
router.get('/materials', async (req, res) => {
  try {
    const materials = await Material.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: materials,
      count: materials.length
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST new material request from office (without material_Name and quantity)
router.post('/add_by_office', async (req, res) => {
  try {
    const { name, address, phone, detail } = req.body;

    if (!name || !address || !phone || !detail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, address, phone, detail'
      });
    }

    const material = await Material.create({
      name,
      address,
      phone,
      detail
    });

    res.status(201).json({
      success: true,
      message: 'Material request created successfully',
      data: material
    });

  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
