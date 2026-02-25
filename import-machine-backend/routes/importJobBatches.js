const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getConfig, isConfigComplete } = require('../config/shared');

/**
 * @route   GET /api/import-job-batches/:importJobAid
 * @desc    Get batches for a specific import job
 * @access  Private
 */
router.get('/:importJobAid', authenticate, async (req, res) => {
  try {
    // Get current configuration
    const config = await getConfig(req.user.id);
    
    // Check if configuration is set
    if (!(await isConfigComplete(req.user.id))) {
      return res.status(400).json({
        success: false,
        error: 'Configuration not set. Please configure archive Web UI and API token first.',
        timestamp: new Date().toISOString()
      });
    }

    const { importJobAid } = req.params;

    // Debug logging


    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}${importJobAid}/batches/_query`;



    // Strip PWSAK2 prefix if it exists in the stored token
    const cleanApiToken = config.apiToken.replace(/^PWSAK2\s+/, '');
    
    // Make request to archive system
    const response = await axios.get(url, {
      headers: {
        'Authorization': `PWSAK2 ${cleanApiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Import-Machine-Backend/1.0.0'
      },
      timeout: 30000 // 30 second timeout
    });

    // Return the response data
    const responseData = response.data;

    res.json({
      success: true,
      data: {
        totalCount: responseData.totalCount || 0,
        results: responseData.results || [],
        importJobAid
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching import job batches:', error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      res.status(error.response.status).json({
        success: false,
        error: `Archive API error: ${error.response.status} ${error.response.statusText}`,
        details: error.response.data,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(503).json({
        success: false,
        error: 'No response from archive system. Please check the archive Web UI URL and network connectivity.',
        timestamp: new Date().toISOString()
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        success: false,
        error: 'Failed to fetch import job batches',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   POST /api/import-job-batches/:importJobAid/batches
 * @desc    Create a new batch for a specific import job
 * @access  Private
 */
router.post('/:importJobAid/batches', authenticate, [
  body('name').isString().trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('description').optional().isString().trim(),
  body('containerType').isIn(['zip', 'tar.gz']).withMessage('Container type must be either "zip" or "tar.gz"'),
  body('container').optional().isString().trim(),
  body('manifest').optional().isString().trim(),
  body('manifestDigest').optional().isString().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    // Get current configuration
    const config = await getConfig(req.user.id);
    
    // Check if configuration is set
    if (!(await isConfigComplete(req.user.id))) {
      return res.status(400).json({
        success: false,
        error: 'Configuration not set. Please configure archive Web UI and API token first.',
        timestamp: new Date().toISOString()
      });
    }

    const { importJobAid } = req.params;
    const { name, description, containerType, container, manifest, manifestDigest } = req.body;

    // Debug logging


    // Prepare the batch data for the archive API
    const batchData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      containerType: containerType,
      container: container ? container.trim() : '',
      manifest: manifest ? manifest.trim() : '',
      manifestDigest: manifestDigest ? manifestDigest.trim() : ''
    };

    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}${importJobAid}/batches`;




    // Strip PWSAK2 prefix if it exists in the stored token
    const cleanApiToken = config.apiToken.replace(/^PWSAK2\s+/, '');
    
    // Make request to archive system
    const response = await axios.post(url, batchData, {
      headers: {
        'Authorization': `PWSAK2 ${cleanApiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Import-Machine-Backend/1.0.0'
      },
      timeout: 30000 // 30 second timeout
    });

    // Return the response data
    const responseData = response.data;



    res.json({
      success: true,
      message: 'Batch created successfully',
      data: {
        batch: responseData,
        importJobAid
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating batch:', error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      let errorMessage = `Archive API error: ${status} ${error.response.statusText}`;

      // Provide more specific error messages for common status codes
      if (status === 400) {
        errorMessage = 'Invalid batch data. Please check your input and try again.';
      } else if (status === 401) {
        errorMessage = 'Authentication failed. Please check your API token.';
      } else if (status === 403) {
        errorMessage = 'Access denied. You do not have permission to create batches for this import job.';
      } else if (status === 404) {
        errorMessage = 'Import job not found. Please check the import job ID.';
      } else if (status === 409) {
        errorMessage = 'Batch already exists with this name. Please choose a different name.';
      } else if (status >= 500) {
        errorMessage = 'Archive system error. Please try again later.';
      }

      res.status(status).json({
        success: false,
        error: errorMessage,
        details: error.response.data,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(503).json({
        success: false,
        error: 'No response from archive system. Please check the archive Web UI URL and network connectivity.',
        timestamp: new Date().toISOString()
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        success: false,
        error: 'Failed to create batch',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   GET /api/import-job-batches/:importJobAid/batch-report
 * @desc    Get batch report for a specific import job
 * @access  Private
 */
router.get('/:importJobAid/batch-report', authenticate, async (req, res) => {
  try {
    // Get current configuration
    const config = await getConfig(req.user.id);
    
    // Check if configuration is set
    if (!(await isConfigComplete(req.user.id))) {
      return res.status(400).json({
        success: false,
        error: 'Configuration not set. Please configure archive Web UI and API token first.',
        timestamp: new Date().toISOString()
      });
    }

    const { importJobAid } = req.params;



    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}${importJobAid}/batch-report`;



    // Strip PWSAK2 prefix if it exists in the stored token
    const cleanApiToken = config.apiToken.replace(/^PWSAK2\s+/, '');
    
    // Make request to archive system
    const response = await axios.get(url, {
      headers: {
        'Authorization': `PWSAK2 ${cleanApiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Import-Machine-Backend/1.0.0'
      },
      timeout: 30000 // 30 second timeout
    });

    // Return the response data
    const responseData = response.data;



    res.json({
      success: true,
      data: {
        totalCount: responseData.totalCount || 0,
        results: responseData.results || [],
        importJobAid
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching batch report:', error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      let errorMessage = `Archive API error: ${status} ${error.response.statusText}`;

      // Provide more specific error messages for common status codes
      if (status === 400) {
        errorMessage = 'Invalid import job ID. Please check the import job ID and try again.';
      } else if (status === 401) {
        errorMessage = 'Authentication failed. Please check your API token.';
      } else if (status === 403) {
        errorMessage = 'Access denied. You do not have permission to view batch reports for this import job.';
      } else if (status === 404) {
        errorMessage = 'Import job not found. Please check the import job ID.';
      } else if (status >= 500) {
        errorMessage = 'Archive system error. Please try again later.';
      }

      res.status(status).json({
        success: false,
        error: errorMessage,
        details: error.response.data,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(503).json({
        success: false,
        error: 'No response from archive system. Please check the archive Web UI URL and network connectivity.',
        timestamp: new Date().toISOString()
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        success: false,
        error: 'Failed to fetch batch report',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

module.exports = router;
