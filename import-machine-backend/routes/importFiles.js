const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ImportFile } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateImportFileId = param('id')
  .isInt({ min: 1 })
  .withMessage('Invalid import file ID format');

const validateImportFileData = [
  body('import_id').isUUID().withMessage('Import ID must be a valid UUID'),
  body('path').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Path is required and must be between 1 and 10000 characters'),
  body('size_bytes').optional().isInt({ min: 0 }).withMessage('Size bytes must be a non-negative integer'),
  body('sha256').isString().matches(/^[a-fA-F0-9]{64}$/).withMessage('SHA256 must be a valid 64-character hex string'),
  body('status').optional().isInt({ min: 0, max: 6 }),
  body('ingested_at').optional().isISO8601().withMessage('Ingested at must be a valid ISO 8601 date'),
  body('attempt_count').optional().isInt({ min: 0 }),
  body('last_error').optional().isString().isLength({ max: 10000 })
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isInt({ min: 0, max: 6 }),
  query('import_id').optional().isUUID(),
  query('sha256').optional().isString().matches(/^[a-fA-F0-9]{64}$/)
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

// GET /api/import-files - Get all import files with pagination and filtering
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
      if (req.query.sha256) {
        // Convert hex string to buffer for comparison
        whereClause.sha256 = Buffer.from(req.query.sha256, 'hex');
      }

      const { count, rows: importFiles } = await ImportFile.findAndCountAll({
        where: whereClause,
        limit: limit,
        offset: offset,
        order: [['created_at', 'DESC']]
      });

      // Add computed fields
      const filesWithComputed = importFiles.map(file => {
        const fileData = file.toJSON();
        return {
          ...fileData,
          sha256_hex: file.getSha256Hex(),
          status_name: file.getStatusName(),
          size_formatted: file.getSizeFormatted(),
          is_in_queue: file.isInQueue(),
          is_completed: file.isCompleted(),
          is_failed: file.isFailed(),
          is_ingested: file.isIngested(),
          is_skipped_dedup: file.isSkippedDedup(),
          is_quarantined: file.isQuarantined()
        };
      });

      res.json({
        success: true,
        data: {
          import_files: filesWithComputed,
          pagination: {
            page: page,
            limit: limit,
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching import files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch import files'
      });
    }
  }
);

// GET /api/import-files/:id - Get a specific import file by ID
router.get('/:id',
  authenticate,
  validateImportFileId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error fetching import file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch import file'
      });
    }
  }
);

// POST /api/import-files - Create a new import file
router.post('/',
  authenticate,
  validateImportFileData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        import_id,
        path,
        size_bytes,
        sha256,
        status = ImportFile.STATUS.PENDING,
        ingested_at,
        attempt_count = 0,
        last_error
      } = req.body;

      const importFile = await ImportFile.create({
        import_id,
        path,
        size_bytes,
        sha256: Buffer.from(sha256, 'hex'),
        status,
        ingested_at,
        attempt_count,
        last_error
      });

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'Import file created successfully'
      });
    } catch (error) {
      console.error('Error creating import file:', error);
      
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
        error: 'Failed to create import file'
      });
    }
  }
);

// PUT /api/import-files/:id - Update an import file
router.put('/:id',
  authenticate,
  validateImportFileId,
  validateImportFileData,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      const updateData = { ...req.body };
      
      // Convert hex string to buffer if sha256 is provided
      if (updateData.sha256) {
        updateData.sha256 = Buffer.from(updateData.sha256, 'hex');
      }

      await importFile.update(updateData);

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import file updated successfully'
      });
    } catch (error) {
      console.error('Error updating import file:', error);
      
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
        error: 'Failed to update import file'
      });
    }
  }
);

// DELETE /api/import-files/:id - Delete an import file
router.delete('/:id',
  authenticate,
  validateImportFileId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      // Prevent deletion of files that are currently processing
      if (importFile.status === ImportFile.STATUS.PROCESSING) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete import file that is currently being processed'
        });
      }

      await importFile.destroy();

      res.json({
        success: true,
        message: 'Import file deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting import file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete import file'
      });
    }
  }
);

