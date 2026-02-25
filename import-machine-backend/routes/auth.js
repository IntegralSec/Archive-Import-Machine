const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const { 
  authenticate, 
  generateToken, 
  createUser, 
  findUserByCredentials,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../middleware/auth');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { username, email, password, role = 'user' } = req.body;

    // Create new user
    const newUser = await createUser(username, email, password, role);

    // Generate JWT token
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: newUser,
        token
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/signin
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post('/signin', [
  body('username')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { username, password } = req.body;

    // Find user by credentials
    const user = await findUserByCredentials(username, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        user,
        token
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/users', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin role required.',
      timestamp: new Date().toISOString()
    });
  }

  const users = getAllUsers();

  res.json({
    success: true,
    data: {
      users,
      count: users.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/auth/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/users/:id', authenticate, (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin role required.',
      timestamp: new Date().toISOString()
    });
  }

  const userId = parseInt(req.params.id);
  const user = getUserById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      user
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update user (admin only)
 * @access  Private (Admin)
 */
router.put('/users/:id', [
  authenticate,
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either "user" or "admin"')
], (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.',
        timestamp: new Date().toISOString()
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const userId = parseInt(req.params.id);
    const updates = req.body;

    // Update user
    const updatedUser = updateUser(userId, updates);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
router.delete('/users/:id', authenticate, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.',
        timestamp: new Date().toISOString()
      });
    }

    const userId = parseInt(req.params.id);

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        timestamp: new Date().toISOString()
      });
    }

    // Delete user
    const deletedUser = deleteUser(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        user: deletedUser
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Import User model
    const { User } = require('../models');

    // Find user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
        timestamp: new Date().toISOString()
      });
    }

    // Check if new password is different from current password
    const isNewPasswordSame = await user.comparePassword(newPassword);
    if (isNewPasswordSame) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password',
        timestamp: new Date().toISOString()
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticate, (req, res) => {
  // Generate new token
  const token = generateToken(req.user);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
