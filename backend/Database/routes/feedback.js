const express = require('express');
const { Op } = require('sequelize');
const Material = require('../models/shipmentorder');
const SignUp = require('../models/signup');
const router = express.Router();

// =================================================================
// FEEDBACK SYSTEM ROUTES
// =================================================================

// Submit client feedback
router.post('/client', async (req, res) => {
  try {
    const { 
      clientId, billId, orderId, rating, feedbackText, 
      serviceQuality, deliveryTime, productQuality, 
      overallSatisfaction, recommendations 
    } = req.body;

    // Validate required fields
    if (!clientId || !rating || !feedbackText) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, rating, and feedback text are required'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Create feedback record
    const feedback = await Material.create({
      userId: `FEEDBACK_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      c_id: clientId,
      orderId: orderId || null,
      role: 'feedback',
      name: 'Client Feedback',
      detail: feedbackText.trim(),
      rating: parseInt(rating),
      serviceQuality: serviceQuality || null,
      deliveryTime: deliveryTime || null,
      productQuality: productQuality || null,
      overallSatisfaction: overallSatisfaction || null,
      recommendations: recommendations ? recommendations.trim() : null,
      billId: billId || null,
      status: 'submitted',
      productType: 'feedback',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Enhanced get feedback for admin with client details
router.get('/admin', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      clientId,
      rating,
      status
    } = req.query;

    let whereClause = {
      role: 'feedback'
    };

    if (clientId) {
      whereClause.c_id = clientId;
    }

    if (rating) {
      whereClause.rating = parseInt(rating);
    }

    if (status) {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: feedback } = await Material.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'user_id', 'fullname', 'email', 'phone'],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Feedback fetched successfully',
      data: {
        feedback,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + feedback.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get single feedback details
router.get('/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Material.findOne({
      where: { 
        id: feedbackId, 
        role: 'feedback' 
      },
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email', 'phone'],
          required: false
        }
      ]
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error fetching feedback details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Respond to feedback
router.put('/admin/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse, status } = req.body;

    if (!adminResponse) {
      return res.status(400).json({
        success: false,
        message: 'Admin response is required'
      });
    }

    const feedback = await Material.findOne({
      where: { id, role: 'feedback' }
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.update({
      adminResponse: adminResponse.trim(),
      status: status || 'responded',
      respondedAt: new Date(),
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Response submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get feedback by client ID
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: feedback } = await Material.findAndCountAll({
      where: {
        role: 'feedback',
        c_id: clientId
      },
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      message: 'Client feedback fetched successfully',
      data: {
        feedback,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + feedback.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching client feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update feedback status
router.patch('/:feedbackId/status', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;

    const validStatuses = ['submitted', 'under_review', 'responded', 'resolved', 'closed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const feedback = await Material.findOne({
      where: { 
        id: feedbackId, 
        role: 'feedback' 
      }
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.update({ 
      status,
      updatedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Feedback status updated successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get feedback statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalFeedback = await Material.count({
      where: { role: 'feedback' }
    });

    const feedbackByRating = await Material.findAll({
      where: { role: 'feedback' },
      attributes: [
        'rating',
        [Material.sequelize.fn('COUNT', Material.sequelize.col('id')), 'count']
      ],
      group: ['rating'],
      order: [['rating', 'ASC']]
    });

    const feedbackByStatus = await Material.findAll({
      where: { role: 'feedback' },
      attributes: [
        'status',
        [Material.sequelize.fn('COUNT', Material.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const averageRating = await Material.findOne({
      where: { role: 'feedback' },
      attributes: [
        [Material.sequelize.fn('AVG', Material.sequelize.col('rating')), 'averageRating']
      ]
    });

    // Recent feedback (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentFeedback = await Material.count({
      where: {
        role: 'feedback',
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalFeedback,
        byRating: feedbackByRating,
        byStatus: feedbackByStatus,
        averageRating: parseFloat(averageRating.getDataValue('averageRating')) || 0,
        recentCount: recentFeedback
      }
    });

  } catch (error) {
    console.error('Error fetching feedback statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get feedback analytics (monthly trends)
router.get('/analytics/trends', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyTrends = await Material.findAll({
      where: {
        role: 'feedback',
        createdAt: {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59)
          ]
        }
      },
      attributes: [
        [Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m'), 'month'],
        [Material.sequelize.fn('COUNT', Material.sequelize.col('id')), 'count'],
        [Material.sequelize.fn('AVG', Material.sequelize.col('rating')), 'averageRating']
      ],
      group: [Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m')],
      order: [[Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m'), 'ASC']]
    });

    // Rating distribution by month
    const ratingDistribution = await Material.findAll({
      where: {
        role: 'feedback',
        createdAt: {
          [Op.between]: [
            new Date(year, 0, 1),
            new Date(year, 11, 31, 23, 59, 59)
          ]
        }
      },
      attributes: [
        [Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m'), 'month'],
        'rating',
        [Material.sequelize.fn('COUNT', Material.sequelize.col('id')), 'count']
      ],
      group: [
        Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m'),
        'rating'
      ],
      order: [
        [Material.sequelize.fn('DATE_FORMAT', Material.sequelize.col('createdAt'), '%Y-%m'), 'ASC'],
        ['rating', 'ASC']
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        monthlyTrends,
        ratingDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching feedback analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete feedback (Admin only)
router.delete('/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Material.findOne({
      where: { 
        id: feedbackId, 
        role: 'feedback' 
      }
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.destroy();

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Bulk operations for feedback
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, feedbackIds } = req.body;

    if (!action || !feedbackIds || !Array.isArray(feedbackIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action and feedbackIds array are required'
      });
    }

    let result;
    switch (action) {
      case 'delete':
        result = await Material.destroy({
          where: {
            id: { [Op.in]: feedbackIds },
            role: 'feedback'
          }
        });
        break;
      case 'mark_reviewed':
        result = await Material.update(
          { status: 'under_review', updatedAt: new Date() },
          {
            where: {
              id: { [Op.in]: feedbackIds },
              role: 'feedback'
            }
          }
        );
        break;
      case 'mark_resolved':
        result = await Material.update(
          { status: 'resolved', updatedAt: new Date() },
          {
            where: {
              id: { [Op.in]: feedbackIds },
              role: 'feedback'
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
    console.error('Error in bulk feedback operation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Search feedback
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const whereClause = {
      role: 'feedback',
      [Op.or]: [
        { detail: { [Op.like]: `%${q}%` } },
        { recommendations: { [Op.like]: `%${q}%` } },
        { adminResponse: { [Op.like]: `%${q}%` } }
      ]
    };

    const offset = (page - 1) * limit;
    const { count, rows: feedback } = await Material.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SignUp,
          as: 'Client',
          attributes: ['id', 'fullname', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        feedback,
        pagination: {
          total: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + feedback.length < count,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error searching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;