// PATCH /api/import-files/:id/status - Update import file status
router.patch('/:id/status',
  authenticate,
  validateImportFileId,
  body('status').isInt({ min: 0, max: 6 }).withMessage('Status must be between 0 and 6'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      const { status } = req.body;
      const updateData = { status };

      // If marking as ingested or skipped, set ingested_at
      if (status === ImportFile.STATUS.INGESTED || status === ImportFile.STATUS.SKIPPED_DEDUP) {
        updateData.ingested_at = new Date();
      }

      await importFile.update(updateData);

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import file status updated successfully'
      });
    } catch (error) {
      console.error('Error updating import file status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update import file status'
      });
    }
  }
);

// PATCH /api/import-files/:id/ingest - Mark import file as ingested
router.patch('/:id/ingest',
  authenticate,
  validateImportFileId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      await importFile.markIngested();

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import file marked as ingested'
      });
    } catch (error) {
      console.error('Error ingesting import file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark import file as ingested'
      });
    }
  }
);

// PATCH /api/import-files/:id/fail - Mark import file as failed
router.patch('/:id/fail',
  authenticate,
  validateImportFileId,
  body('error_message').optional().isString().isLength({ max: 10000 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      await importFile.markFailed(req.body.error_message);

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import file marked as failed'
      });
    } catch (error) {
      console.error('Error failing import file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark import file as failed'
      });
    }
  }
);

// PATCH /api/import-files/:id/skip-dedup - Mark import file as skipped due to deduplication
router.patch('/:id/skip-dedup',
  authenticate,
  validateImportFileId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      await importFile.markSkippedDedup();

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import file marked as skipped due to deduplication'
      });
    } catch (error) {
      console.error('Error skipping import file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark import file as skipped'
      });
    }
  }
);

// PATCH /api/import-files/:id/quarantine - Mark import file as quarantined
router.patch('/:id/quarantine',
  authenticate,
  validateImportFileId,
  body('reason').optional().isString().isLength({ max: 10000 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFile = await ImportFile.findByPk(req.params.id);

      if (!importFile) {
        return res.status(404).json({
          success: false,
          error: 'Import file not found'
        });
      }

      await importFile.markQuarantined(req.body.reason);

      const fileData = importFile.toJSON();
      const response = {
        ...fileData,
        sha256_hex: importFile.getSha256Hex(),
        status_name: importFile.getStatusName(),
        size_formatted: importFile.getSizeFormatted(),
        is_in_queue: importFile.isInQueue(),
        is_completed: importFile.isCompleted(),
        is_failed: importFile.isFailed(),
        is_ingested: importFile.isIngested(),
        is_skipped_dedup: importFile.isSkippedDedup(),
        is_quarantined: importFile.isQuarantined()
      };

      res.json({
        success: true,
        data: response,
        message: 'Import file marked as quarantined'
      });
    } catch (error) {
      console.error('Error quarantining import file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to quarantine import file'
      });
    }
  }
);

// GET /api/import-files/queue/:import_id - Get files in queue for an import
router.get('/queue/:import_id',
  authenticate,
  param('import_id').isUUID().withMessage('Import ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const importFiles = await ImportFile.findAll({
        where: {
          import_id: req.params.import_id,
          status: [ImportFile.STATUS.PENDING, ImportFile.STATUS.QUEUED, ImportFile.STATUS.PROCESSING]
        },
        order: [['created_at', 'ASC']] // Process oldest first
      });

      const filesWithComputed = importFiles.map(file => {
        const fileData = file.toJSON();
        return {
          ...fileData,
          sha256_hex: file.getSha256Hex(),
          status_name: file.getStatusName(),
          size_formatted: file.getSizeFormatted(),
          is_in_queue: file.isInQueue(),
          is_completed: file.isCompleted(),
          is_failed: file.isFailed(),
          is_ingested: file.isIngested(),
          is_skipped_dedup: file.isSkippedDedup(),
          is_quarantined: file.isQuarantined()
        };
      });

      res.json({
        success: true,
        data: {
          import_files: filesWithComputed,
          count: filesWithComputed.length
        }
      });
    } catch (error) {
      console.error('Error fetching queue files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue files'
      });
    }
  }
);

// GET /api/import-files/stats/:import_id - Get statistics for an import
router.get('/stats/:import_id',
  authenticate,
  param('import_id').isUUID().withMessage('Import ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const stats = await ImportFile.getQueueStats(req.params.import_id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching import file stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch import file statistics'
      });
    }
  }
);

module.exports = router;
