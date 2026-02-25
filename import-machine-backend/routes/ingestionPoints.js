const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getConfig, isConfigComplete } = require('../config/shared');

// Temporarily disabled cache service to fix initialization issues
// let cacheService = null;
// const getCacheService = () => {
//   if (!cacheService) {
//     cacheService = require('../services/cacheService');
//   }
//   return cacheService;
// };

/**
 * @route   GET /api/ingestion-points
 * @desc    Get all ingestion points from archive system (with caching)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    // Check if configuration is set
    if (!(await isConfigComplete(req.user.id))) {
      return res.status(400).json({
        success: false,
        error: 'Configuration not set. Please configure archive Web UI and API token first.',
        timestamp: new Date().toISOString()
      });
    }

    // Temporarily disabled caching - always fetch fresh data
    // const cachedData = await getCacheService().getCachedIngestionPoints(req.user.id, forceRefresh);
    // 
    // if (cachedData && !forceRefresh) {
    //   // Return cached data
    //   const importS3Items = cachedData.filter(item => 
    //     item.typeDetails && item.typeDetails.type === 'importS3'
    //   );
    // 
    //   return res.json({
    //     success: true,
    //     data: {
    //       totalCount: cachedData.length,
    //       importS3Count: importS3Items.length,
    //       results: importS3Items,
    //       _cached: true,
    //       _cachedAt: cachedData[0]?._cachedAt,
    //       _expiresAt: cachedData[0]?._expiresAt
    //     },
    //     timestamp: new Date().toISOString()
    //   });
    // }

    // Always fetch fresh data (caching temporarily disabled)

    
    // Get current configuration
    const config = await getConfig(req.user.id);



    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}/web.ui/api/ingestionPoints/_query`;

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

    // Filter for importS3 type items only
    const allItems = response.data.results || [];
    const importS3Items = allItems.filter(item => 
      item.typeDetails && item.typeDetails.type === 'importS3'
    );

    // Temporarily disabled caching
    // try {
    //   await getCacheService().cacheIngestionPoints(req.user.id, allItems);
    // } catch (cacheError) {
    //   console.error('Warning: Failed to cache ingestion points:', cacheError);
    //   // Continue without caching - don't fail the request
    // }

    res.json({
      success: true,
      data: {
        totalCount: response.data.totalCount || 0,
        importS3Count: importS3Items.length,
        results: importS3Items,
        _cached: false,
        _fetchedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching ingestion points:', error);

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
        error: 'Failed to fetch ingestion points',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   GET /api/ingestion-points/:id
 * @desc    Get specific ingestion point by ID (with caching)
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
    const cachedData = await cacheService.getCachedIngestionPoint(req.user.id, id, forceRefresh);
    
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

    // Construct the URL for the specific ingestion point
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}/web.ui/api/ingestionPoints/${id}`;



    // Make request to archive system
    const response = await axios.get(url, {
      headers: {
        'Authorization': `PWSAK2 ${config.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Import-Machine-Backend/1.0.0'
      },
      timeout: 30000
    });

    // Cache the result
    try {
      await cacheService.cacheIngestionPoint(req.user.id, response.data);
    } catch (cacheError) {
      console.error('Warning: Failed to cache ingestion point:', cacheError);
      // Continue without caching - don't fail the request
    }

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error fetching ingestion point ${req.params.id}:`, error);

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
        error: 'No response from archive system',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ingestion point',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   POST /api/ingestion-points/test-connection
 * @desc    Test connection to archive system
 * @access  Private
 */
