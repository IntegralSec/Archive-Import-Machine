const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with system information
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    // Test database connection
    let databaseStatus = 'unknown';
    try {
      await sequelize.authenticate();
      databaseStatus = 'connected';
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      databaseStatus = 'disconnected';
    }

    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: process.cpuUsage()
      },
      services: {
        database: databaseStatus,
        external_api: 'available'
      }
    };

    res.json(healthInfo);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
