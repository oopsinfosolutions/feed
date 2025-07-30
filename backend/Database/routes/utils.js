const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// =================================================================
// FILE SERVING AND UTILITY ROUTES
// =================================================================

// GET: File serve route
router.get('/file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  if (fs.existsSync(filePath)) {
    // Set appropriate headers based on file type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.avi':
        contentType = 'video/avi';
        break;
      case '.mov':
        contentType = 'video/quicktime';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } else {
    res.status(404).json({ 
      success: false,
      error: 'File not found' 
    });
  }
});

// GET: Get file information
router.get('/file-info/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const fileInfo = {
      filename: filename,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      created: stats.birthtime,
      modified: stats.mtime,
      extension: path.extname(filename),
      type: getFileType(filename)
    };
    
    res.status(200).json({
      success: true,
      data: fileInfo
    });
  } else {
    res.status(404).json({ 
      success: false,
      error: 'File not found' 
    });
  }
});

// DELETE: Delete file
router.delete('/file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        error: 'Error deleting file'
      });
    }
  } else {
    res.status(404).json({ 
      success: false,
      error: 'File not found' 
    });
  }
});

// GET: List all files in uploads directory
router.get('/files/list', (req, res) => {
  const { page = 1, limit = 50, type, search } = req.query;
  const uploadsDir = path.join(__dirname, '../uploads');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.status(200).json({
        success: true,
        data: {
          files: [],
          pagination: {
            total: 0,
            currentPage: 1,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }

    let files = fs.readdirSync(uploadsDir);
    
    // Filter by type if specified
    if (type) {
      files = files.filter(file => {
        const fileType = getFileType(file);
        return fileType === type;
      });
    }
    
    // Filter by search term if specified
    if (search) {
      files = files.filter(file => 
        file.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Get file stats and create file objects
    const fileObjects = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filename),
        type: getFileType(filename)
      };
    });
    
    // Sort by creation date (newest first)
    fileObjects.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    // Implement pagination
    const offset = (page - 1) * limit;
    const paginatedFiles = fileObjects.slice(offset, offset + parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: {
        files: paginatedFiles,
        pagination: {
          total: fileObjects.length,
          currentPage: parseInt(page),
          totalPages: Math.ceil(fileObjects.length / limit),
          hasNext: offset + paginatedFiles.length < fileObjects.length,
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: 'Error listing files'
    });
  }
});

// GET: Get storage statistics
router.get('/storage/stats', (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.status(200).json({
        success: true,
        data: {
          totalFiles: 0,
          totalSize: 0,
          totalSizeFormatted: '0 B',
          fileTypes: {}
        }
      });
    }

    const files = fs.readdirSync(uploadsDir);
    let totalSize = 0;
    const fileTypes = {};
    
    files.forEach(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      const fileType = getFileType(filename);
      
      totalSize += stats.size;
      
      if (!fileTypes[fileType]) {
        fileTypes[fileType] = {
          count: 0,
          size: 0
        };
      }
      
      fileTypes[fileType].count++;
      fileTypes[fileType].size += stats.size;
    });
    
    // Format sizes for each file type
    Object.keys(fileTypes).forEach(type => {
      fileTypes[type].sizeFormatted = formatFileSize(fileTypes[type].size);
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalFiles: files.length,
        totalSize,
        totalSizeFormatted: formatFileSize(totalSize),
        fileTypes
      }
    });
    
  } catch (error) {
    console.error('Error getting storage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting storage statistics'
    });
  }
});

// POST: Clean up orphaned files (files not referenced in database)
router.post('/cleanup/orphaned', async (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.status(200).json({
        success: true,
        message: 'No uploads directory found',
        deletedFiles: []
      });
    }

    const Material = require('../models/shipmentorder');
    
    // Get all files in uploads directory
    const filesInDirectory = fs.readdirSync(uploadsDir);
    
    // Get all filenames referenced in database
    const materials = await Material.findAll({
      attributes: ['image1', 'image2', 'image3', 'video1', 'video2', 'video3', 'video']
    });
    
    const referencedFiles = new Set();
    materials.forEach(material => {
      ['image1', 'image2', 'image3', 'video1', 'video2', 'video3', 'video'].forEach(field => {
        if (material[field]) {
          referencedFiles.add(material[field]);
        }
      });
    });
    
    // Find orphaned files
    const orphanedFiles = filesInDirectory.filter(filename => 
      !referencedFiles.has(filename)
    );
    
    // Delete orphaned files
    const deletedFiles = [];
    orphanedFiles.forEach(filename => {
      try {
        const filePath = path.join(uploadsDir, filename);
        fs.unlinkSync(filePath);
        deletedFiles.push(filename);
      } catch (error) {
        console.error(`Error deleting file ${filename}:`, error);
      }
    });
    
    res.status(200).json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedFiles.length} orphaned files.`,
      deletedFiles
    });
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Error during cleanup operation'
    });
  }
});

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'];
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  
  if (imageExtensions.includes(ext)) return 'image';
  if (videoExtensions.includes(ext)) return 'video';
  if (documentExtensions.includes(ext)) return 'document';
  
  return 'other';
}

// =================================================================
// HEALTH CHECK AND SYSTEM INFO ROUTES
// =================================================================

// GET: Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// GET: System information
router.get('/system/info', (req, res) => {
  const os = require('os');
  
  res.status(200).json({
    success: true,
    data: {
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      }
    }
  });
});

// POST: Test database connection
router.post('/test/database', async (req, res) => {
  try {
    const sequelize = require('../Database/DB');
    
    await sequelize.authenticate();
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful'
    });
    
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// GET: Application logs (last N entries)
router.get('/logs', (req, res) => {
  const { limit = 100 } = req.query;
  
  // This is a basic implementation
  // In production, you might want to use a proper logging system
  res.status(200).json({
    success: true,
    message: 'Log endpoint available',
    note: 'Implement proper logging system for production use'
  });
});

module.exports = router;