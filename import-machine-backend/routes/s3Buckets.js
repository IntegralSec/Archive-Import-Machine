const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { S3Bucket } = require('../models');
const { authenticate } = require('../middleware/auth');
const s3Service = require('../services/s3Service');

const router = express.Router();

// Validation middleware
const validateBucketName = body('name')
  .trim()
  .isLength({ min: 3, max: 63 })
  .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
  .withMessage('Bucket name must be 3-63 characters, lowercase letters, numbers, and hyphens only');

const validateRegion = body('region')
  .isIn([
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2',
    'ap-northeast-1', 'sa-east-1'
  ])
  .withMessage('Invalid AWS region');

const validateBucketId = param('id')
  .isInt({ min: 1 })
  .withMessage('Invalid bucket ID');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// GET /api/s3-buckets - Get all S3 buckets for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    // Get actual S3 buckets from AWS using user's credentials
    const awsBuckets = await s3Service.listBuckets(req.user.id);
    
    // Get bucket locations for each bucket
    const bucketsWithRegions = await Promise.all(
      awsBuckets.map(async (bucket) => {
        try {
          const region = await s3Service.getBucketLocation(req.user.id, bucket.name);
          return {
            ...bucket,
            region: region
          };
        } catch (error) {
          console.error(`Error getting region for bucket ${bucket.name}:`, error);
          return {
            ...bucket,
            region: 'us-east-1' // Default fallback
          };
        }
      })
    );
    
    res.json({
      success: true,
      data: {
        totalCount: bucketsWithRegions.length,
        results: bucketsWithRegions
      }
    });
  } catch (error) {
    console.error('Error fetching S3 buckets:', error);
    
    // Check if it's a credentials error
    if (error.message.includes('S3 credentials not configured')) {
      return res.status(400).json({
        success: false,
        error: 'S3 credentials not configured. Please configure your AWS credentials in the Config page.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: `Failed to fetch S3 buckets: ${error.message}`
    });
  }
});

// GET /api/s3-buckets/:id - Get a specific S3 bucket
router.get('/:id', authenticate, validateBucketId, handleValidationErrors, async (req, res) => {
  try {
    const bucket = await S3Bucket.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!bucket) {
      return res.status(404).json({
        success: false,
        error: 'S3 bucket not found'
      });
    }

    res.json({
      success: true,
      data: bucket
    });
  } catch (error) {
    console.error('Error fetching S3 bucket:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch S3 bucket'
    });
  }
});

// POST /api/s3-buckets - Create a new S3 bucket
router.post('/', 
  authenticate,
  validateBucketName,
  validateRegion,
  body('description').optional().isString().trim(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, region, description } = req.body;

      // Create the actual S3 bucket using AWS API
      const createdBucket = await s3Service.createBucket(req.user.id, name, region);

      res.status(201).json({
        success: true,
        data: {
          name: createdBucket.name,
          region: createdBucket.region,
          creationDate: new Date(),
          description: description || null
        },
        message: 'S3 bucket created successfully'
      });
    } catch (error) {
      console.error('Error creating S3 bucket:', error);
      
      // Handle specific AWS errors
      if (error.code === 'BucketAlreadyExists') {
        return res.status(409).json({
          success: false,
          error: 'Bucket name already exists. S3 bucket names must be globally unique.'
        });
      }
      
      if (error.code === 'InvalidBucketName') {
        return res.status(400).json({
          success: false,
          error: 'Invalid bucket name. Bucket names must be 3-63 characters, lowercase letters, numbers, and hyphens only.'
        });
      }
      
      if (error.code === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Please check your AWS credentials and permissions.'
        });
      }

      res.status(500).json({
        success: false,
        error: `Failed to create S3 bucket: ${error.message}`
      });
    }
  }
);

// PUT /api/s3-buckets/:id - Update an S3 bucket
router.put('/:id',
  authenticate,
  validateBucketId,
  validateRegion,
  body('description').optional().isString().trim(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { region, description } = req.body;

      const bucket = await S3Bucket.findOne({
        where: {
          id: req.params.id,
          user_id: req.user.id
        }
      });

      if (!bucket) {
        return res.status(404).json({
          success: false,
          error: 'S3 bucket not found'
        });
      }

      // Only allow updates if bucket is active
      if (bucket.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Cannot update bucket while it is not active'
        });
      }

      // Update the bucket
      await bucket.update({
        region,
        description: description || null
      });

      res.json({
        success: true,
        data: bucket,
        message: 'S3 bucket updated successfully'
      });
    } catch (error) {
      console.error('Error updating S3 bucket:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update S3 bucket'
      });
    }
  }
);

// DELETE /api/s3-buckets/:name - Delete an S3 bucket by name
router.delete('/:name',
  authenticate,
  async (req, res) => {
    try {
      const bucketName = req.params.name;

      if (!bucketName || bucketName.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Bucket name is required'
        });
      }

      // Delete the actual S3 bucket using AWS API
      await s3Service.deleteBucket(req.user.id, bucketName);

      res.json({
        success: true,
        message: 'S3 bucket deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting S3 bucket:', error);
      
      // Handle specific AWS errors
      if (error.code === 'NoSuchBucket') {
        return res.status(404).json({
          success: false,
          error: 'Bucket not found'
        });
      }
      
      if (error.code === 'BucketNotEmpty') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete bucket: bucket is not empty. Please delete all objects first.'
        });
      }
      
      if (error.code === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Please check your AWS credentials and permissions.'
        });
      }

      res.status(500).json({
        success: false,
        error: `Failed to delete S3 bucket: ${error.message}`
      });
    }
  }
);

