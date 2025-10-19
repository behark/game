/**
 * Simple Logger Module for Speed Rivals
 * Provides structured logging with different log levels
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[90m', // Gray
  RESET: '\x1b[0m'
};

class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.logFile = path.join(logsDir, `speed-rivals-${this.getDateString()}.log`);
  }

  getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);
    const color = LOG_COLORS[level] || LOG_COLORS.RESET;
    
    // Console output with color
    console.log(`${color}${formattedMessage}${LOG_COLORS.RESET}`);
    
    // File output without color
    this.writeToFile(formattedMessage);
  }

  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      this.log(LOG_LEVELS.DEBUG, message, meta);
    }
  }

  // Utility methods for specific events
  logRequest(req, res, duration) {
    this.info(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  }

  logError(error, context = {}) {
    this.error(error.message, {
      stack: error.stack,
      ...context
    });
  }

  logPayment(paymentData) {
    this.info('Payment processed', {
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: paymentData.status,
      productType: paymentData.productType
    });
  }

  logGameEvent(event, data = {}) {
    this.info(`Game Event: ${event}`, data);
  }
}

// Create default logger instance
const logger = new Logger('SpeedRivals');

// Express middleware for request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

module.exports = { Logger, logger, requestLogger };
