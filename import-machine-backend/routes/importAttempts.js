const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ImportAttempt } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateImportAttemptId = param('id')
  .isInt({ min: 1 })
  .withMessage('Invalid import attempt ID format');

const validateImportAttemptData = [
  body('import_id').isUUID().withMessage('Import ID must be a valid UUID'),
  body('started_at').optional().isISO8601().withMessage('Started at must be a valid ISO 8601 date'),
  body('ended_at').optional().isISO8601().withMessage('Ended at must be a valid ISO 8601 date'),
  body('status').optional().isInt({ min: 0, max: 4 }),
  body('error_summary').optional().isString().isLength({ max: 10000 })
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isInt({ min: 0, max: 4 }),
  query('import_id').optional().isUUID()
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

// GET /api/import-attempts - Get all import attempts with pagination and filtering
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
      if (req.query.import_id) {
        whereClause.import_id = req.query.import_id;
      }

      const { count, rows: importAttempts } = await ImportAttempt.findAndCountAll({
        where: whereClause,
        limit: limit,
        offset: offset,
        order: [['started_at', 'DESC']]
      });

      // Add computed fields
      const attemptsWithComputed = importAttempts.map(attempt => {
        const attemptData = attempt.toJSON();
        return {
          ...attemptData,
          status_name: attempt.getStatusName(),
          duration_ms: attempt.getDuration(),
          duration_formatted: attempt.getDurationFormatted(),
          is_in_progress: attempt.isInProgress(),
          is_completed: attempt.isCompleted(),
          is_failed: attempt.isFailed(),
          is_cancelled: attempt.isCancelled()
        };
      });

      res.json({
        success: true,
        data: {
          import_attempts: attemptsWithComputed,
          pagination: {
            page: page,
            limit: limit,
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching import attempts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch import attempts'
      });
    }
  }
);

// GET /api/import-attempts/:id - Get a specific import attempt by ID
router.get('/:id',
  authenticate,
  validateImportAttemptId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importAttempt = await ImportAttempt.findByPk(req.params.id);

      if (!importAttempt) {
        return res.status(404).json({
          success: false,
          error: 'Import attempt not found'
        });
      }

      const attemptData = importAttempt.toJSON();
      const response = {
        ...attemptData,
        status_name: importAttempt.getStatusName(),
        duration_ms: importAttempt.getDuration(),
        duration_formatted: importAttempt.getDurationFormatted(),
        is_in_progress: importAttempt.isInProgress(),
        is_completed: importAttempt.isCompleted(),
        is_failed: importAttempt.isFailed(),
        is_cancelled: importAttempt.isCancelled()
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error fetching import attempt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch import attempt'
      });
    }
  }
);

// POST /api/import-attempts - Create a new import attempt
router.post('/',
  authenticate,
  validateImportAttemptData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        import_id,
        started_at,
        ended_at,
        status = ImportAttempt.STATUS.PENDING,
        error_summary
      } = req.body;

      const importAttempt = await ImportAttempt.create({
        import_id,
        started_at: started_at || new Date(),
        ended_at,
        status,
        error_summary
      });

      const attemptData = importAttempt.toJSON();
      const response = {
        ...attemptData,
        status_name: importAttempt.getStatusName(),
        duration_ms: importAttempt.getDuration(),
        duration_formatted: importAttempt.getDurationFormatted(),
        is_in_progress: importAttempt.isInProgress(),
        is_completed: importAttempt.isCompleted(),
        is_failed: importAttempt.isFailed(),
        is_cancelled: importAttempt.isCancelled()
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'Import attempt created successfully'
      });
    } catch (error) {
      console.error('Error creating import attempt:', error);
      
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
        error: 'Failed to create import attempt'
      });
    }
  }
);

// PUT /api/import-attempts/:id - Update an import attempt
router.put('/:id',
  authenticate,
  validateImportAttemptId,
  validateImportAttemptData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importAttempt = await ImportAttempt.findByPk(req.params.id);

      if (!importAttempt) {
        return res.status(404).json({
          success: false,
          error: 'Import attempt not found'
        });
      }

      await importAttempt.update(req.body);

      const attemptData = importAttempt.toJSON();
      const response = {
        ...attemptData,
        status_name: importAttempt.getStatusName(),
        duration_ms: importAttempt.getDuration(),
        duration_formatted: importAttempt.getDurationFormatted(),
        is_in_progress: importAttempt.isInProgress(),
        is_completed: importAttempt.isCompleted(),
        is_failed: importAttempt.isFailed(),
        is_cancelled: importAttempt.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import attempt updated successfully'
      });
    } catch (error) {
      console.error('Error updating import attempt:', error);
      
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
        error: 'Failed to update import attempt'
      });
    }
  }
);

