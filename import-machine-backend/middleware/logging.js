const loggingService = require('../services/loggingService');

const loggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Store the original end method
  const originalEnd = res.end;
  
  // Override the end method to capture response data
  res.end = function(chunk, encoding) {
    try {
      const duration = Date.now() - startTime;
      
      // Determine the route name from the request path
      let routeName = 'root';
      const fullPath = req.originalUrl || req.url || req.path;
      
      if (fullPath.startsWith('/api/')) {
        // Extract the main route from the API path
        const pathParts = fullPath.split('/');
        if (pathParts.length >= 3) {
          routeName = pathParts[2]; // e.g., 'auth', 'config', 'ingestion-points', etc.
        }
      }
      
      // Log the request
      loggingService.logRequest(routeName, req, res, duration);
    } catch (error) {
      // Don't let logging errors affect the response
      console.error('Logging error:', error);
    }
    
    // Call the original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  // Handle errors
  const originalError = res.error;
  res.error = function(error) {
    try {
      const duration = Date.now() - startTime;
      
      let routeName = 'root';
      const fullPath = req.originalUrl || req.url || req.path;
      
      if (fullPath.startsWith('/api/')) {
        const pathParts = fullPath.split('/');
        if (pathParts.length >= 3) {
          routeName = pathParts[2];
        }
      }
      
      // Log the error
      loggingService.logRequest(routeName, req, res, duration, error);
    } catch (loggingError) {
      // Don't let logging errors affect error handling
      console.error('Error logging error:', loggingError);
    }
    
    if (originalError) {
      originalError.call(this, error);
    }
  };
  
  next();
};

module.exports = loggingMiddleware;
