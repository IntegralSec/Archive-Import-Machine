import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useMediaQuery,
  useTheme,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function S3Bucket() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { archiveWebUI, apiToken } = useConfig();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [bucketObjects, setBucketObjects] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketRegion, setNewBucketRegion] = useState('us-east-1');
  const [selectingBucket, setSelectingBucket] = useState(false);
  const hasProcessedIncomingState = useRef(false);

  // AWS Regions for dropdown
  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'sa-east-1', label: 'South America (São Paulo)' }
  ];

  const fetchBuckets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.results) {
        setBuckets(data.data.results);
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (err) {
      console.error('Error fetching buckets:', err);
      setError(`Failed to fetch S3 buckets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBucketObjects = async (bucketName) => {
    if (!bucketName) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets/${bucketName}/objects`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.results) {
        // Filter to only show folders/prefixes, not individual files
        const folders = filterFoldersOnly(data.data.results);
        setBucketObjects(folders);
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (err) {
      console.error('Error fetching bucket objects:', err);
      setError(`Failed to fetch bucket objects: ${err.message}`);
    } finally {
      setLoading(false);
      setSelectingBucket(false);
    }
  };

  // Filter function to only show folders/prefixes
  const filterFoldersOnly = (objects) => {
    const folders = new Set();
    
    objects.forEach(object => {
      const key = object.key;
      
      // Skip if key is empty or null
      if (!key || key.trim() === '') {
        return;
      }
      
      // If the key ends with '/', it's a folder
      if (key.endsWith('/')) {
        folders.add(key);
      } else {
        // Check if this object is part of a folder structure
        // Extract the folder path (everything before the last '/')
        const lastSlashIndex = key.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const folderPath = key.substring(0, lastSlashIndex + 1);
          folders.add(folderPath);
        }
      }
    });
    
    // Convert back to array, sort, and remove duplicates
    return Array.from(folders)
      .sort((a, b) => {
        // Sort by folder depth first, then alphabetically
        const aDepth = (a.match(/\//g) || []).length;
        const bDepth = (b.match(/\//g) || []).length;
        if (aDepth !== bDepth) {
          return aDepth - bDepth;
        }
        return a.localeCompare(b);
      })
      .map(folderPath => ({
        key: folderPath,
        size: 0, // Folders don't have size
        lastModified: null, // Folders don't have lastModified
        storageClass: 'FOLDER',
        etag: null,
        isFolder: true
      }));
  };

  useEffect(() => {
    fetchBuckets();
    // Reset the incoming state flag when component mounts
    hasProcessedIncomingState.current = false;
  }, []);

  // Handle incoming navigation state to pre-select a bucket
  useEffect(() => {
    if (location.state && location.state.selectedBucket && buckets.length > 0 && !hasProcessedIncomingState.current) {
      const bucketToSelect = location.state.selectedBucket;
      // Find the bucket in the current list and select it
      const foundBucket = buckets.find(bucket => bucket.name === bucketToSelect.name);
      if (foundBucket && (!selectedBucket || selectedBucket.name !== foundBucket.name)) {
        setSelectingBucket(true);
        setSelectedBucket(foundBucket);
        hasProcessedIncomingState.current = true;
        // Clear the location state to prevent re-selection on subsequent renders
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.state, buckets, selectedBucket, navigate, location.pathname]);



  useEffect(() => {
    if (selectedBucket) {
      fetchBucketObjects(selectedBucket.name);
    } else {
      // Clear bucket objects when no bucket is selected
      setBucketObjects([]);
    }
  }, [selectedBucket]);

  const handleRefresh = () => {
    fetchBuckets();
    if (selectedBucket) {
      fetchBucketObjects(selectedBucket.name);
    }
  };

  const handleAddBucket = async () => {
    if (!newBucketName.trim()) {
      setError('Please enter a bucket name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newBucketName,
          region: newBucketRegion,
          description: ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNewBucketName('');
        setNewBucketRegion('us-east-1');
        setShowAddForm(false);
        // Refresh the buckets list
        fetchBuckets();
      } else {
        throw new Error(data.error || 'Failed to create bucket');
      }
    } catch (err) {
      console.error('Error creating bucket:', err);
      setError(`Failed to create bucket: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBucket = async (bucketName) => {
    if (!window.confirm(`Are you sure you want to delete bucket "${bucketName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets/${bucketName}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setBuckets(prev => prev.filter(bucket => bucket.name !== bucketName));
        
        if (selectedBucket && selectedBucket.name === bucketName) {
          setSelectedBucket(null);
          setBucketObjects([]);
        }
      } else {
        throw new Error(data.error || 'Failed to delete bucket');
      }
    } catch (err) {
      console.error('Error deleting bucket:', err);
      setError(`Failed to delete bucket: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageClassColor = (storageClass) => {
    switch (storageClass) {
      case 'STANDARD':
        return 'success';
      case 'STANDARD_IA':
        return 'warning';
      case 'GLACIER':
        return 'info';
      case 'DEEP_ARCHIVE':
        return 'secondary';
      default:
        return 'default';
    }
  };



  const handleImportFolder = async (folderPath) => {
    if (!selectedBucket) {
      setError('Please select a bucket first');
      return;
    }

    // Navigate to the Import Now page with bucket and folder information
    navigate('/import-now', {
      state: {
        bucketInfo: {
          bucketName: selectedBucket.name,
          folderPath: folderPath,
          bucketRegion: selectedBucket.region
        }
      }
    });
  };

  const handleViewFolderContents = (folderPath) => {
    if (!selectedBucket) {
      setError('Please select a bucket first');
      return;
    }

    // Navigate to the S3 Folder page with bucket and folder information
    navigate('/s3-folder', {
      state: {
        bucketName: selectedBucket.name,
        folderPath: folderPath,
        bucketRegion: selectedBucket.region
      }
    });
  };





  // Check if S3 credentials are configured
  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before managing S3 buckets.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header Section */}
      <Card sx={{ mb: 4, flexShrink: 0 }}>
        <CardContent>
          {/* Title */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              S3 Bucket Management
            </Typography>
          </Box>
          
                     {/* Buttons */}
                       <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mb: 2,
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto'
            }}>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={handleRefresh} 
                disabled={loading}
                sx={{ width: isMobile ? '100%' : 'auto' }}
              >
                Refresh
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => setShowAddForm(!showAddForm)}
                sx={{ width: isMobile ? '100%' : 'auto' }}
              >
                Add Bucket
              </Button>

            </Box>
          
                     {/* Description */}
                       <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Manage your S3 buckets and view folder structure using your AWS credentials configured in the backend Config page. S3 authentication is handled securely by the backend. Only folders (prefixes) are displayed, not individual files. {isMobile && 'On mobile devices, some details are hidden for better viewing.'}
            </Typography>
        </CardContent>
      </Card>

      {/* Add Bucket Form */}
      {showAddForm && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Create New S3 Bucket
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bucket Name"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  placeholder="Enter bucket name (lowercase, no spaces)"
                  helperText="Bucket names must be globally unique and contain only lowercase letters, numbers, and hyphens"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>AWS Region</InputLabel>
                  <Select
                    value={newBucketRegion}
                    onChange={(e) => setNewBucketRegion(e.target.value)}
                    label="AWS Region"
                  >
                    {awsRegions.map((region) => (
                      <MenuItem key={region.value} value={region.value}>
                        {region.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                onClick={handleAddBucket}
                disabled={loading || !newBucketName.trim()}
              >
                {loading ? 'Creating...' : 'Create Bucket'}
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setShowAddForm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

             {/* Error Alert */}
       {error && (
         <Alert severity="error" sx={{ mb: 3 }}>
           {error}
         </Alert>
       )}



      {/* Loading State */}
      {(loading || selectingBucket) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}



       {/* Buckets List */}
       {!loading && !error && (
        <Grid container spacing={3}>
          {/* Buckets Table */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  S3 Buckets
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <TableContainer sx={{ maxHeight: '60vh' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Bucket Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Region</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                                                                   {buckets.map((bucket) => (
                        <TableRow 
                          key={bucket.name} 
                          hover 
                          selected={selectedBucket && selectedBucket.name === bucket.name}
                          onClick={() => setSelectedBucket(bucket)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <StorageIcon fontSize="small" color="primary" />
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {bucket.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={bucket.region} 
                              size="small" 
                              variant="outlined"
                              color="primary"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {buckets.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CloudIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No S3 Buckets Found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create your first S3 bucket to get started.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Bucket Objects */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                                 <Typography variant="h5" gutterBottom>
                   {selectedBucket ? `${selectedBucket.name} - Folders` : 'Bucket Folders'}
                 </Typography>
                <Divider sx={{ mb: 3 }} />
                
                                 {selectedBucket && selectedBucket.name ? (
                  <>
                    <TableContainer sx={{ maxHeight: '60vh' }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Folder Path</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>View</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bucketObjects.map((folder, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <FolderIcon fontSize="small" color="primary" />
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                    {folder.key}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label="Folder" 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                  icon={<FolderIcon />}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="primary"
                                  onClick={() => handleImportFolder(folder.key)}
                                  disabled={loading}
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 2
                                  }}
                                >
                                  Import Now
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="primary"                       
                                  onClick={() => handleViewFolderContents(folder.key)}
                                  disabled={loading}
                                  startIcon={<VisibilityIcon />}
                                  sx={{ minWidth: 'auto', px: 2 }}
                                >
                                  View Contents
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {bucketObjects.length === 0 && (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Folders Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          This bucket has no folders. Files are stored at the root level.
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <StorageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Select a Bucket
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose a bucket from the list to view its folder structure.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default S3Bucket;
