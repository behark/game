const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authenticate token middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get fresh user data
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is active
    if (!user.status.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check if user is banned
    if (user.status.isBanned) {
      const banExpired = user.status.banExpires && user.status.banExpires < new Date();
      if (!banExpired) {
        return res.status(403).json({
          success: false,
          error: 'Account is banned',
          banReason: user.status.banReason,
          banExpires: user.status.banExpires
        });
      } else {
        // Ban expired, remove ban status
        user.status.isBanned = false;
        user.status.banReason = undefined;
        user.status.banExpires = undefined;
        await user.save();
      }
    }

    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user && user.status.isActive && !user.status.isBanned) {
        req.user = {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role || 'user'
        };
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Admin authentication middleware
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});

    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Rate limiting for sensitive operations
 */
const sensitiveOperationLimit = (req, res, next) => {
  const key = `sensitive_${req.ip}_${req.user?.id || 'anonymous'}`;

  // This would typically use Redis or similar for distributed rate limiting
  // For now, using a simple in-memory store
  if (!global.sensitiveOpsTracker) {
    global.sensitiveOpsTracker = new Map();
  }

  const now = Date.now();
  const userRecord = global.sensitiveOpsTracker.get(key) || { count: 0, resetTime: now + 60000 };

  if (now > userRecord.resetTime) {
    userRecord.count = 0;
    userRecord.resetTime = now + 60000; // Reset every minute
  }

  if (userRecord.count >= 5) { // Max 5 sensitive operations per minute
    return res.status(429).json({
      success: false,
      error: 'Too many sensitive operations, please wait'
    });
  }

  userRecord.count++;
  global.sensitiveOpsTracker.set(key, userRecord);

  next();
};

/**
 * Validate subscription requirement
 */
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user.isSubscriptionActive) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required',
        upgradeUrl: '/store/subscriptions'
      });
    }

    next();
  } catch (error) {
    console.error('Subscription validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate subscription'
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'speed-rivals',
      audience: 'speed-rivals-players'
    }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: 'speed-rivals',
      audience: 'speed-rivals-players'
    }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
};

/**
 * Log security event
 */
const logSecurityEvent = async (userId, event, details = {}) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.security.loginHistory.unshift({
        ip: details.ip,
        location: details.location,
        userAgent: details.userAgent,
        event: event,
        date: new Date()
      });

      // Keep only last 50 login events
      if (user.security.loginHistory.length > 50) {
        user.security.loginHistory = user.security.loginHistory.slice(0, 50);
      }

      await user.save();
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

/**
 * Validate password strength
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    score: [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, password.length >= minLength]
      .filter(Boolean).length
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authenticateAdmin,
  sensitiveOperationLimit,
  requireSubscription,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  logSecurityEvent,
  validatePasswordStrength
};