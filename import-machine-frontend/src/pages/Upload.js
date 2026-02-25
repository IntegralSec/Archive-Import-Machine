import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Folder as FolderIcon,
  Storage as StorageIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AttachFile as AttachFileIcon,
  Archive as ArchiveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_API_BASE } from '../config';
import JSZip from 'jszip';
import { sha256 } from 'js-sha256';

// Safely parse JSON response; returns { error } if body is not valid JSON (e.g. HTML error page)
const parseJsonResponse = async (response) => {
  const text = await response.text();
  try {
    return { data: text ? JSON.parse(text) : null };
  } catch {
    // Response wasn't JSON (e.g. 413/502 HTML from nginx)
    const status = response.status;
    const statusText = response.statusText;
    if (status === 413) {
      return { error: 'File too large. Try fewer files or contact support to increase limits.' };
    }
    if (text.includes('413') || text.toLowerCase().includes('entity too large')) {
      return { error: 'File too large. Try fewer files or contact support to increase limits.' };
    }
    if (status >= 500) {
      return { error: `Server error (${status}). Try again or use fewer files.` };
    }
    return { error: text.slice(0, 200) || `Request failed (${status} ${statusText})` };
  }
};

// Convert Uint8Array to base64 in chunks to avoid "too many arguments" with large files
const uint8ArrayToBase64 = (uint8Array) => {
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

function Upload() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { archiveWebUI, apiToken, customerGUID } = useConfig();
  const { getAuthHeaders } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [bucketFolders, setBucketFolders] = useState([]);
  const [uploadResults, setUploadResults] = useState([]);
  
  const fileInputRef = useRef(null);
  const fileSelectModeRef = useRef('replace'); // 'replace' or 'add'

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

  const fetchBucketFolders = async (bucketName) => {
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
        // Filter to only show folders/prefixes
        const folders = filterFoldersOnly(data.data.results);
        setBucketFolders(folders);
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (err) {
      console.error('Error fetching bucket folders:', err);
      setError(`Failed to fetch bucket folders: ${err.message}`);
    } finally {
      setLoading(false);
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
        isFolder: true
      }));
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchBucketFolders(selectedBucket);
    } else {
      setBucketFolders([]);
    }
  }, [selectedBucket]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    const emlFiles = files.filter(file => file.name.toLowerCase().endsWith('.eml'));
    
    if (files.length > 0 && emlFiles.length !== files.length) {
      setError('Only .eml files are allowed. Non-EML files have been filtered out.');
    }
    
    if (fileSelectModeRef.current === 'add' && emlFiles.length > 0) {
      setSelectedFiles(prev => {
        const existingNames = new Set(prev.map(f => f.name + f.size + f.lastModified));
        const newFiles = emlFiles.filter(f => !existingNames.has(f.name + f.size + f.lastModified));
        return [...prev, ...newFiles];
      });
    } else {
      setSelectedFiles(emlFiles);
    }
    setError(null);
    event.target.value = ''; // Reset so same file can be selected again
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('Please enter a folder name');
      return;
    }

    if (!selectedBucket) {
      setError('Please select a bucket first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const folderPath = selectedFolder ? `${selectedFolder}${newFolderName}` : newFolderName;
      
      const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets/${selectedBucket}/create-folder`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folderPath: folderPath
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNewFolderName('');
        setShowCreateFolderDialog(false);
        setSuccess('Folder created successfully');
        // Refresh bucket folders
        fetchBucketFolders(selectedBucket);
      } else {
        throw new Error(data.error || 'Failed to create folder');
      }
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(`Failed to create folder: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate a UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Calculate SHA-256 hash of a blob
  // crypto.subtle is only available in secure contexts (HTTPS/localhost); use js-sha256 fallback for HTTP on LAN
  const calculateSHA256 = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return sha256(arrayBuffer);
  };

  // Generate manifest JSON
  const generateManifest = (files, containerName, containerHash) => {
    const entries = files.map(file => ({
      reconciliation_id: generateUUID(),
      container_entry_id: file.name
    }));

    return {
      customer_guid: customerGUID || "1_8edb9b328e86ff34_b38f575_19499838f47__8000", // Use config value or fallback
      container_type: "container/zip",
      container: containerName,
      container_hash: containerHash,
      entries: entries
    };
  };

  const createZipFromFiles = async (files) => {
    const zip = new JSZip();
    
    // Add all files to the ZIP
    files.forEach(file => {
      zip.file(file.name, file);
    });
    
    // Generate the ZIP blob (without manifest)
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Calculate hash of the ZIP file (without manifest)
    const containerHash = await calculateSHA256(zipBlob);
    
    // Generate manifest
    const containerName = `compressed_messages_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    const manifest = generateManifest(files, containerName, containerHash);
    
    return {
      zipBlob: zipBlob,
      manifest: manifest,
      containerName: containerName
    };
  };

  const uploadZipToS3 = async (zipBlob, bucketName, key) => {
    const arrayBuffer = await zipBlob.arrayBuffer();
    
    // Convert ArrayBuffer to base64 string (browser-compatible, chunked for large files)
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64String = uint8ArrayToBase64(uint8Array);
    
    const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets/${bucketName}/upload`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: key,
        fileBuffer: base64String,
        contentType: 'application/zip'
      })
    });

    const { data, error: parseError } = await parseJsonResponse(response);
    if (parseError) throw new Error(parseError);

    if (!response.ok) {
      throw new Error(data?.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  };

  const uploadManifestToS3 = async (manifest, bucketName, key) => {
    const manifestString = JSON.stringify(manifest, null, 2);
    const manifestBlob = new Blob([manifestString], { type: 'application/json' });
    const arrayBuffer = await manifestBlob.arrayBuffer();
    
    // Convert ArrayBuffer to base64 string (browser-compatible, chunked for large files)
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64String = uint8ArrayToBase64(uint8Array);
    
    const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets/${bucketName}/upload`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: key,
        fileBuffer: base64String,
        contentType: 'application/json'
      })
    });

    const { data, error: parseError } = await parseJsonResponse(response);
    if (parseError) throw new Error(parseError);

    if (!response.ok) {
      throw new Error(data?.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  };

  const handleUpload = async () => {
    if (!selectedBucket) {
      setError('Please select an S3 bucket');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select EML files to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);
    setUploadResults([]);

    try {
      // Create zip file and manifest
      setUploadProgress(10);
      const { zipBlob, manifest, containerName } = await createZipFromFiles(selectedFiles);
      
      // Determine the full key paths
      const folderPath = selectedFolder || '';
      const zipKey = `${folderPath}${containerName}`;
      const manifestKey = `${folderPath}${containerName.replace('.zip', '.manifest.json')}`;
      
      setUploadProgress(30);
      
      // Upload ZIP file to S3
      const zipResult = await uploadZipToS3(zipBlob, selectedBucket, zipKey);
      
      setUploadProgress(60);
      
      // Upload manifest to S3
      const manifestResult = await uploadManifestToS3(manifest, selectedBucket, manifestKey);
      
      setUploadProgress(100);
      
      if (zipResult.success && manifestResult.success) {
        setSuccess(`Successfully uploaded ${selectedFiles.length} EML files as ${containerName} and manifest to ${selectedBucket}/${folderPath}`);
        setUploadResults([{
          fileName: containerName,
          bucket: selectedBucket,
          zipKey: zipKey,
          manifestKey: manifestKey,
          fileCount: selectedFiles.length,
          status: 'success',
          manifest: manifest
        }]);
        
        // Clear selected files
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(zipResult.error || manifestResult.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setError(`Failed to upload files: ${err.message}`);
      setUploadResults([{
        fileName: 'upload-failed',
        bucket: selectedBucket,
        key: '',
        fileCount: selectedFiles.length,
        status: 'error',
        error: err.message
      }]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if S3 credentials and customer GUID are configured
  if (!archiveWebUI || !apiToken || !customerGUID) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI, API Token, and Customer GUID in the Config page before uploading files.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header Section */}
      <Card sx={{ mb: 4, flexShrink: 0 }}>
        <CardContent>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Upload EML Files
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Select EML files from your local folder, choose an S3 bucket and folder destination, 
            and upload them as a zipped archive with a separate JSON manifest. The files will be automatically 
            zipped and uploaded along with a manifest file containing metadata and SHA-256 hash.
          </Typography>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Uploading Files...
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {uploadProgress}% complete
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upload Results
            </Typography>
            <List>
              {uploadResults.map((result, index) => (
                <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <ListItemIcon>
                      {result.status === 'success' ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={result.fileName}
                      secondary={
                        result.status === 'success' 
                          ? `ZIP: ${result.bucket}/${result.zipKey} | Manifest: ${result.bucket}/${result.manifestKey} (${result.fileCount} files)`
                          : `Error: ${result.error}`
                      }
                    />
                  </Box>
                  
                  {result.status === 'success' && result.manifest && (
                    <Box sx={{ mt: 2, width: '100%' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Manifest Information:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip 
                          label={`Container: ${result.manifest.container}`} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`Hash: ${result.manifest.container_hash.substring(0, 16)}...`} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={`Entries: ${result.manifest.entries.length}`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ArchiveIcon />}
                        onClick={() => {
                          const manifestBlob = new Blob([JSON.stringify(result.manifest, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(manifestBlob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'manifest.json';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download Manifest
                      </Button>
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* File Selection */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Select EML Files
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ mb: 3 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple={true}
                  accept=".eml,message/rfc822"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="contained"
                  startIcon={<AttachFileIcon />}
                  onClick={() => { fileSelectModeRef.current = 'replace'; fileInputRef.current?.click(); }}
                  disabled={isUploading}
                  sx={{ mb: 2, mr: 1 }}
                >
                  Select EML Files
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  onClick={() => { fileSelectModeRef.current = 'add'; fileInputRef.current?.click(); }}
                  disabled={isUploading}
                  sx={{ mb: 2 }}
                >
                  Add More Files
                </Button>
                
                {selectedFiles.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedFiles.length} file(s) selected
                  </Typography>
                )}
              </Box>

              {selectedFiles.length > 0 && (
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>File Name</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedFiles.map((file, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AttachFileIcon fontSize="small" color="primary" />
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {file.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatFileSize(file.size)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveFile(index)}
                              disabled={isUploading}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* S3 Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                S3 Destination
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>S3 Bucket</InputLabel>
                    <Select
                      value={selectedBucket}
                      onChange={(e) => setSelectedBucket(e.target.value)}
                      label="S3 Bucket"
                      disabled={isUploading}
                    >
                      {buckets.map((bucket) => (
                        <MenuItem key={bucket.name} value={bucket.name}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StorageIcon fontSize="small" />
                            {bucket.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <FormControl fullWidth>
                      <InputLabel>Folder (Optional)</InputLabel>
                      <Select
                        value={selectedFolder}
                        onChange={(e) => setSelectedFolder(e.target.value)}
                        label="Folder (Optional)"
                        disabled={isUploading || !selectedBucket}
                      >
                        <MenuItem value="">
                          <em>Root folder</em>
                        </MenuItem>
                        {bucketFolders.map((folder) => (
                          <MenuItem key={folder.key} value={folder.key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FolderIcon fontSize="small" />
                              {folder.key}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      startIcon={<CreateNewFolderIcon />}
                      onClick={() => setShowCreateFolderDialog(true)}
                      disabled={isUploading || !selectedBucket}
                      size="small"
                    >
                      New
                    </Button>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleUpload}
                  disabled={isUploading || !selectedBucket || selectedFiles.length === 0}
                  fullWidth
                >
                  {isUploading ? 'Uploading...' : 'Upload & Create Manifest'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    fetchBuckets();
                    if (selectedBucket) {
                      fetchBucketFolders(selectedBucket);
                    }
                  }}
                  disabled={isUploading}
                >
                  Refresh
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onClose={() => setShowCreateFolderDialog(false)}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            sx={{ mt: 2 }}
          />
          {selectedFolder && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Will be created in: {selectedFolder}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateFolderDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateFolder} variant="contained" disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}

export default Upload;
