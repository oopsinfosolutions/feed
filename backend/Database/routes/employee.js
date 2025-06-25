const express = require('express');
const router = express.Router();
const multer = require('multer');
const Material = require('../models/shipmentorder');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// GET: Fetch all submitted materials (no ID required)
router.get('/getdata', async (req, res) => {
  try {
    const materials = await Material.findAll(); // Fetch all records

    res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: materials
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST: Employee submits data
router.post('/submit', upload.fields([
  { name: 'image1' }, { name: 'image2' }, { name: 'image3' },
  { name: 'video1' }, { name: 'video2' }, { name: 'video3' }
]), async (req, res) => {
  try {
    const {
      name, phone, address, pincode,
      latitude, longitude, detail
    } = req.body;

    const material = await Material.create({
      name,
      phone,
      address,
      pincode,
      latitude,
      longitude,
      detail,
      image1: req.files['image1']?.[0]?.filename || null,
      image2: req.files['image2']?.[0]?.filename || null,
      image3: req.files['image3']?.[0]?.filename || null,
      video1: req.files['video1']?.[0]?.filename || null,
      video2: req.files['video2']?.[0]?.filename || null,
      video3: req.files['video3']?.[0]?.filename || null,
      status: 'submitted'
    });

    res.status(201).json({
      success: true,
      message: 'Submission successful',
      data: material
    });

  } catch (error) {
    console.error('Error submitting material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
