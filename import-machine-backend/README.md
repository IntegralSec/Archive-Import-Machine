# Import Machine Backend

A Node.js + Express backend API server for the Import Machine application. This server provides a secure proxy layer between the frontend and archive systems, handling authentication, data filtering, and API management.

## 🚀 Features

### Core Functionality
- **API Proxy**: Secure proxy to archive system APIs
- **Configuration Management**: Centralized configuration storage and management
- **Data Filtering**: Automatic filtering of importS3 ingestion points
- **Caching System**: Intelligent caching of ingestion points with automatic expiration
- **Health Monitoring**: Comprehensive health check endpoints
- **Security**: Rate limiting, CORS protection, and input validation

### Security Features
- **Helmet.js**: Security headers and protection
- **Rate Limiting**: Request throttling to prevent abuse
- **CORS Configuration**: Cross-origin resource sharing protection
- **Input Validation**: Request validation using express-validator
- **Error Handling**: Comprehensive error handling and logging

### API Endpoints
- **Authentication**: User registration, login, and token management
- **Health Checks**: Server status and system information
- **Configuration**: CRUD operations for application settings
- **Ingestion Points**: Proxy endpoints for archive system data with caching
- **Import Jobs**: Proxy endpoints for archive system import jobs with caching
- **Cache Management**: Cache statistics and manual cache clearing
- **Connection Testing**: Test connectivity to archive systems

## 🛠️ Technology Stack

- **Runtime**: Node.js 14+
- **Framework**: Express.js 4.18.2
- **Database**: PostgreSQL with Sequelize ORM
- **HTTP Client**: Axios 1.6.0
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express-validator 7.0.1
- **Authentication**: Passport.js with JWT Bearer strategy
- **Password Hashing**: bcryptjs
- **Logging**: Morgan
- **Compression**: Compression middleware
- **Development**: Nodemon, ESLint, Jest

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL Database**: Running PostgreSQL server (version 12 or higher)
- **Archive System Access**: Valid archive web UI URL and API token
- **Network Access**: Ability to reach the archive system and PostgreSQL database

## 💾 Caching System

The backend includes an intelligent caching system for ingestion points to improve performance and reduce load on the archive system:

### Cache Features
- **Automatic Caching**: Ingestion points are automatically cached when fetched from the archive system
- **Expiration**: Cache entries expire after 30 minutes by default
- **User Isolation**: Each user has their own isolated cache
- **Force Refresh**: Support for manual cache refresh via query parameters
- **Cache Statistics**: Real-time cache statistics and monitoring
- **Manual Management**: Ability to clear cache manually

### Cache Endpoints
- `GET /api/ingestion-points?refresh=true` - Force refresh ingestion points cache
- `GET /api/ingestion-points/cache-stats` - Get ingestion points cache statistics
- `POST /api/ingestion-points/clear-cache` - Clear all ingestion points cache for current user
- `GET /api/import-jobs?refresh=true` - Force refresh import jobs cache
- `GET /api/import-jobs/cache-stats` - Get import jobs cache statistics
- `POST /api/import-jobs/clear-cache` - Clear all import jobs cache for current user

### Cache Behavior
- **First Request**: Fetches from archive system and caches the results
- **Subsequent Requests**: Returns cached data if not expired
- **Cache Miss**: Automatically fetches fresh data from archive system
- **Error Handling**: Graceful fallback to archive system if caching fails

### Cache Expiration
- **Ingestion Points**: 30 minutes (longer cache time for relatively static data)
- **Import Jobs**: 15 minutes (shorter cache time for frequently changing data)

## 🚀 Installation & Setup

### 1. Clone and Navigate
```bash
cd import-machine-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

### 4. Database Setup
```bash
# Install PostgreSQL dependencies
npm install

# Test PostgreSQL connection
npm run test:postgres

# Initialize database tables (if needed)
npm run reset-db
```

### 5. Start the Development Server
```bash
npm run dev
```

The server will start on [http://localhost:5000](http://localhost:5000)

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# PostgreSQL Database Configuration
DB_HOST=192.168.50.216
DB_PORT=5432
DB_NAME=import-machine
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

# Archive System Configuration (set via API)
# ARCHIVE_WEB_UI=https://archive.example.com
# API_TOKEN=PWSAK2your_token_here

# S3 Configuration (optional)
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=your_bucket_name

# Security
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Logging
LOG_LEVEL=info
# Set to 'true' to enable verbose console logging (defaults to development mode)
VERBOSE_LOGGING=false
```

