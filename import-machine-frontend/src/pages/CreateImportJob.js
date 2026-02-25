import React, { useState, useEffect, useCallback } from 'react';
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
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function CreateImportJob() {
  const navigate = useNavigate();
  const { archiveWebUI, apiToken } = useConfig();
  const { getAuthHeaders } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer: '',
    ingestionPointId: '',
    applySupervision: false,
    applyLegalHold: false
  });

  // UI state
  const [ingestionPoints, setIngestionPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Fetch ingestion points for dropdown
  const fetchIngestionPoints = useCallback(async () => {
    if (!archiveWebUI || !apiToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch ingestion points from backend
      const response = await fetch(`${BACKEND_API_BASE}/api/ingestion-points`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data?.results) {
        setIngestionPoints(data.data.results);
      } else {
        throw new Error('Invalid response format from backend');
      }
      
    } catch (err) {
      console.error('Error fetching ingestion points:', err);
      setError(`Failed to fetch ingestion points: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [archiveWebUI, apiToken, getAuthHeaders]);

  useEffect(() => {
    fetchIngestionPoints();
  }, [fetchIngestionPoints]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.ingestionPointId) {
      setError('Ingestion Point is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setDebugInfo({});

    const debugData = {
      timestamp: new Date().toISOString(),
      backendApiBase: BACKEND_API_BASE,
      archiveWebUI,
      apiTokenLength: apiToken ? apiToken.length : 0,
      apiTokenPrefix: apiToken ? apiToken.substring(0, 10) : 'undefined',
      formData: { ...formData }
    };

    try {
      // Create import job through backend proxy
      const url = `${BACKEND_API_BASE}/api/import-jobs`;
      
      console.log('Creating import job at:', url);
      console.log('Request body:', formData);

      debugData.backendUrl = url;
      debugData.step = 'backend_request';

      const requestBody = {
        name: formData.name,
        description: formData.description,
        customer: formData.customer,
        ingestionPointId: formData.ingestionPointId,
        applySupervision: formData.applySupervision.toString(),
        applyLegalHold: formData.applyLegalHold.toString()
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);

      debugData.backendResponse = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      };

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Backend API Error:', errorData);
        
        debugData.backendError = errorData;
        debugData.step = 'error';
        
        throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorData.error || errorData.message || 'Unknown error'}`);
      }

      console.log('Parsing backend response...');
      debugData.step = 'json_parsing';
      
      const data = await response.json();
      console.log('Success response:', data);

      debugData.backendData = data;
      debugData.step = 'success';

      // Navigate back to import jobs page
      navigate('/import-jobs');
      
    } catch (err) {
      console.error('=== Error in handleSubmit ===');
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      debugData.error = {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack
      };
      debugData.step = 'error';
      
      setError(`Failed to create import job: ${err.message}`);
      setDebugInfo(debugData);
    } finally {
      setSubmitting(false);
      console.log('=== handleSubmit completed ===');
    }
  };

  const handleBackToImportJobs = () => {
    navigate('/import-jobs');
  };

  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before creating import jobs.
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
        <Typography color="text.primary">Create Import Job</Typography>
      </Breadcrumbs>

      {/* Header Section */}
      <Box sx={{ mb: 4, flexShrink: 0 }}>
        {/* Title */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Create Import Job
          </Typography>
        </Box>
        
        {/* Back Button */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToImportJobs}
          >
            Back to Import Jobs
          </Button>
        </Box>
        
        {/* Description */}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Create a new import job by filling out the form below.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          {error.includes('Failed to create') && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Backend connection issues. Please check:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Backend server is running on {BACKEND_API_BASE}</li>
                <li>Backend configuration is properly set</li>
                <li>Archive system credentials are valid</li>
              </ul>
            </Box>
          )}
        </Alert>
      )}

      {/* Debug Information - Only show when there's an error */}
      {error && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportIcon color="error" />
              <Typography>Debug Information</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Loading State for Ingestion Points */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Form Section */}
      {!loading && (
        <Paper sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Name Field */}
                  <TextField
                    label="Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    fullWidth
                    placeholder="Enter import job name"
                  />

                  {/* Description Field */}
                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Enter description"
                  />

                  {/* Customer Field */}
                  <TextField
                    label="Customer"
                    value={formData.customer}
                    onChange={(e) => handleInputChange('customer', e.target.value)}
                    fullWidth
                    placeholder="Enter customer name"
                  />

                  {/* Ingestion Point Dropdown */}
                  <FormControl fullWidth required>
                    <InputLabel>Ingestion Point</InputLabel>
                    <Select
                      value={formData.ingestionPointId}
                      label="Ingestion Point"
                      onChange={(e) => handleInputChange('ingestionPointId', e.target.value)}
                    >
                      {ingestionPoints.map((point) => (
                        <MenuItem key={point.aid} value={point.aid}>
                          {point.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Apply Supervision Checkbox */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.applySupervision}
                        onChange={(e) => handleInputChange('applySupervision', e.target.checked)}
                      />
                    }
                    label="Apply Supervision"
                  />

                  {/* Apply Legal Hold Checkbox */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.applyLegalHold}
                        onChange={(e) => handleInputChange('applyLegalHold', e.target.checked)}
                      />
                    }
                    label="Apply Legal Hold"
                  />

                  {/* Submit Button */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={handleBackToImportJobs}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Import Job'}
                    </Button>
                  </Box>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Paper>
      )}
    </Box>
  );
}

export default CreateImportJob;
