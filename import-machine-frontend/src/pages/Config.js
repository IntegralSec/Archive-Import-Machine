import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  TextField,
  Box,
  Divider,
  FormControl,
  FormLabel,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  InputAdornment,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as TestIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_API_BASE } from '../config';

function Config() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { 
    archiveWebUI, 
    apiToken, 
    customerGUID,
    s3Settings,
    loading: configLoading,
    updateArchiveWebUI, 
    updateApiToken, 
    updateCustomerGUID,
    updateS3Settings,
    loadBackendConfig 
  } = useConfig();
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showApiToken, setShowApiToken] = useState(false);
  const [showSecretAccessKey, setShowSecretAccessKey] = useState(false);
  
  const [localArchiveWebUI, setLocalArchiveWebUI] = useState(archiveWebUI);

  // Configuration is loaded by ConfigContext when the app starts
  // Update local state when context changes
  useEffect(() => {
    setLocalArchiveWebUI(archiveWebUI);
  }, [archiveWebUI]);

  // Log when S3 settings are received from context
  useEffect(() => {
    console.log('Config page - Received S3 settings from context:', {
      accessKeyId: s3Settings.accessKeyId ? 'set (' + s3Settings.accessKeyId.substring(0, 8) + '...)' : 'not set',
      secretAccessKey: s3Settings.secretAccessKey ? 'set (' + s3Settings.secretAccessKey.substring(0, 8) + '...)' : 'not set'
    });
  }, [s3Settings]);

  // Track if this is the initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Ensure configuration is loaded when the page is first displayed
  useEffect(() => {
    // Always trigger a config load when the page is first mounted
    if (isInitialLoad) {
      console.log('Config page - First load, triggering config refresh');
      loadBackendConfig();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, loadBackendConfig]);

  // Mark initial load as complete when configuration is loaded
  useEffect(() => {
    if (!configLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [configLoading, isInitialLoad]);

  // Debug logging for S3 settings
  useEffect(() => {
    console.log('Config page - S3 settings updated:', {
      accessKeyId: s3Settings.accessKeyId ? 'set (' + s3Settings.accessKeyId.substring(0, 8) + '...)' : 'not set',
      secretAccessKey: s3Settings.secretAccessKey ? 'set (' + s3Settings.secretAccessKey.substring(0, 8) + '...)' : 'not set'
    });
  }, [s3Settings]);

  const handleApiTokenChange = (e) => {
    const value = e.target.value.trim();
    updateApiToken(value);
  };

  const handleToggleApiTokenVisibility = () => {
    setShowApiToken(!showApiToken);
  };

  const handleToggleSecretAccessKeyVisibility = () => {
    setShowSecretAccessKey(!showSecretAccessKey);
  };

  const handleSaveConfig = async () => {
    // Validate required fields
    if (!localArchiveWebUI.trim()) {
      setSnackbar({
        open: true,
        message: 'Archive Web UI is required',
        severity: 'error'
      });
      return;
    }

    if (!apiToken.trim()) {
      setSnackbar({
        open: true,
        message: 'API Token is required',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      // First, update the context state to ensure consistency
      updateArchiveWebUI(localArchiveWebUI.trim());
      
      // Collect all configuration values from the form
      const configData = {
        archiveWebUI: localArchiveWebUI.trim(),
        apiToken: apiToken.trim(),
        customerGUID: customerGUID.trim(),
        s3Settings: {
          accessKeyId: (s3Settings.accessKeyId || '').trim(),
          secretAccessKey: (s3Settings.secretAccessKey || '').trim()
        }
      };

      console.log('Saving configuration:', {
        ...configData,
        apiToken: configData.apiToken ? '***' + configData.apiToken.slice(-4) : '',
        s3Settings: {
          ...configData.s3Settings,
          secretAccessKey: configData.s3Settings.secretAccessKey ? '***' + configData.s3Settings.secretAccessKey.slice(-4) : ''
        }
      });

      console.log('Auth headers:', getAuthHeaders());
      console.log('Backend URL:', `${BACKEND_API_BASE}/api/config`);

      const response = await fetch(`${BACKEND_API_BASE}/api/config`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        if (data.success) {
          setSnackbar({
            open: true,
            message: 'Configuration saved successfully!',
            severity: 'success'
          });
          
          // Reload configuration from backend to ensure sync
          await loadBackendConfig();
        } else {
          throw new Error(data.error || 'Failed to save configuration');
        }
      } else {
        const errorData = await response.json();
        console.log('Error response data:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSnackbar({
        open: true,
        message: `Failed to save configuration: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!archiveWebUI || !apiToken) {
      setSnackbar({
        open: true,
        message: 'Please enter Archive Web UI and API Token before testing connection',
        severity: 'warning'
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/ingestion-points/test-connection`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archiveWebUI,
          apiToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSnackbar({
            open: true,
            message: `Connection successful! Found ${data.data.importS3Count} importS3 ingestion points.`,
            severity: 'success'
          });
        } else {
          throw new Error(data.error || 'Connection test failed');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setSnackbar({
        open: true,
        message: `Connection test failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshConfig = async () => {
    try {
      await loadBackendConfig();
      setSnackbar({
        open: true,
        message: 'Configuration refreshed successfully from server',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to refresh configuration from server',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };



  // Show loading state while configuration is being loaded
  if (configLoading) {
    return (
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '50vh',
        width: '100%'
      }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading configuration from server...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Box sx={{ width: '100%' }}>
        {/* Header Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h4" component="h1" gutterBottom>
              Configuration
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Configure your application settings for archive access and S3 bucket connections.
            </Typography>
          </CardContent>
        </Card>

        {/* Archive Details Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Archive Details
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormLabel sx={{ minWidth: '150px', fontWeight: 'bold' }}>
                  Archive Web UI: <span style={{ color: 'red' }}>*</span>
                </FormLabel>
                <TextField
                  fullWidth
                  value={localArchiveWebUI}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocalArchiveWebUI(value);
                    updateArchiveWebUI(value);
                  }}
                  variant="outlined"
                  placeholder="https://archive.example.com"
                  helperText="Enter the web URL for the archive interface"
                  size="small"
                  required
                  error={!localArchiveWebUI.trim()}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormLabel sx={{ minWidth: '150px', fontWeight: 'bold' }}>
                  API Token: <span style={{ color: 'red' }}>*</span>
                </FormLabel>
                <TextField
                  fullWidth
                  value={apiToken}
                  onChange={handleApiTokenChange}
                  variant="outlined"
                  type={showApiToken ? 'text' : 'password'}
                  placeholder="Enter your API token (e.g., PWSAK2qDv8rI4=)"
                  helperText="Enter the complete API token including PWSAK2 prefix"
                  size="small"
                  required
                  error={!apiToken.trim()}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleToggleApiTokenVisibility}
                          edge="end"
                          size="small"
                        >
                          {showApiToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormLabel sx={{ minWidth: '150px', fontWeight: 'bold' }}>
                  Customer GUID:
                </FormLabel>
                <TextField
                  fullWidth
                  value={customerGUID}
                  onChange={(e) => updateCustomerGUID(e.target.value)}
                  variant="outlined"
                  placeholder="Enter your customer GUID"
                  helperText="Enter your unique customer identifier"
                  size="small"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* S3 Bucket Connection Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              S3 Bucket Connection
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormLabel sx={{ minWidth: '150px', fontWeight: 'bold' }}>
                  Access Key ID:
                </FormLabel>
                <TextField
                  fullWidth
                  value={s3Settings.accessKeyId}
                  onChange={(e) => updateS3Settings('accessKeyId', e.target.value)}
                  variant="outlined"
                  placeholder="AKIA..."
                  helperText="Enter your AWS Access Key ID"
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormLabel sx={{ minWidth: '150px', fontWeight: 'bold' }}>
                  Secret Access Key:
                </FormLabel>
                <TextField
                  fullWidth
                  value={s3Settings.secretAccessKey}
                  onChange={(e) => updateS3Settings('secretAccessKey', e.target.value)}
                  variant="outlined"
                  type={showSecretAccessKey ? 'text' : 'password'}
                  placeholder="Enter your secret access key"
                  helperText="Your AWS Secret Access Key"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle secret access key visibility"
                          onClick={handleToggleSecretAccessKeyVisibility}
                          edge="end"
                          size="small"
                        >
                          {showSecretAccessKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              

            </Box>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Actions
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto'
            }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveConfig}
                disabled={loading || testing || !localArchiveWebUI.trim() || !apiToken.trim()}
                sx={{ 
                  minWidth: 120,
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                {loading ? 'Saving...' : 'Save Config'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={testing ? <CircularProgress size={20} /> : <TestIcon />}
                onClick={handleTestConnection}
                disabled={loading || testing || !localArchiveWebUI || !apiToken}
                sx={{ 
                  minWidth: 120,
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleRefreshConfig}
                disabled={loading || testing || configLoading}
                sx={{ 
                  minWidth: 120,
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                {configLoading ? 'Loading...' : 'Refresh Config'}
              </Button>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Backend API:</strong> {BACKEND_API_BASE}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Configuration is loaded from the backend API and automatically synchronized with the archive system.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Archive Configuration:</strong> {localArchiveWebUI && apiToken ? '✅ Configured' : '⚠️ Not configured'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>S3 Settings:</strong> {
                  s3Settings.accessKeyId && s3Settings.secretAccessKey
                    ? '✅ Fully configured' 
                    : s3Settings.accessKeyId || s3Settings.secretAccessKey
                    ? '⚠️ Partially configured'
                    : '❌ Not configured'
                }
              </Typography>
              {s3Settings.accessKeyId && (
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  Access Key: {s3Settings.accessKeyId.substring(0, 8)}...
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                <strong>Last Updated:</strong> Configuration loaded from server on page load
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          icon={snackbar.severity === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Config;