// GET /api/s3-buckets/:name/objects - Get objects in a bucket
router.get('/:name/objects',
  authenticate,
  async (req, res) => {
    try {
      const bucketName = req.params.name;
      const prefix = req.query.prefix || '';
      const maxKeys = parseInt(req.query.maxKeys) || 1000;

      if (!bucketName || bucketName.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Bucket name is required'
        });
      }

      // Get actual objects from S3 using AWS API
      const objects = await s3Service.listBucketObjects(req.user.id, bucketName, prefix, maxKeys);

      res.json({
        success: true,
        data: {
          bucketName: bucketName,
          totalCount: objects.length,
          results: objects
        }
      });
    } catch (error) {
      console.error('Error fetching bucket objects:', error);
      
      // Handle specific AWS errors
      if (error.code === 'NoSuchBucket') {
        return res.status(404).json({
          success: false,
          error: 'Bucket not found'
        });
      }
      
      if (error.code === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Please check your AWS credentials and permissions.'
        });
      }

      res.status(500).json({
        success: false,
        error: `Failed to fetch bucket objects: ${error.message}`
      });
    }
  }
);

// POST /api/s3-buckets/:name/upload - Upload a file to S3 bucket
router.post('/:name/upload',
  authenticate,
  async (req, res) => {
    try {
      const bucketName = req.params.name;
      const { key, fileBuffer, contentType } = req.body;

      if (!bucketName || bucketName.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Bucket name is required'
        });
      }

      if (!key || key.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'File key is required'
        });
      }

      if (!fileBuffer) {
        return res.status(400).json({
          success: false,
          error: 'File buffer is required'
        });
      }

      // Convert base64 string back to buffer
      const buffer = Buffer.from(fileBuffer, 'base64');

      // Upload file to S3
      const result = await s3Service.uploadFile(req.user.id, bucketName, key, buffer, contentType);

      res.json({
        success: true,
        data: result,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      
      // Handle specific AWS errors
      if (error.code === 'NoSuchBucket') {
        return res.status(404).json({
          success: false,
          error: 'Bucket not found'
        });
      }
      
      if (error.code === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Please check your AWS credentials and permissions.'
        });
      }

      res.status(500).json({
        success: false,
        error: `Failed to upload file: ${error.message}`
      });
    }
  }
);

// POST /api/s3-buckets/:name/create-folder - Create a folder in S3 bucket
router.post('/:name/create-folder',
  authenticate,
  async (req, res) => {
    try {
      const bucketName = req.params.name;
      const { folderPath } = req.body;

      if (!bucketName || bucketName.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Bucket name is required'
        });
      }

      if (!folderPath || folderPath.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Folder path is required'
        });
      }

      // Create folder in S3
      const result = await s3Service.createFolder(req.user.id, bucketName, folderPath);

      res.json({
        success: true,
        data: result,
        message: 'Folder created successfully'
      });
    } catch (error) {
      console.error('Error creating folder in S3:', error);
      
      // Handle specific AWS errors
      if (error.code === 'NoSuchBucket') {
        return res.status(404).json({
          success: false,
          error: 'Bucket not found'
        });
      }
      
      if (error.code === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Please check your AWS credentials and permissions.'
        });
      }

      res.status(500).json({
        success: false,
        error: `Failed to create folder: ${error.message}`
      });
    }
  }
);

// GET /api/s3-buckets/:name/download/:key - Download a file from S3 bucket
router.get('/:name/download/*', authenticate, async (req, res) => {
  try {
    const bucketName = req.params.name;
    const key = req.params[0]; // Get the rest of the path as the key

    if (!bucketName || bucketName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Bucket name is required'
      });
    }

    if (!key || key.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'File key is required'
      });
    }

    // Download file from S3
    const result = await s3Service.downloadFile(req.user.id, bucketName, key);

    // Set appropriate headers for file download
    const fileName = key.split('/').pop(); // Get filename from key
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Last-Modified', result.lastModified);
    res.setHeader('ETag', result.etag);

    // Send the file content
    res.send(result.body);
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    
    // Handle specific AWS errors
    if (error.code === 'NoSuchBucket') {
      return res.status(404).json({
        success: false,
        error: 'Bucket not found'
      });
    }
    
    if (error.code === 'NoSuchKey') {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    if (error.code === 'AccessDenied') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Please check your AWS credentials and permissions.'
      });
    }

    res.status(500).json({
      success: false,
      error: `Failed to download file: ${error.message}`
    });
  }
});

// GET /api/s3-buckets/test-connection - Test S3 connection
router.get('/test-connection', authenticate, async (req, res) => {
  try {
    const result = await s3Service.testConnection(req.user.id);
    
    res.json({
      success: true,
      data: result,
      message: 'S3 connection test successful'
    });
  } catch (error) {
    console.error('Error testing S3 connection:', error);
    
    // Check if it's a credentials error
    if (error.message.includes('S3 credentials not configured')) {
      return res.status(400).json({
        success: false,
        error: 'S3 credentials not configured. Please configure your AWS credentials in the Config page.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: `S3 connection test failed: ${error.message}`
    });
  }
});

module.exports = router;
