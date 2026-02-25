// Simple logging utility with environment-based control
const isVerboseLogging = process.env.VERBOSE_LOGGING === 'true' || process.env.NODE_ENV === 'development';

class Logger {
  static log(...args) {
    if (isVerboseLogging) {
      console.log(...args);
    }
  }

  static error(...args) {
    // Always log errors
    console.error(...args);
  }

  static warn(...args) {
    // Always log warnings
    console.warn(...args);
  }

  static info(...args) {
    if (isVerboseLogging) {
      console.log(...args);
    }
  }

  static debug(...args) {
    if (isVerboseLogging) {
      console.log('[DEBUG]', ...args);
    }
  }
}

module.exports = Logger;
