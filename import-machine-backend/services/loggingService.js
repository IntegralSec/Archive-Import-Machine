const fs = require('fs');
const path = require('path');

class LoggingService {
  constructor() {
    this.logsDir = path.join(__dirname, '..', 'Logs');
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  getLogFileName(route) {
    // Convert route path to a safe filename
    const safeRoute = route.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${safeRoute}.log`;
  }

  getLogFilePath(route) {
    const fileName = this.getLogFileName(route);
    return path.join(this.logsDir, fileName);
  }

  formatLogEntry(req, res, duration, error = null) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const statusCode = res.statusCode;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    const contentLength = res.get('Content-Length') || 0;
    
    // Get user info if available
    const userId = req.user?.id || req.user?.customerGuid || 'Anonymous';
    const customerGuid = req.user?.customerGuid || 'Unknown';

    let logEntry = {
      timestamp,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent,
      contentLength,
      userId,
      customerGuid
    };

    // Request body data is not logged for security and privacy reasons

    // Add query parameters
    if (Object.keys(req.query).length > 0) {
      logEntry.queryParams = req.query;
    }

    // Add error information if present
    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    return JSON.stringify(logEntry);
  }



  logRequest(route, req, res, duration, error = null) {
    try {
      // Ensure route is a valid string
      const safeRoute = String(route || 'unknown').replace(/[^a-zA-Z0-9-_]/g, '_');
      
      const logEntry = this.formatLogEntry(req, res, duration, error);
      const logFilePath = this.getLogFilePath(safeRoute);
      
      // Ensure logs directory exists
      this.ensureLogsDirectory();
      
      // Append to log file
      fs.appendFileSync(logFilePath, logEntry + '\n');
    } catch (err) {
      console.error('Error writing to log file:', err);
      // Don't throw - logging should never break the application
    }
  }

  // Method to get logs for a specific route
  getLogs(route, limit = 100) {
    try {
      const logFilePath = this.getLogFilePath(route);
      
      if (!fs.existsSync(logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(logFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      // Parse JSON lines and return the last 'limit' entries
      const logs = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(log => log !== null)
        .slice(-limit);

      return logs;
    } catch (err) {
      console.error('Error reading logs:', err);
      return [];
    }
  }

  // Method to clear logs for a specific route
  clearLogs(route) {
    try {
      const logFilePath = this.getLogFilePath(route);
      if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error clearing logs:', err);
      return false;
    }
  }

  // Method to get all available log files
  getAvailableLogFiles() {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files.filter(file => file.endsWith('.log'));
    } catch (err) {
      console.error('Error reading log directory:', err);
      return [];
    }
  }
}

module.exports = new LoggingService();
