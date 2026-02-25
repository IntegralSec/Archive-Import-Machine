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
  Radio,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Grid,
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Storage as StorageIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

const steps = ['Select Import Options', 'Review & Confirm', 'Import Progress'];

function ImportNow() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { archiveWebUI, apiToken } = useConfig();
  const { getAuthHeaders } = useAuth();
  
  // Get bucket and folder info from navigation state
  const bucketInfo = location.state?.bucketInfo || {};
  const { bucketName, folderPath, bucketRegion } = bucketInfo;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingestionPointId: '',
    applySupervision: false,
    applyLegalHold: false
  });

  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [ingestionPoints, setIngestionPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [importProgress, setImportProgress] = useState({
    status: 'idle',
    message: '',
    progress: 0
  });

  // Fetch ingestion points for dropdown
  const fetchIngestionPoints = useCallback(async () => {
    if (!archiveWebUI || !apiToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
    
    // Auto-generate import job name if bucket and folder info is available
    if (bucketName && folderPath) {
      const folderName = folderPath.split('/').filter(Boolean).pop() || 'root';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      setFormData(prev => ({
        ...prev,
        name: `Import-${bucketName}-${folderName}-${timestamp}`,
        description: `Import from S3 bucket: ${bucketName}, folder: ${folderPath}`
      }));
    }
  }, [fetchIngestionPoints, bucketName, folderPath]);

  // Check for matching ingestion points when ingestion points are loaded
  useEffect(() => {
    if (ingestionPoints.length > 0 && folderPath) {
      // Remove trailing slashes from folder path for comparison
      const normalizedFolderPath = folderPath.replace(/\/+$/, '');
      
      // Find all ingestion points with matching bucket prefix
      const matchingIngestionPoints = ingestionPoints.filter(point => 
        point.typeDetails?.bucketPrefix === normalizedFolderPath
      );
      
      // No auto-selection - user must choose from matching ingestion points
      console.log(`Found ${matchingIngestionPoints.length} matching ingestion points for folder: ${folderPath}`);
    }
  }, [ingestionPoints, folderPath]);

  const handleInputChange = (field, value) => {
    console.log(`Updating ${field} to:`, value);
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log('New form data:', newData);
      return newData;
    });
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate form data
      if (!formData.name.trim()) {
        setError('Import job name is required');
        return;
      }
      
      // Check if there are matching ingestion points
      const normalizedFolderPath = folderPath.replace(/\/+$/, '');
      const matchingIngestionPoints = ingestionPoints.filter(point => 
        point.typeDetails?.bucketPrefix === normalizedFolderPath
      );
      const hasMatchingIngestionPoint = matchingIngestionPoints.length > 0;
      
      if (hasMatchingIngestionPoint && !formData.ingestionPointId) {
        setError('Please select an ingestion point');
        return;
      }
      
      if (!hasMatchingIngestionPoint) {
        setError('You need to create an ingestion point for this folder before proceeding. Please click "Create New Ingestion Point" first.');
        return;
      }
      
      setError(null);
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!bucketName || !folderPath) {
      setError('Missing bucket or folder information');
      return;
    }

    setSubmitting(true);
    setError(null);
    setImportProgress({
      status: 'starting',
      message: 'Starting import process...',
      progress: 0
    });

    try {
      // Create import job
      const importJobData = {
        ...formData,
        sourceType: 's3',
        sourceConfig: {
          bucketName,
          folderPath,
          region: bucketRegion
        }
      };

      const response = await fetch(`${BACKEND_API_BASE}/api/import-jobs`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(importJobData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setImportProgress({
          status: 'success',
          message: 'Import job created successfully!',
          progress: 100
        });
        
        // Navigate to import jobs page after a short delay
        setTimeout(() => {
          navigate('/import-jobs');
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to create import job');
      }
      
    } catch (err) {
      console.error('Error creating import job:', err);
      setError(`Failed to create import job: ${err.message}`);
      setImportProgress({
        status: 'error',
        message: 'Import failed',
        progress: 0
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/s3-bucket');
  };

  const handleCreateNewIngestionPoint = () => {
    // Navigate to New Ingestion Point page with pre-filled data
    navigate('/new-ingestion-point', {
      state: {
        prefillData: {
          bucketName: bucketName,
          bucketPrefix: folderPath,
          awsRegion: bucketRegion
        }
      }
    });
  };

  // Check if S3 credentials are configured
  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before importing from S3.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/config')}
          startIcon={<InfoIcon />}
        >
          Go to Configuration
        </Button>
      </Box>
    );
  }

  // If no bucket info is provided, show error
  if (!bucketName || !folderPath) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Missing bucket or folder information. Please go back to the S3 Bucket Management page and select a folder to import.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/s3-bucket')}
          startIcon={<ArrowBackIcon />}
        >
          Back to S3 Buckets
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Breadcrumbs sx={{ mb: 2 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/')}
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
              Home
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/s3-bucket')}
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            >
              <StorageIcon sx={{ mr: 0.5 }} fontSize="small" />
              S3 Buckets
            </Link>
            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <CloudUploadIcon sx={{ mr: 0.5 }} fontSize="small" />
              Import Now
            </Typography>
          </Breadcrumbs>
          
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUploadIcon color="primary" />
            Import from S3
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            S3 bucket: <strong>{bucketName}</strong>
          </Typography>
          <Typography variant="body1" color="text.secondary">
          Folder: <strong>{folderPath}</strong>
          </Typography>
          
          {/* Show ingestion point status */}
          {ingestionPoints.length > 0 && folderPath && (
            <Box sx={{ mt: 1 }}>
              {(() => {
                const normalizedFolderPath = folderPath.replace(/\/+$/, '');
                const matchingIngestionPoints = ingestionPoints.filter(point => 
                  point.typeDetails?.bucketPrefix === normalizedFolderPath
                );
                
                if (matchingIngestionPoints.length > 0) {
                  return (
                    <Alert severity="success" sx={{ py: 0.5 }}>
                      ✓ Found {matchingIngestionPoints.length} matching ingestion point{matchingIngestionPoints.length > 1 ? 's' : ''} - please select one
                    </Alert>
                  );
                } else {
                  return (
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      ⚠ No matching ingestion point found - you'll need to create one
                    </Alert>
                  );
                }
              })()}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Step Content */}
      <Card>
        <CardContent>
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Import Configuration
              </Typography>
              
              <Grid container spacing={3}>
              
                
                <Grid item xs={12} >
                  {/* Show ingestion point section if there are matching ingestion points */}
                  {ingestionPoints.length > 0 && folderPath && (() => {
                    const normalizedFolderPath = folderPath.replace(/\/+$/, '');
                    const matchingIngestionPoints = ingestionPoints.filter(point => 
                      point.typeDetails?.bucketPrefix === normalizedFolderPath
                    );
                    
                                                                                   if (matchingIngestionPoints.length > 0) {
                                                 return (
                           <Box>
                             <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                               Select Ingestion Point
                             </Typography>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                               {matchingIngestionPoints.map((point, index) => {
                                 // Debug: log the entire point object to see its structure
                                 console.log('Ingestion point object:', point);
                                 
                                 // Try different possible ID field names
                                 const pointId = point.id || point._id || point.ingestionPointId || point.guid || index;
                                 const isSelected = String(formData.ingestionPointId) === String(pointId);
                                 
                                 console.log(`Chip ${point.name} (${index}): isSelected=${isSelected}, currentId=${formData.ingestionPointId}, pointId=${pointId}`);
                                 
                                 return (
                                   <Chip
                                     key={`${pointId}-${index}`}
                                     label={`${point.name}`}
                                     clickable
                                     color={isSelected ? 'primary' : 'default'}
                                     variant={isSelected ? 'filled' : 'outlined'}
                                     onClick={() => {
                                       console.log("Clicked chip:", point.name, "ID:", pointId, "Current selection:", formData.ingestionPointId);
                                       handleInputChange("ingestionPointId", pointId);
                                     }}
                                     sx={{ 
                                       mb: 1,
                                       fontWeight: isSelected ? 'bold' : 'normal',
                                       '&:hover': {
                                         backgroundColor: isSelected ? 'primary.dark' : 'action.hover'
                                       }
                                     }}
                                   />
                                 );
                               })}
                             </Box>
                           </Box>
                         );
                    } else {
                      return null;
                    }
                  })()}
                  
                  {/* Show Create New Ingestion Point button if no matching ingestion point found */}
                  {ingestionPoints.length > 0 && folderPath && (() => {
                    const normalizedFolderPath = folderPath.replace(/\/+$/, '');
                    const matchingIngestionPoints = ingestionPoints.filter(point => 
                      point.typeDetails?.bucketPrefix === normalizedFolderPath
                    );
                    
                    if (matchingIngestionPoints.length === 0) {
                      return (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            No matching ingestion point found for folder: {folderPath}
                          </Typography>
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={handleCreateNewIngestionPoint}
                            startIcon={<AddIcon />}
                            fullWidth
                          >
                            Create New Ingestion Point for {folderPath}
                          </Button>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            You need to create an ingestion point with bucket prefix "{folderPath}" to import from this folder.
                          </Typography>
                        </Box>
                      );
                    } else {
                      return null;
                    }
                  })()}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Import Job Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    helperText="A unique name for this import job"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    multiline
                    rows={3}
                    helperText="Optional description of this import job"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Processing Options
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.applySupervision}
                        onChange={(e) => handleInputChange('applySupervision', e.target.checked)}
                      />
                    }
                    label="Apply Supervision"
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.applyLegalHold}
                        onChange={(e) => handleInputChange('applyLegalHold', e.target.checked)}
                      />
                    }
                    label="Apply Legal Hold"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Review Import Configuration
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Import Job Name</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>{formData.name}</Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">Ingestion Point</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formData.ingestionPointId ? 
                      ingestionPoints.find(point => point.id === formData.ingestionPointId)?.name || 'Unknown' :
                      'Not selected'
                    }
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Source Information</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Bucket:</strong> {bucketName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Folder:</strong> {folderPath}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Region:</strong> {bucketRegion}
                    </Typography>
                  </Box>
                  
                  <Typography variant="subtitle2" color="text.secondary">Processing Options</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label="Supervision" 
                      color={formData.applySupervision ? 'primary' : 'default'}
                      variant={formData.applySupervision ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip 
                      label="Legal Hold" 
                      color={formData.applyLegalHold ? 'primary' : 'default'}
                      variant={formData.applyLegalHold ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{formData.description || 'No description provided'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Import Progress
              </Typography>
              
              <Box sx={{ textAlign: 'center', py: 4 }}>
                {importProgress.status === 'idle' && (
                  <Box>
                    <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Ready to Start Import
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click "Start Import" to begin the import process
                    </Typography>
                  </Box>
                )}
                
                {importProgress.status === 'starting' && (
                  <Box>
                    <CircularProgress size={64} sx={{ mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Starting Import...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {importProgress.message}
                    </Typography>
                  </Box>
                )}
                
                {importProgress.status === 'success' && (
                  <Box>
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" color="success.main" gutterBottom>
                      Import Successful!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {importProgress.message}
                    </Typography>
                  </Box>
                )}
                
                {importProgress.status === 'error' && (
                  <Box>
                    <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                    <Typography variant="h6" color="error.main" gutterBottom>
                      Import Failed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {importProgress.message}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={submitting}
          startIcon={<ArrowBackIcon />}
        >
          Cancel
        </Button>
        
        <Box>
          {activeStep > 0 && (
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={submitting}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
          )}
          
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={submitting}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || importProgress.status === 'success'}
              startIcon={submitting ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            >
              {submitting ? 'Starting Import...' : 'Start Import'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ImportNow;
