const express = require('express');
const router = express.Router();
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const {
  authenticateToken,
  sensitiveOperationLimit,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  logSecurityEvent,
  validatePasswordStrength
} = require('../middleware/auth');

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow more login attempts
  message: {
    success: false,
    error: 'Too many login attempts, please try again later'
  }
});

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', authRateLimit, async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Validate username
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 20 characters'
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username can only contain letters, numbers, and underscores'
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.username.toLowerCase() === username.toLowerCase()
          ? 'Username already taken'
          : 'Email already registered'
      });
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: password,
      profile: {
        displayName: username
      },
      status: {
        emailVerificationToken: crypto.randomBytes(32).toString('hex')
      }
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log registration
    await logSecurityEvent(user._id, 'registration', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.profile.displayName,
        level: user.progression.level,
        speedCoins: user.wallet.speedCoins,
        racePoints: user.wallet.racePoints
      },
      tokens: {
        accessToken: token,
        refreshToken: refreshToken,
        expiresIn: '7d'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.security.lockedUntil && user.security.lockedUntil > new Date()) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to too many failed attempts',
        lockedUntil: user.security.lockedUntil
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      user.security.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.security.failedLoginAttempts >= 5) {
        user.security.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await user.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        attemptsRemaining: Math.max(0, 5 - user.security.failedLoginAttempts)
      });
    }

    // Check if account is active
    if (!user.status.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check if account is banned
    if (user.status.isBanned) {
      const banExpired = user.status.banExpires && user.status.banExpires < new Date();
      if (!banExpired) {
        return res.status(403).json({
          success: false,
          error: 'Account is banned',
          banReason: user.status.banReason,
          banExpires: user.status.banExpires
        });
      }
    }

    // Reset failed login attempts
    user.security.failedLoginAttempts = 0;
    user.security.lockedUntil = undefined;
    user.security.lastLoginIP = req.ip;

    await user.save();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Log successful login
    await logSecurityEvent(user._id, 'login', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.profile.displayName,
        level: user.progression.level,
        rank: user.progression.rank,
        speedCoins: user.wallet.speedCoins,
        racePoints: user.wallet.racePoints,
        isSubscriptionActive: user.isSubscriptionActive,
        battlePass: {
          tier: user.battlePass.tier || 0,
          isPremium: user.battlePass.isPremium || false,
          currentSeason: user.battlePass.currentSeason
        }
      },
      tokens: {
        accessToken: token,
        refreshToken: refreshToken,
        expiresIn: '7d'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.status.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newToken = generateToken(user);

    res.json({
      success: true,
      accessToken: newToken,
      expiresIn: '7d'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout
    await logSecurityEvent(req.user.id, 'logout', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -security.twoFactorSecret -status.emailVerificationToken -status.passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, country, timezone } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update profile fields
    if (displayName && displayName.trim().length > 0) {
      if (displayName.trim().length > 30) {
        return res.status(400).json({
          success: false,
          error: 'Display name must be 30 characters or less'
        });
      }
      user.profile.displayName = displayName.trim();
    }

    if (country) {
      user.profile.country = country;
    }

    if (timezone) {
      user.profile.timezone = timezone;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.profile.displayName,
        country: user.profile.country,
        timezone: user.profile.timezone
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

/**
 * Change password
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticateToken, sensitiveOperationLimit, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'New password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change
    await logSecurityEvent(user._id, 'password_change', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.status.passwordResetToken = resetToken;
    user.status.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.save();

    // In a real application, you would send an email here
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', authRateLimit, async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    const user = await User.findOne({
      'status.passwordResetToken': token,
      'status.passwordResetExpires': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.status.passwordResetToken = undefined;
    user.status.passwordResetExpires = undefined;

    await user.save();

    // Log password reset
    await logSecurityEvent(user._id, 'password_reset', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

/**
 * Get user security info
 * GET /api/auth/security
 */
router.get('/security', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('security.loginHistory security.lastLoginIP security.twoFactorEnabled');

    res.json({
      success: true,
      security: {
        lastLoginIP: user.security.lastLoginIP,
        twoFactorEnabled: user.security.twoFactorEnabled,
        recentLogins: user.security.loginHistory.slice(0, 10) // Last 10 logins
      }
    });

  } catch (error) {
    console.error('Get security info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security information'
    });
  }
});

module.exports = router;