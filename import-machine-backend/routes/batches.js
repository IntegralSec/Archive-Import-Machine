const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Batch } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateBatchId = param('id')
  .isUUID()
  .withMessage('Invalid batch ID format');

const validateBatchData = [
  body('source_system').optional().isString().trim().isLength({ max: 255 }),
  body('created_by').optional().isString().trim().isLength({ max: 255 }),
  body('manifest_sha256').optional().isString(),
  body('status').optional().isInt({ min: 0, max: 4 }),
  body('file_count_expected').optional().isInt({ min: 0 }),
  body('file_count_discovered').optional().isInt({ min: 0 }),
  body('file_count_ingested').optional().isInt({ min: 0 }),
  body('metadata').optional().isObject()
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isInt({ min: 0, max: 4 }),
  query('source_system').optional().isString().trim(),
  query('created_by').optional().isString().trim()
];

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

// GET /api/batches - Get all batches with pagination and filtering
router.get('/', 
  authenticate,
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      
      // Build where clause for filtering
      const whereClause = {};
      if (req.query.status !== undefined) {
        whereClause.status = parseInt(req.query.status);
      }
      if (req.query.source_system) {
        whereClause.source_system = req.query.source_system;
      }
      if (req.query.created_by) {
        whereClause.created_by = req.query.created_by;
      }

      const { count, rows: batches } = await Batch.findAndCountAll({
        where: whereClause,
        limit: limit,
        offset: offset,
        order: [['created_at', 'DESC']],
        attributes: {
          exclude: ['manifest_sha256'] // Exclude binary data from list view
        }
      });

      // Add computed fields
      const batchesWithComputed = batches.map(batch => {
        const batchData = batch.toJSON();
        return {
          ...batchData,
          status_name: batch.getStatusName(),
          completion_percentage: batch.getCompletionPercentage(),
          is_in_progress: batch.isInProgress(),
          is_completed: batch.isCompleted(),
          is_failed: batch.isFailed(),
          is_cancelled: batch.isCancelled()
        };
      });

      res.json({
        success: true,
        data: {
          batches: batchesWithComputed,
          pagination: {
            page: page,
            limit: limit,
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch batches'
      });
    }
  }
);

// GET /api/batches/:id - Get a specific batch by ID
router.get('/:id',
  authenticate,
  validateBatchId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const batch = await Batch.findByPk(req.params.id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      const batchData = batch.toJSON();
      const response = {
        ...batchData,
        status_name: batch.getStatusName(),
        completion_percentage: batch.getCompletionPercentage(),
        is_in_progress: batch.isInProgress(),
        is_completed: batch.isCompleted(),
        is_failed: batch.isFailed(),
        is_cancelled: batch.isCancelled()
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch batch'
      });
    }
  }
);

// POST /api/batches - Create a new batch
router.post('/',
  authenticate,
  validateBatchData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        source_system,
        created_by,
        manifest_sha256,
        status = Batch.STATUS.PENDING,
        file_count_expected,
        file_count_discovered = 0,
        file_count_ingested = 0,
        metadata
      } = req.body;

      // Convert hex string to buffer if manifest_sha256 is provided
      let manifestBuffer = null;
      if (manifest_sha256) {
        try {
          manifestBuffer = Buffer.from(manifest_sha256, 'hex');
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid manifest_sha256 format. Must be a valid hex string.'
          });
        }
      }

      const batch = await Batch.create({
        source_system,
        created_by: created_by || req.user.username,
        manifest_sha256: manifestBuffer,
        status,
        file_count_expected,
        file_count_discovered,
        file_count_ingested,
        metadata
      });

      const batchData = batch.toJSON();
      const response = {
        ...batchData,
        status_name: batch.getStatusName(),
        completion_percentage: batch.getCompletionPercentage(),
        is_in_progress: batch.isInProgress(),
        is_completed: batch.isCompleted(),
        is_failed: batch.isFailed(),
        is_cancelled: batch.isCancelled()
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'Batch created successfully'
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      
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
        error: 'Failed to create batch'
      });
    }
  }
);

// PUT /api/batches/:id - Update a batch
router.put('/:id',
  authenticate,
  validateBatchId,
  validateBatchData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const batch = await Batch.findByPk(req.params.id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      const updateData = { ...req.body };

      // Convert hex string to buffer if manifest_sha256 is provided
      if (updateData.manifest_sha256) {
        try {
          updateData.manifest_sha256 = Buffer.from(updateData.manifest_sha256, 'hex');
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid manifest_sha256 format. Must be a valid hex string.'
          });
        }
      }

      await batch.update(updateData);

      const batchData = batch.toJSON();
      const response = {
        ...batchData,
        status_name: batch.getStatusName(),
        completion_percentage: batch.getCompletionPercentage(),
        is_in_progress: batch.isInProgress(),
        is_completed: batch.isCompleted(),
        is_failed: batch.isFailed(),
        is_cancelled: batch.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Batch updated successfully'
      });
    } catch (error) {
      console.error('Error updating batch:', error);
      
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
        error: 'Failed to update batch'
      });
    }
  }
);

// DELETE /api/batches/:id - Delete a batch
router.delete('/:id',
  authenticate,
  validateBatchId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const batch = await Batch.findByPk(req.params.id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      // Prevent deletion of running batches
      if (batch.isInProgress()) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete batch that is currently running or pending'
        });
      }

      await batch.destroy();

      res.json({
        success: true,
        message: 'Batch deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting batch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete batch'
      });
    }
  }
);

// PATCH /api/batches/:id/status - Update batch status
router.patch('/:id/status',
  authenticate,
  validateBatchId,
  body('status').isInt({ min: 0, max: 4 }).withMessage('Status must be between 0 and 4'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const batch = await Batch.findByPk(req.params.id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      const { status } = req.body;
      await batch.update({ status });

      const batchData = batch.toJSON();
      const response = {
        ...batchData,
        status_name: batch.getStatusName(),
        completion_percentage: batch.getCompletionPercentage(),
        is_in_progress: batch.isInProgress(),
        is_completed: batch.isCompleted(),
        is_failed: batch.isFailed(),
        is_cancelled: batch.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Batch status updated successfully'
      });
    } catch (error) {
      console.error('Error updating batch status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update batch status'
      });
    }
  }
);

// PATCH /api/batches/:id/counters - Update file counters
router.patch('/:id/counters',
  authenticate,
  validateBatchId,
  body('file_count_discovered').optional().isInt({ min: 0 }),
  body('file_count_ingested').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const batch = await Batch.findByPk(req.params.id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Batch not found'
        });
      }

      const updateData = {};
      if (req.body.file_count_discovered !== undefined) {
        updateData.file_count_discovered = req.body.file_count_discovered;
      }
      if (req.body.file_count_ingested !== undefined) {
        updateData.file_count_ingested = req.body.file_count_ingested;
      }

      await batch.update(updateData);

      const batchData = batch.toJSON();
      const response = {
        ...batchData,
        status_name: batch.getStatusName(),
        completion_percentage: batch.getCompletionPercentage(),
        is_in_progress: batch.isInProgress(),
        is_completed: batch.isCompleted(),
        is_failed: batch.isFailed(),
        is_cancelled: batch.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Batch counters updated successfully'
      });
    } catch (error) {
      console.error('Error updating batch counters:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update batch counters'
      });
    }
  }
);

module.exports = router;