## 📝 Logging

The backend includes a comprehensive logging system with configurable verbosity levels:

### Logging Levels
- **File Logging**: All API requests are automatically logged to separate files in the `Logs/` directory
- **Console Logging**: Controlled by environment variables for development vs production

### Environment Variables
- `VERBOSE_LOGGING=true/false`: Enable/disable verbose console logging
- Database query logging is completely disabled for all environments

### Starting with Different Logging Levels

#### Minimal Logging (Recommended for Production)
```bash
# Set environment variable
export VERBOSE_LOGGING=false
npm start

# Or use the quiet start script
node scripts/start-quiet.js
```

#### Verbose Logging (Development)
```bash
# Set environment variable
export VERBOSE_LOGGING=true
npm start

# Or use development mode (defaults to verbose)
npm run dev
```

### Log Files
- **Route-based**: Each API route gets its own log file (e.g., `auth.log`, `config.log`)
- **Location**: `Logs/` directory (created automatically)
- **Format**: JSON lines with detailed request/response information
- **Security**: Sensitive data (passwords, tokens) are automatically redacted

### Log Management
- **View Logs**: Use the `/api/logs` endpoints to view and manage logs
- **Clear Logs**: Delete logs for specific routes via API
- **Statistics**: Get log statistics and overview information

## 📚 API Documentation

### Base URL
```
http://localhost:5000
```

### Authentication Endpoints

#### POST `/api/auth/signup`
Register a new user
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePass123",
  "role": "user"
}
```

Response:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2024-01-27T10:30:00.000Z",
      "lastLogin": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

#### POST `/api/auth/signin`
Authenticate user and get token
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-27T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-01-27T10:30:00.000Z"
}
```

#### GET `/api/auth/me`
Get current user profile (requires authentication)
```bash
Authorization: Bearer <token>
```

#### POST `/api/auth/refresh`
Refresh JWT token (requires authentication)
```bash
Authorization: Bearer <token>
```

### Health Endpoints

#### GET `/api/health`
Basic health check
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0"
}
```

#### GET `/api/health/detailed`
Detailed system information
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0",
  "system": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "arch": "x64",
    "memory": {
      "used": 45,
      "total": 67,
      "external": 12
    },
    "cpu": { "user": 123456, "system": 78901 }
  },
  "services": {
    "database": "not_implemented",
    "external_api": "available"
  }
}
```

### Configuration Endpoints

