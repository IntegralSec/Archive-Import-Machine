const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const configRoutes = require('./routes/config');
const { router: ingestionPointsRoutes } = require('./routes/ingestionPoints');
const importJobsRoutes = require('./routes/importJobs');
const importJobBatchesRoutes = require('./routes/importJobBatches');
const s3BucketsRoutes = require('./routes/s3Buckets');
const awsAuthRoutes = require('./routes/awsAuth');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const passport = require('passport');
const { initializeDatabase } = require('./models');
const loggingMiddleware = require('./middleware/logging');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration - more permissive for network access
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow any origin in development, or specific origins in production
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - increased limits to prevent crashes during development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Do count failed requests
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom API logging middleware - logs all API requests to separate files
app.use(loggingMiddleware);

// Body parsing middleware (100mb for large EML zip uploads - 1000+ files)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Initialize Passport
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ingestion-points', ingestionPointsRoutes);
app.use('/api/import-jobs', importJobsRoutes);
app.use('/api/import-job-batches', importJobBatchesRoutes);
app.use('/api/s3-buckets', s3BucketsRoutes);
app.use('/api/aws-auth', awsAuthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/logs', logsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Import Machine Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Handle rate limiting errors specifically
  if (err.statusCode === 429) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      status: 429,
      timestamp: new Date().toISOString(),
      retryAfter: err.headers?.['retry-after'] || 60
    });
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Process error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err.message);
  // Don't exit immediately, let the server try to continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection:', reason);
  // Don't exit immediately, let the server try to continue
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Import Machine Backend server running on port ${PORT}`);
  
  // Initialize database
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
});

module.exports = app;