router.post('/test-connection', authenticate, async (req, res) => {
  try {
    const { archiveWebUI, apiToken } = req.body;

    if (!archiveWebUI || !apiToken) {
      return res.status(400).json({
        success: false,
        error: 'Archive Web UI and API token are required',
        timestamp: new Date().toISOString()
      });
    }

    // Construct the URL for testing
    const baseUrl = archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}/web.ui/api/ingestionPoints/_query`;



    // Strip PWSAK2 prefix if it exists in the provided token
    const cleanApiToken = apiToken.replace(/^PWSAK2\s+/, '');
    
    // Make test request
    const response = await axios.get(url, {
      headers: {
        'Authorization': `PWSAK2 ${cleanApiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Import-Machine-Backend/1.0.0'
      },
      timeout: 10000 // 10 second timeout for testing
    });

    res.json({
      success: true,
      message: 'Connection successful',
      data: {
        status: response.status,
        totalCount: response.data.totalCount || 0,
        importS3Count: (response.data.results || []).filter(item => 
          item.typeDetails && item.typeDetails.type === 'importS3'
        ).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Connection test failed:', error);

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: `Connection failed: ${error.response.status} ${error.response.statusText}`,
        details: error.response.data,
        timestamp: new Date().toISOString()
      });
    } else if (error.request) {
      res.status(503).json({
        success: false,
        error: 'Connection failed: No response from archive system',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Connection test failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   POST /api/ingestion-points/clear-cache
 * @desc    Clear all cached ingestion points for the current user
 * @access  Private
 */
router.post('/clear-cache', authenticate, async (req, res) => {
  try {
    // Temporarily disabled cache clearing
    // const clearedCount = await getCacheService().clearAllCache(req.user.id);
    
    res.json({
      success: true,
      message: 'Cache clearing temporarily disabled',
      data: {
        clearedCount: 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/ingestion-points
 * @desc    Create a new ingestion point in the archive system
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

    // Validate required fields
    const { name, srcShortName, description, typeDetails } = req.body;
    
    if (!name || !srcShortName || !typeDetails || !typeDetails.bucketName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, srcShortName, and typeDetails.bucketName are required.',
        timestamp: new Date().toISOString()
      });
    }

    // Prepare the ingestion point data
    const ingestionPointData = {
      name: name.trim(),
      srcShortName: srcShortName.trim(),
      description: description ? description.trim() : '',
      typeDetails: {
        type: typeDetails.type || 'importS3',
        dailyVolume: typeDetails.dailyVolume ? typeDetails.dailyVolume.trim() : '',
        dailySize: typeDetails.dailySize ? typeDetails.dailySize.trim() : '',
        bucketName: typeDetails.bucketName.trim(),
        bucketPrefix: typeDetails.bucketPrefix ? typeDetails.bucketPrefix.trim() : '',
        awsRegion: typeDetails.awsRegion || 'us-east-1'
      }
    };

    // Debug logging


    // Construct the URL for the archive API
    const baseUrl = config.archiveWebUI.replace(/\/$/, '');
    const url = `${baseUrl}/web.ui/api/ingestionPoints`;




    // Strip PWSAK2 prefix if it exists in the stored token
    const cleanApiToken = config.apiToken.replace(/^PWSAK2\s+/, '');
    
    // Make request to archive system
    const response = await axios.post(url, ingestionPointData, {
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
      message: 'Ingestion point created successfully',
      data: {
        ingestionPoint: responseData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating ingestion point:', error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      let errorMessage = `Archive API error: ${status} ${error.response.statusText}`;

      // Provide more specific error messages for common status codes
      if (status === 400) {
        errorMessage = 'Invalid ingestion point data. Please check your input and try again.';
      } else if (status === 401) {
        errorMessage = 'Authentication failed. Please check your API token.';
      } else if (status === 403) {
        errorMessage = 'Access denied. You do not have permission to create ingestion points.';
      } else if (status === 409) {
        errorMessage = 'Ingestion point already exists with this name. Please choose a different name.';
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
        error: 'Failed to create ingestion point',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @route   GET /api/ingestion-points/cache-stats
 * @desc    Get cache statistics for the current user
 * @access  Private
 */
router.get('/cache-stats', authenticate, async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats(req.user.id);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = { router };
