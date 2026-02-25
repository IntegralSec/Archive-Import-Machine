const express = require('express');
const router = express.Router();
const loggingService = require('../services/loggingService');
const { authenticate } = require('../middleware/auth');

// Get all available log files
router.get('/files', authenticate, (req, res) => {
  try {
    const logFiles = loggingService.getAvailableLogFiles();
    res.json({
      success: true,
      data: logFiles,
      count: logFiles.length
    });
  } catch (error) {
    console.error('Error getting log files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve log files'
    });
  }
});

// Get log statistics
router.get('/stats/overview', authenticate, (req, res) => {
  try {
    const logFiles = loggingService.getAvailableLogFiles();
    const stats = {
      totalLogFiles: logFiles.length,
      logFiles: logFiles,
      routes: logFiles.map(file => file.replace('.log', ''))
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting log stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve log statistics'
    });
  }
});

// Get logs for a specific route
router.get('/:route', authenticate, (req, res) => {
  try {
    const { route } = req.params;
    const { limit = 100 } = req.query;
    
    const logs = loggingService.getLogs(route, parseInt(limit));
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      route
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
});

// Clear logs for a specific route
router.delete('/:route', authenticate, (req, res) => {
  try {
    const { route } = req.params;
    
    const success = loggingService.clearLogs(route);
    
    if (success) {
      res.json({
        success: true,
        message: `Logs cleared for route: ${route}`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `No log file found for route: ${route}`
      });
    }
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs'
    });
  }
});

module.exports = router;
