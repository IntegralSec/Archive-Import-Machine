const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getConfig, isConfigComplete } = require('../config/shared');
const importJobCacheService = require('../services/importJobCacheService');

/**
 * @route   GET /api/import-jobs
 * @desc    Get all import jobs from archive system (with caching)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    console.log(`📋 Import Jobs Request - User: ${req.user.id}, Force Refresh: ${forceRefresh}`);
    
    // Check if configuration is set
    try {
      const configComplete = await isConfigComplete(req.user.id);
      if (!configComplete) {
        console.log(`❌ Configuration incomplete for user ${req.user.id}`);
        return res.status(400).json({
          success: false,
          error: 'Configuration not set. Please configure archive Web UI and API token first.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (configError) {
      console.error('❌ Error checking configuration:', configError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check configuration',
        details: configError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Try to get cached data first (unless force refresh is requested)
    let cachedData = null;
    try {
      cachedData = await importJobCacheService.getCachedImportJobs(req.user.id, forceRefresh);

    } catch (cacheError) {
      console.error('❌ Error accessing cache service:', cacheError);
      // Continue without cache - don't fail the request
      cachedData = null;
    }
    
    if (cachedData && !forceRefresh) {
      // Check if we have a reasonable amount of cached data
      // If we have less than 1 job cached, it might indicate a problem

        // Return cached data
        return res.json({
          success: true,
          data: {
            totalCount: cachedData.length,
            results: cachedData,
            _cached: true,
            _cachedAt: cachedData[0]?._cachedAt,
            _expiresAt: cachedData[0]?._expiresAt
          },
          timestamp: new Date().toISOString()
        });
      }

    // Cache miss or force refresh - fetch from archive system

    
    // Get current configuration
    let config;
    try {
      config = await getConfig(req.user.id);

    } catch (configError) {
      console.error('❌ Error getting configuration:', configError);
      return res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        details: configError.message,
        timestamp: new Date().toISOString()
      });
    }



    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}/web.ui/api/imports/_query`;



    // Strip PWSAK2 prefix if it exists in the stored token
    const cleanApiToken = config.apiToken.replace(/^PWSAK2\s+/, '');
    
    // Make request to archive system
    let response;
    try {
      response = await axios.get(url, {
        headers: {
          'Authorization': `PWSAK2 ${cleanApiToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Import-Machine-Backend/1.0.0'
        },
        timeout: 30000 // 30 second timeout
      });
  
    } catch (axiosError) {
      console.error('❌ Error making request to archive system:', axiosError);
      throw axiosError; // Re-throw to be handled by the outer catch block
    }

    // Return the response data
    const responseData = response.data;
    const allJobs = responseData.results || [];



    // Cache the results
    try {
      await importJobCacheService.cacheImportJobs(req.user.id, allJobs);

    } catch (cacheError) {
      console.error('⚠️ Warning: Failed to cache import jobs:', cacheError);
      // Continue without caching - don't fail the request
      // The response will still include all jobs, but they won't be cached
    }

    const responsePayload = {
      success: true,
      data: {
        totalCount: responseData.totalCount || 0,
        results: allJobs,
        _cached: false,
        _fetchedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };


    res.json(responsePayload);

  } catch (error) {
    console.error('Error fetching import jobs:', error);

    // Handle specific error types
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Cannot connect to archive system. Please check the archive Web UI URL and ensure the service is running.',
        timestamp: new Date().toISOString()
      });
    }

    if (error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Archive system URL not found. Please check the archive Web UI URL configuration.',
        timestamp: new Date().toISOString()
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: 'Request to archive system timed out. Please try again later.',
        timestamp: new Date().toISOString()
      });
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      let errorMessage = `Archive API error: ${status} ${error.response.statusText}`;
      
      // Handle specific HTTP status codes
      if (status === 401) {
        errorMessage = 'Authentication failed. Please check your API token.';
      } else if (status === 403) {
        errorMessage = 'Access denied. Please check your API token permissions.';
      } else if (status === 404) {
        errorMessage = 'Archive API endpoint not found. Please check the archive Web UI URL.';
      } else if (status === 429) {
        errorMessage = 'Too many requests to archive system. Please try again later.';
      } else if (status >= 500) {
        errorMessage = 'Archive system is experiencing issues. Please try again later.';
      }
      
      return res.status(status).json({
        success: false,
        error: errorMessage,
        details: error.response.data,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        success: false,
        error: 'No response from archive system. Please check the archive Web UI URL and network connectivity.',
        timestamp: new Date().toISOString()
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch import jobs',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   POST /api/import-jobs
 * @desc    Create a new import job
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if configuration is set
    if (!(await isConfigComplete(req.user.id))) {
      return res.status(400).json({
        success: false,
        error: 'Configuration not set. Please configure archive Web UI and API token first.',
        timestamp: new Date().toISOString()
      });
    }

    // Get current configuration
    const config = await getConfig(req.user.id);



    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}/web.ui/api/imports`;



    // Strip PWSAK2 prefix if it exists in the stored token
    const cleanApiToken = config.apiToken.replace(/^PWSAK2\s+/, '');
    
    // Make request to archive system
    const response = await axios.post(url, req.body, {
      headers: {
        'Authorization': `PWSAK2 ${cleanApiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Import-Machine-Backend/1.0.0'
      },
      timeout: 30000 // 30 second timeout
    });

    // Clear the cache since we've created a new import job
    try {
      await importJobCacheService.clearAllCache(req.user.id);

    } catch (cacheError) {
      console.error('Warning: Failed to clear import job cache:', cacheError);
      // Continue without clearing cache - don't fail the request
    }

    res.json({
      success: true,
      data: response.data,
      message: 'Import job created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating import job:', error);

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
        error: 'Failed to create import job',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   GET /api/import-jobs/:id
 * @desc    Get specific import job by ID (with caching)
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    // Check if configuration is set
    if (!(await isConfigComplete(req.user.id))) {
      return res.status(400).json({
        success: false,
        error: 'Configuration not set. Please configure archive Web UI and API token first.',
        timestamp: new Date().toISOString()
      });
    }

    // Try to get cached data first (unless force refresh is requested)
    const cachedData = await importJobCacheService.getCachedImportJob(req.user.id, id, forceRefresh);
    
    if (cachedData && !forceRefresh) {
      // Return cached data
      return res.json({
        success: true,
        data: cachedData,
        timestamp: new Date().toISOString()
      });
    }

    // Cache miss or force refresh - fetch from archive system

    
    // Get current configuration
    const config = await getConfig(req.user.id);

    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}/web.ui/api/imports/${id}`;



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

    // Cache the result
    try {
      await importJobCacheService.cacheImportJob(req.user.id, response.data);
    } catch (cacheError) {
      console.error('Warning: Failed to cache import job:', cacheError);
      // Continue without caching - don't fail the request
    }

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching import job:', error);

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: `Archive API error: ${error.response.status} ${error.response.statusText}`,
        details: error.response.data,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      res.status(503).json({
        success: false,
        error: 'No response from archive system. Please check the archive Web UI URL and network connectivity.',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch import job',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   POST /api/import-jobs/clear-cache
 * @desc    Clear all cached import jobs for the current user
 * @access  Private
 */
router.post('/clear-cache', authenticate, async (req, res) => {
  try {
    const clearedCount = await importJobCacheService.clearAllCache(req.user.id);
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} cached import jobs`,
      data: {
        clearedCount: clearedCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing import job cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear import job cache',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/import-jobs/cache-stats
 * @desc    Get import job cache statistics for the current user
 * @access  Private
 */
router.get('/cache-stats', authenticate, async (req, res) => {
  try {
    const stats = await importJobCacheService.getCacheStats(req.user.id);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting import job cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import job cache statistics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;


