const passport = require('passport');
const BearerStrategy = require('passport-http-bearer').Strategy;
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');

// JWT Secret (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Configure Passport Bearer Strategy
passport.use(new BearerStrategy(async (token, done) => {
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user by ID from token
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return done(null, false);
    }
    
    // Update last login
    await user.update({ lastLogin: new Date() });
    
    return done(null, user);
  } catch (error) {
    return done(null, false);
  }
}));

// Serialize user for session (not used with Bearer strategy but required)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Authentication middleware
const authenticate = passport.authenticate('bearer', { session: false });

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};



// Create new user
const createUser = async (username, email, password, role = 'user') => {
  // Check if user already exists
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [
        { username },
        { email }
      ]
    }
  });
  
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  // Create new user (password will be hashed by the model hook)
  const newUser = await User.create({
    username,
    email,
    password,
    role
  });
  
  return newUser.toJSON();
};

// Find user by credentials
const findUserByCredentials = async (username, password) => {
  const user = await User.findOne({
    where: {
      [Op.or]: [
        { username },
        { email: username }
      ]
    }
  });
  
  if (!user) {
    return null;
  }
  
  const isValidPassword = await user.comparePassword(password);
  
  if (!isValidPassword) {
    return null;
  }
  
  // Update last login
  await user.update({ lastLogin: new Date() });
  
  return user.toJSON();
};

// Get all users (admin only)
const getAllUsers = async () => {
  const users = await User.findAll();
  return users.map(user => user.toJSON());
};

// Get user by ID
const getUserById = async (id) => {
  const user = await User.findByPk(id);
  return user ? user.toJSON() : null;
};

// Update user
const updateUser = async (id, updates) => {
  const user = await User.findByPk(id);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Don't allow updating password through this method
  const { password, ...safeUpdates } = updates;
  
  await user.update(safeUpdates);
  
  return user.toJSON();
};

// Delete user
const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    throw new Error('User not found');
  }
  
  const userData = user.toJSON();
  await user.destroy();
  
  return userData;
};

module.exports = {
  authenticate,
  generateToken,
  createUser,
  findUserByCredentials,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
