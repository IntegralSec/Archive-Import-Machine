# API Logging System

This document describes the comprehensive logging system implemented for the Import Machine Backend API.

## Overview

Every API request is automatically logged to separate log files based on the route. The logging system captures detailed information about each request including timing, user information, request/response data, and error details.

## Features

- **Route-based logging**: Each API route gets its own log file
- **Comprehensive data capture**: Request details, response status, timing, user info
- **Security**: Sensitive data (passwords, tokens) are automatically redacted
- **Error tracking**: Full error details including stack traces
- **Performance monitoring**: Request duration tracking
- **User isolation**: Customer GUID and user ID tracking
- **API endpoints**: View and manage logs via REST API

## Log File Structure

Logs are stored in the `Logs/` directory with the following naming convention:
- `auth.log` - Authentication routes
- `config.log` - Configuration routes
- `health.log` - Health check routes
- `ingestion-points.log` - Ingestion points routes
- `import-jobs.log` - Import jobs routes
- `import-job-batches.log` - Import job batches routes
- `s3-buckets.log` - S3 buckets routes
- `aws-auth.log` - AWS authentication routes
- `root.log` - Root endpoint and 404 errors

## Log Entry Format

Each log entry is a JSON object containing:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "method": "POST",
  "url": "/api/auth/login",
  "statusCode": 200,
  "duration": "45ms",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "contentLength": 1024,
  "userId": "user123",
  "customerGuid": "cust456",
  "requestBody": {
    "email": "user@example.com",
    "password": "[REDACTED]"
  },
  "queryParams": {
    "limit": "10"
  }
}
```

## API Endpoints

### Get All Log Files
```
GET /api/logs/files
Authorization: Bearer <token>
```

### Get Logs for Specific Route
```
GET /api/logs/{route}?limit=100
Authorization: Bearer <token>
```

### Get Log Statistics
```
GET /api/logs/stats/overview
Authorization: Bearer <token>
```

### Clear Logs for Route
```
DELETE /api/logs/{route}
Authorization: Bearer <token>
```

## Security Features

- **Authentication required**: All log viewing endpoints require authentication
- **Data sanitization**: Sensitive fields are automatically redacted
- **File isolation**: Each route has its own log file
- **Error handling**: Logging failures don't affect API functionality

## Configuration

The logging system is automatically enabled when the server starts. No additional configuration is required.

## Testing

Use the provided test files to verify the logging system:

1. **test-logging.js** - Node.js script to test logging functionality
2. **test-logging-api.rest** - REST client file for testing log API endpoints

## File Locations

- **Logging Service**: `services/loggingService.js`
- **Logging Middleware**: `middleware/logging.js`
- **Logs API Routes**: `routes/logs.js`
- **Log Files**: `Logs/` directory (created automatically)
- **Test Files**: `test-logging.js`, `test-logging-api.rest`

## Monitoring

The logging system provides several ways to monitor API usage:

1. **Real-time monitoring**: Check log files directly
2. **API monitoring**: Use the logs API endpoints
3. **Performance tracking**: Monitor request durations
4. **Error tracking**: Identify and debug issues
5. **User activity**: Track user and customer activity

## Best Practices

1. **Regular cleanup**: Clear old logs periodically to manage disk space
2. **Monitoring**: Set up alerts for unusual error patterns
3. **Backup**: Consider backing up important log files
4. **Analysis**: Use log data for performance optimization and debugging

## Troubleshooting

### Logs not being created
- Check if the `Logs/` directory exists
- Verify the logging middleware is properly configured
- Check file permissions

### Performance issues
- Monitor log file sizes
- Consider log rotation for high-traffic routes
- Use the `limit` parameter when retrieving logs

### Missing data
- Ensure authentication is working properly
- Check if user information is being passed correctly
- Verify request/response data is being captured