#### GET `/api/config`
Get current configuration (requires authentication)
```bash
Authorization: Bearer <token>
```
```json
{
  "success": true,
  "data": {
    "archiveWebUI": "https://archive.example.com",
    "apiToken": "***abcd",
    "s3Settings": {
      "accessKeyId": "AKIA...",
      "secretAccessKey": "***xyz",
      "bucketName": "my-bucket"
    }
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

#### POST `/api/config`
Update configuration (partial update, requires authentication)
```bash
Authorization: Bearer <token>
```
```json
{
  "archiveWebUI": "https://new-archive.example.com",
  "apiToken": "PWSAK2new_token_here"
}
```

#### PUT `/api/config`
Replace entire configuration (requires authentication)
```bash
Authorization: Bearer <token>
```
```json
{
  "archiveWebUI": "https://archive.example.com",
  "apiToken": "PWSAK2token_here",
  "s3Settings": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "secret_key",
    "bucketName": "my-bucket"
  }
}
```

#### DELETE `/api/config`
Reset configuration to defaults (requires authentication)
```bash
Authorization: Bearer <token>
```

### Ingestion Points Endpoints

#### GET `/api/ingestion-points`
Get all importS3 ingestion points (requires authentication)
```bash
Authorization: Bearer <token>
```
```json
{
  "success": true,
  "data": {
    "totalCount": 10,
    "importS3Count": 3,
    "results": [
      {
        "aid": "/Web.UI/api/ingestionPoints/123",
        "name": "S3 Import Point",
        "srcShortName": "S3IP",
        "description": "S3 import point",
        "typeDetails": {
          "type": "importS3",
          "awsRegion": "us-east-1",
          "bucketName": "my-bucket",
          "bucketPrefix": "imports/"
        }
      }
    ]
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

#### GET `/api/ingestion-points/:id`
Get specific ingestion point by ID

#### POST `/api/ingestion-points/test-connection`
Test connection to archive system (requires authentication)
```bash
Authorization: Bearer <token>
```
```json
{
  "archiveWebUI": "https://archive.example.com",
  "apiToken": "PWSAK2token_here"
}
```

### Import Jobs Endpoints

#### GET `/api/import-jobs`
Get all import jobs (requires authentication)
```bash
Authorization: Bearer <token>
```
```json
{
  "success": true,
  "data": {
    "totalCount": 5,
    "results": [
      {
        "aid": "/Web.UI/api/imports/123",
        "name": "S3 Import Job",
        "status": "running",
        "description": "Import from S3 bucket",
        "progress": 75,
        "startTime": "2025-01-27T10:00:00.000Z",
        "endTime": null
      }
    ],
    "_cached": true,
    "_cachedAt": "2025-01-27T10:15:00.000Z",
    "_expiresAt": "2025-01-27T10:30:00.000Z"
  },
  "timestamp": "2025-01-27T10:15:00.000Z"
}
```

#### GET `/api/import-jobs/:id`
Get specific import job by ID (requires authentication)

#### GET `/api/import-jobs/cache-stats`
Get import job cache statistics (requires authentication)
```json
{
  "success": true,
  "data": {
    "active": 5,
    "expired": 0,
    "total": 5,
    "cacheExpiryMinutes": 15
  },
  "timestamp": "2025-01-27T10:15:00.000Z"
}
```

#### POST `/api/import-jobs/clear-cache`
Clear all cached import jobs for current user (requires authentication)

## 🔧 Development

### Project Structure
```
import-machine-backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── env.example            # Environment variables template
├── .gitignore            # Git ignore rules
├── models/               # Database models
│   ├── User.js           # User model
│   ├── Configuration.js  # Configuration model
│   ├── IngestionPoint.js # Ingestion point cache model
│   └── ImportJob.js      # Import job cache model
├── services/             # Business logic services
│   ├── cacheService.js           # Ingestion point cache service
│   └── importJobCacheService.js  # Import job cache service
├── routes/               # API route handlers
│   ├── health.js         # Health check endpoints
│   ├── config.js         # Configuration management
│   ├── ingestionPoints.js # Ingestion points proxy with caching
│   └── importJobs.js     # Import jobs proxy with caching
└── README.md             # This file
```

### Available Scripts

- **`npm start`**: Start production server
- **`npm run dev`**: Start development server with nodemon
- **`npm test`**: Run tests
- **`npm run test:postgres`**: Test PostgreSQL database connection
- **`npm run reset-db`**: Reset database and create default admin user
- **`npm run lint`**: Run ESLint
- **`npm run lint:fix`**: Fix ESLint issues

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Test API Endpoints**:
   ```bash
   # Health check
   curl http://localhost:5000/api/health
   
   # Test configuration
   curl http://localhost:5000/api/config
   ```

3. **Monitor Logs**:
   The server logs all requests and errors to the console

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
- **Cause**: PostgreSQL connection issues
- **Solution**: 
  - Verify PostgreSQL server is running
  - Check database credentials in `.env` file
  - Ensure network connectivity to PostgreSQL server
  - Run `npm run test:postgres` to diagnose connection issues

#### "Configuration not set" Error
- **Cause**: Archive Web UI or API token not configured
- **Solution**: Use the configuration endpoints to set up your archive system credentials

#### "Archive API error" Responses
- **Cause**: Issues with the archive system API
- **Solution**: 
  - Verify the archive Web UI URL is correct
  - Check that the API token is valid
  - Ensure network connectivity to the archive system

#### CORS Errors
- **Cause**: Frontend trying to access backend from different origin
- **Solution**: 
  - Set `FRONTEND_URL` in your `.env` file
  - Ensure the frontend URL matches exactly

### Debug Information

The server provides detailed error responses:
```json
{
  "success": false,
  "error": "Archive API error: 401 Unauthorized",
  "details": { "message": "Invalid token" },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

## 🔒 Security

### Security Features
- **Helmet.js**: Security headers and protection
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configured for specific frontend origin
- **Input Validation**: All inputs validated using express-validator
- **Error Handling**: No sensitive information leaked in errors

### Production Considerations
- Use HTTPS in production
- Implement proper authentication/authorization
- Store configuration in secure database
- Use environment variables for sensitive data
- Implement request logging and monitoring

## 🚀 Deployment

### Production Build
```bash
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure `FRONTEND_URL` for your production frontend
3. Set up proper logging and monitoring
4. Configure reverse proxy (nginx) if needed

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the server logs for error details
- Test the health endpoints for system status
- Review the API documentation for endpoint usage
- Contact the development team

---

**Import Machine Backend** - Secure API proxy for archive system integration.
