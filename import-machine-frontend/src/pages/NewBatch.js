import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function NewBatch() {
  const { importJobAid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { archiveWebUI, apiToken } = useConfig();
  const { getAuthHeaders } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    containerType: '',
    container: '',
    manifest: '',
    manifestDigest: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Get import job name from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const importJobName = urlParams.get('name') || 'Import Job';

  // Handle form field changes
  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!archiveWebUI || !apiToken) {
      setError('Please configure Archive Web UI and API Token in the Config page first.');
      return;
    }

    if (!importJobAid) {
      setError('Import Job AID is required.');
      return;
    }

    // Basic validation
    if (!formData.name.trim()) {
      setError('Name is required.');
      return;
    }

    if (!formData.containerType) {
      setError('Container Type is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare batch data
      const batchData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        containerType: formData.containerType,
        container: formData.container.trim(),
        manifest: formData.manifest.trim(),
        manifestDigest: formData.manifestDigest.trim(),
        importJobAid: importJobAid
      };

      // Create new batch
      const response = await fetch(`${BACKEND_API_BASE}/api/import-job-batches/${encodeURIComponent(importJobAid)}/batches`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        // Reset form
        setFormData({
          name: '',
          description: '',
          containerType: '',
          container: '',
          manifest: '',
          manifestDigest: ''
        });
        
        // Redirect to batch list after a short delay
        setTimeout(() => {
          navigate(`/import-job-batches/${encodeURIComponent(importJobAid)}?name=${encodeURIComponent(importJobName)}`);
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to create batch');
      }
      
    } catch (err) {
      console.error('Error creating batch:', err);
      setError(`Failed to create batch: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToImportJobs = () => {
    navigate('/import-jobs');
  };

  const handleBackToBatchList = () => {
    navigate(`/import-job-batches/${encodeURIComponent(importJobAid)}?name=${encodeURIComponent(importJobName)}`);
  };

  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before creating batches.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
          Home
        </Link>
        <Link
          component="button"
          variant="body1"
          onClick={handleBackToImportJobs}
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <WorkIcon sx={{ mr: 0.5 }} fontSize="small" />
          Import Jobs
        </Link>
        <Link
          component="button"
          variant="body1"
          onClick={handleBackToBatchList}
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          {importJobName || 'Import Job'}
        </Link>
        <Typography color="text.primary">New Batch</Typography>
      </Breadcrumbs>

      {/* Header Section */}
      <Box sx={{ mb: 4, flexShrink: 0 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Create New Batch
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
          Import Job: {importJobName} (AID: {importJobAid})
        </Typography>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToBatchList}
          >
            Back to Batch List
          </Button>
        </Box>
      </Box>

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Batch created successfully! Redirecting to batch list...
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              {/* Name */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  required
                  variant="outlined"
                  helperText="Enter a name for the batch"
                />
              </Grid>

              {/* Container Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Container Type</InputLabel>
                  <Select
                    value={formData.containerType}
                    label="Container Type"
                    onChange={handleInputChange('containerType')}
                  >
                    <MenuItem value="zip">Zip</MenuItem>
                    <MenuItem value="tar.gz">Tar.gz</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  variant="outlined"
                  multiline
                  rows={3}
                  helperText="Enter a description for the batch"
                />
              </Grid>

              {/* Container */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Container"
                  value={formData.container}
                  onChange={handleInputChange('container')}
                  variant="outlined"
                  helperText="Enter the container information"
                />
              </Grid>

              {/* Manifest */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Manifest"
                  value={formData.manifest}
                  onChange={handleInputChange('manifest')}
                  variant="outlined"
                  helperText="Enter the manifest information"
                />
              </Grid>

              {/* Manifest Digest */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Manifest Digest"
                  value={formData.manifestDigest}
                  onChange={handleInputChange('manifestDigest')}
                  variant="outlined"
                  helperText="Enter the manifest digest"
                />
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={handleBackToBatchList}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Batch'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default NewBatch;

