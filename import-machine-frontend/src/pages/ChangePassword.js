import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  useTheme
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { IconButton, InputAdornment } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function ChangePassword() {
  const theme = useTheme();
  const { getAuthHeaders } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTogglePasswordVisibility = (field) => () => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const errors = {};

    // Current password validation
    if (!formData.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }

    // New password validation
    if (!formData.newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])/.test(formData.newPassword)) {
      errors.newPassword = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.newPassword)) {
      errors.newPassword = 'Password must contain at least one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Current password should not be the same as new password
    if (formData.currentPassword && formData.newPassword && 
        formData.currentPassword === formData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setValidationErrors({});

    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.message || 'An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, flexShrink: 0 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
          Change Password
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Update your account password. Make sure to use a strong password that you can remember.
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', justifyContent: 'center', flexGrow: 1 }}>
        <Paper sx={{ p: 4, width: '100%', maxWidth: 500 }}>
          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <TextField
              fullWidth
              label="Current Password"
              type={showPasswords.currentPassword ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={handleInputChange('currentPassword')}
              error={!!validationErrors.currentPassword}
              helperText={validationErrors.currentPassword}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePasswordVisibility('currentPassword')}
                      edge="end"
                    >
                      {showPasswords.currentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* New Password */}
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.newPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={handleInputChange('newPassword')}
              error={!!validationErrors.newPassword}
              helperText={validationErrors.newPassword}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePasswordVisibility('newPassword')}
                      edge="end"
                    >
                      {showPasswords.newPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm New Password */}
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePasswordVisibility('confirmPassword')}
                      edge="end"
                    >
                      {showPasswords.confirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Requirements */}
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50', 
              borderRadius: 1,
              border: theme.palette.mode === 'dark' ? '1px solid' : 'none',
              borderColor: theme.palette.mode === 'dark' ? 'grey.700' : 'transparent'
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1 }}>
                Password Requirements:
              </Typography>
              <Box component="ul" sx={{ 
                margin: 0, 
                paddingLeft: 20, 
                fontSize: '0.875rem', 
                color: 'text.secondary'
              }}>
                <li>At least 8 characters long</li>
                <li>At least one lowercase letter</li>
                <li>At least one uppercase letter</li>
                <li>At least one number</li>
                <li>Must be different from current password</li>
              </Box>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
                disabled={loading}
                sx={{ flexGrow: 1 }}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Password changed successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ChangePassword;
