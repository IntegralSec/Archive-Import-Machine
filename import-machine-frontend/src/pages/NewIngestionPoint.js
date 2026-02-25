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
  Grid
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function NewIngestionPoint() {
  const navigate = useNavigate();
  const location = useLocation();
  const { archiveWebUI, apiToken } = useConfig();
  const { getAuthHeaders } = useAuth();
  
  // Get pre-filled data from navigation state
  const prefillData = location.state?.prefillData || {};
  
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Pre-fill form data if provided via navigation state
  useEffect(() => {
    if (prefillData.bucketName || prefillData.bucketPrefix || prefillData.awsRegion) {
      setFormData(prev => ({
        ...prev,
        typeDetails: {
          ...prev.typeDetails,
          bucketName: prefillData.bucketName || prev.typeDetails.bucketName,
          bucketPrefix: prefillData.bucketPrefix || prev.typeDetails.bucketPrefix,
          awsRegion: prefillData.awsRegion || prev.typeDetails.awsRegion
        }
      }));
    }
  }, [prefillData]);
  
  const [formData, setFormData] = useState({
    name: '',
    srcShortName: '',
    description: '',
    typeDetails: {
      type: 'importS3',
      dailyVolume: '',
      dailySize: '',
      bucketName: '',
      bucketPrefix: '',
      awsRegion: 'us-east-1'
    }
  });

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.name.trim()) {
      setSnackbar({
        open: true,
        message: 'Name is required.',
        severity: 'error'
      });
      return;
    }

    if (!formData.srcShortName.trim()) {
      setSnackbar({
        open: true,
        message: 'Short Name is required.',
        severity: 'error'
      });
      return;
    }

    if (!formData.typeDetails.bucketName.trim()) {
      setSnackbar({
        open: true,
        message: 'S3 Bucket Name is required.',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    setSnackbar({ open: false, message: '', severity: 'success' });

    try {
      // Prepare the ingestion point data
      const ingestionPointData = {
        name: formData.name.trim(),
        srcShortName: formData.srcShortName.trim(),
        description: formData.description.trim(),
        typeDetails: {
          type: formData.typeDetails.type,
          dailyVolume: formData.typeDetails.dailyVolume.trim(),
          dailySize: formData.typeDetails.dailySize.trim(),
          bucketName: formData.typeDetails.bucketName.trim(),
          bucketPrefix: formData.typeDetails.bucketPrefix.trim(),
          awsRegion: formData.typeDetails.awsRegion
        }
      };

      // Create new ingestion point via backend
      const response = await fetch(`${BACKEND_API_BASE}/api/ingestion-points`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(ingestionPointData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSnackbar({
          open: true,
          message: 'Ingestion point created successfully!',
          severity: 'success'
        });
        
        // Reset form
        setFormData({
          name: '',
          srcShortName: '',
          description: '',
          typeDetails: {
            type: 'importS3',
            dailyVolume: '',
            dailySize: '',
            bucketName: '',
            bucketPrefix: '',
            awsRegion: 'us-east-1'
          }
        });
        
        // Redirect to ingestion points list after a short delay
        setTimeout(() => {
          navigate('/ingestion-points');
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to create ingestion point');
      }
      
    } catch (err) {
      console.error('Error creating ingestion point:', err);
      setSnackbar({
        open: true,
        message: `Failed to create ingestion point: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToIngestionPoints = () => {
    navigate('/ingestion-points');
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before creating ingestion points.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBackToIngestionPoints}
        >
          Back to Ingestion Points
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            New Ingestion Point
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create a new ingestion point for the archive system.
          </Typography>
        </CardContent>
      </Card>

      {/* Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Ingestion Point Details
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                variant="outlined"
                placeholder="Enter ingestion point name"
                helperText="Required: Unique name for the ingestion point"
                size="small"
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Short Name"
                value={formData.srcShortName}
                onChange={(e) => handleInputChange('srcShortName', e.target.value)}
                variant="outlined"
                placeholder="Enter short name"
                helperText="Required: Short identifier for the ingestion point"
                size="small"
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                variant="outlined"
                placeholder="Enter description"
                helperText="Optional: Description of the ingestion point"
                size="small"
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
            </Grid>

            {/* S3 Configuration */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                S3 Configuration
              </Typography>
              
              <TextField
                fullWidth
                label="S3 Bucket Name"
                value={formData.typeDetails.bucketName}
                onChange={(e) => handleInputChange('typeDetails.bucketName', e.target.value)}
                variant="outlined"
                placeholder="my-bucket-name"
                helperText="Required: AWS S3 bucket name"
                size="small"
                required
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="S3 Bucket Prefix"
                value={formData.typeDetails.bucketPrefix}
                onChange={(e) => handleInputChange('typeDetails.bucketPrefix', e.target.value)}
                variant="outlined"
                placeholder="optional/prefix/"
                helperText="Optional: Prefix within the S3 bucket"
                size="small"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="AWS Region"
                value={formData.typeDetails.awsRegion}
                onChange={(e) => handleInputChange('typeDetails.awsRegion', e.target.value)}
                variant="outlined"
                placeholder="us-east-1"
                helperText="AWS region for the S3 bucket"
                size="small"
                sx={{ mb: 2 }}
              />
            </Grid>

            {/* Volume Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Volume Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Daily Volume"
                    value={formData.typeDetails.dailyVolume}
                    onChange={(e) => handleInputChange('typeDetails.dailyVolume', e.target.value)}
                    variant="outlined"
                    placeholder="1000"
                    helperText="Expected daily volume (e.g., number of files)"
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Daily Size"
                    value={formData.typeDetails.dailySize}
                    onChange={(e) => handleInputChange('typeDetails.dailySize', e.target.value)}
                    variant="outlined"
                    placeholder="10GB"
                    helperText="Expected daily size (e.g., 10GB, 1TB)"
                    size="small"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Actions
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim() || !formData.srcShortName.trim() || !formData.typeDetails.bucketName.trim()}
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Creating...' : 'Create Ingestion Point'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={handleBackToIngestionPoints}
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              Back to Ingestion Points
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Archive Web UI:</strong> {archiveWebUI}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              The ingestion point will be created in the archive system using the configured credentials.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default NewIngestionPoint;