// DELETE /api/import-attempts/:id - Delete an import attempt
router.delete('/:id',
  authenticate,
  validateImportAttemptId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importAttempt = await ImportAttempt.findByPk(req.params.id);

      if (!importAttempt) {
        return res.status(404).json({
          success: false,
          error: 'Import attempt not found'
        });
      }

      // Prevent deletion of running attempts
      if (importAttempt.isInProgress()) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete import attempt that is currently running or pending'
        });
      }

      await importAttempt.destroy();

      res.json({
        success: true,
        message: 'Import attempt deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting import attempt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete import attempt'
      });
    }
  }
);

// PATCH /api/import-attempts/:id/status - Update import attempt status
router.patch('/:id/status',
  authenticate,
  validateImportAttemptId,
  body('status').isInt({ min: 0, max: 4 }).withMessage('Status must be between 0 and 4'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const importAttempt = await ImportAttempt.findByPk(req.params.id);

      if (!importAttempt) {
        return res.status(404).json({
          success: false,
          error: 'Import attempt not found'
        });
      }

      const { status } = req.body;
      const updateData = { status };

      // If marking as completed, failed, or cancelled, set ended_at
      if (status === ImportAttempt.STATUS.COMPLETED || 
          status === ImportAttempt.STATUS.FAILED || 
          status === ImportAttempt.STATUS.CANCELLED) {
        updateData.ended_at = new Date();
      }

      await importAttempt.update(updateData);

      const attemptData = importAttempt.toJSON();
      const response = {
        ...attemptData,
        status_name: importAttempt.getStatusName(),
        duration_ms: importAttempt.getDuration(),
        duration_formatted: importAttempt.getDurationFormatted(),
        is_in_progress: importAttempt.isInProgress(),
        is_completed: importAttempt.isCompleted(),
        is_failed: importAttempt.isFailed(),
        is_cancelled: importAttempt.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import attempt status updated successfully'
      });
    } catch (error) {
      console.error('Error updating import attempt status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update import attempt status'
      });
    }
  }
);

// PATCH /api/import-attempts/:id/complete - Mark import attempt as completed
router.patch('/:id/complete',
  authenticate,
  validateImportAttemptId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importAttempt = await ImportAttempt.findByPk(req.params.id);

      if (!importAttempt) {
        return res.status(404).json({
          success: false,
          error: 'Import attempt not found'
        });
      }

      await importAttempt.markCompleted();

      const attemptData = importAttempt.toJSON();
      const response = {
        ...attemptData,
        status_name: importAttempt.getStatusName(),
        duration_ms: importAttempt.getDuration(),
        duration_formatted: importAttempt.getDurationFormatted(),
        is_in_progress: importAttempt.isInProgress(),
        is_completed: importAttempt.isCompleted(),
        is_failed: importAttempt.isFailed(),
        is_cancelled: importAttempt.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import attempt marked as completed'
      });
    } catch (error) {
      console.error('Error completing import attempt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete import attempt'
      });
    }
  }
);

// PATCH /api/import-attempts/:id/fail - Mark import attempt as failed
router.patch('/:id/fail',
  authenticate,
  validateImportAttemptId,
  body('error_summary').optional().isString().isLength({ max: 10000 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const importAttempt = await ImportAttempt.findByPk(req.params.id);

      if (!importAttempt) {
        return res.status(404).json({
          success: false,
          error: 'Import attempt not found'
        });
      }

      await importAttempt.markFailed(req.body.error_summary);

      const attemptData = importAttempt.toJSON();
      const response = {
        ...attemptData,
        status_name: importAttempt.getStatusName(),
        duration_ms: importAttempt.getDuration(),
        duration_formatted: importAttempt.getDurationFormatted(),
        is_in_progress: importAttempt.isInProgress(),
        is_completed: importAttempt.isCompleted(),
        is_failed: importAttempt.isFailed(),
        is_cancelled: importAttempt.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import attempt marked as failed'
      });
    } catch (error) {
      console.error('Error failing import attempt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark import attempt as failed'
      });
    }
  }
);

// PATCH /api/import-attempts/:id/cancel - Mark import attempt as cancelled
router.patch('/:id/cancel',
  authenticate,
  validateImportAttemptId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importAttempt = await ImportAttempt.findByPk(req.params.id);

      if (!importAttempt) {
        return res.status(404).json({
          success: false,
          error: 'Import attempt not found'
        });
      }

      await importAttempt.markCancelled();

      const attemptData = importAttempt.toJSON();
      const response = {
        ...attemptData,
        status_name: importAttempt.getStatusName(),
        duration_ms: importAttempt.getDuration(),
        duration_formatted: importAttempt.getDurationFormatted(),
        is_in_progress: importAttempt.isInProgress(),
        is_completed: importAttempt.isCompleted(),
        is_failed: importAttempt.isFailed(),
        is_cancelled: importAttempt.isCancelled()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import attempt marked as cancelled'
      });
    } catch (error) {
      console.error('Error cancelling import attempt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel import attempt'
      });
    }
  }
);

module.exports = router;
