/**
 * Database Middleware
 * Protects routes that require MongoDB connection
 */

const requireDatabase = (req, res, next) => {
  // Access the server's MongoDB status
  // This will be set by the server
  if (global.isMongoDBConnected) {
    next();
  } else {
    res.status(503).json({
      success: false,
      error: 'Database not available',
      message: 'This feature requires MongoDB connection. Core game features are available without database.'
    });
  }
};

module.exports = { requireDatabase };
