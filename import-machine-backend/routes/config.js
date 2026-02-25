const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getConfig, updateConfig, resetConfig } = require('../config/shared');

/**
 * @route   GET /api/config
 * @desc    Get current configuration
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const config = await getConfig(req.user.id);
    res.json({
      success: true,
      data: {
        ...config,
        // Return full token for the user's own configuration
        apiToken: config.apiToken || '',
        s3Settings: {
          ...config.s3Settings,
          secretAccessKey: config.s3Settings.secretAccessKey || ''
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/config
 * @desc    Update configuration
 * @access  Private
 */
router.post('/', authenticate, [
  body('archiveWebUI').optional().isURL().withMessage('Archive Web UI must be a valid URL'),
  body('apiToken').optional().isString().withMessage('API Token must be a string'),
  body('customerGUID').optional().isString().withMessage('Customer GUID must be a string'),
  body('s3Settings.accessKeyId').optional().isString().withMessage('Access Key ID must be a string'),
  body('s3Settings.secretAccessKey').optional().isString().withMessage('Secret Access Key must be a string')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Update configuration with provided values
    const currentConfig = await getConfig(req.user.id);
    const updatedConfig = { ...currentConfig };
    
    if (req.body.archiveWebUI !== undefined) {
      updatedConfig.archiveWebUI = req.body.archiveWebUI;
    }
    if (req.body.apiToken !== undefined) {
      updatedConfig.apiToken = req.body.apiToken;
    }
    if (req.body.customerGUID !== undefined) {
      updatedConfig.customerGUID = req.body.customerGUID;
    }
    if (req.body.s3Settings) {
      updatedConfig.s3Settings = {
        ...updatedConfig.s3Settings,
        ...req.body.s3Settings
      };
    }

    // Update the shared configuration
    const savedConfig = await updateConfig(req.user.id, updatedConfig);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: {
        ...savedConfig,
        // Return full token for the user's own configuration
        apiToken: savedConfig.apiToken || '',
        s3Settings: {
          ...savedConfig.s3Settings,
          secretAccessKey: savedConfig.s3Settings.secretAccessKey || ''
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   PUT /api/config
 * @desc    Replace entire configuration
 * @access  Private
 */
router.put('/', authenticate, [
  body('archiveWebUI').isURL({ require_protocol: false }).withMessage('Archive Web UI must be a valid URL'),
  body('apiToken').isString().withMessage('API Token must be a string'),
  body('customerGUID').optional().isString().withMessage('Customer GUID must be a string'),
  body('s3Settings.accessKeyId').optional().isString().withMessage('Access Key ID must be a string'),
  body('s3Settings.secretAccessKey').optional().isString().withMessage('Secret Access Key must be a string')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Replace entire configuration
    const newConfig = {
      archiveWebUI: req.body.archiveWebUI,
      apiToken: req.body.apiToken,
      customerGUID: req.body.customerGUID || '',
      s3Settings: {
        accessKeyId: req.body.s3Settings?.accessKeyId || '',
        secretAccessKey: req.body.s3Settings?.secretAccessKey || ''
      }
    };



    // Update the shared configuration
    const savedConfig = await updateConfig(req.user.id, newConfig);

    res.json({
      success: true,
      message: 'Configuration replaced successfully',
      data: {
        ...savedConfig,
        // Return full token for the user's own configuration
        apiToken: savedConfig.apiToken || '',
        s3Settings: {
          ...savedConfig.s3Settings,
          secretAccessKey: savedConfig.s3Settings.secretAccessKey || ''
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error replacing configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to replace configuration',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   DELETE /api/config
 * @desc    Reset configuration to defaults
 * @access  Private
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    // Reset the shared configuration
    await resetConfig(req.user.id);

    res.json({
      success: true,
      message: 'Configuration reset to defaults',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
