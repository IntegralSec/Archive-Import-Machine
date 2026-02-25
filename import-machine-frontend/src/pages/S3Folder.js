import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  Badge,
  Stack
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  NavigateNext as NavigateNextIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Description as DocumentIcon,
  Archive as ArchiveIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { BACKEND_API_BASE } from '../config';

function S3Folder() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [folderContents, setFolderContents] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [bucketRegion, setBucketRegion] = useState('');
  const [stats, setStats] = useState({ files: 0, folders: 0, totalSize: 0 });

  // Get bucket and folder info from navigation state
  useEffect(() => {
    if (location.state) {
      setBucketName(location.state.bucketName || '');
      setCurrentPath(location.state.folderPath || '');
      setBucketRegion(location.state.bucketRegion || '');
    } else {
      // If no state, redirect back to S3 buckets page
      navigate('/s3-bucket');
    }
  }, [location.state, navigate]);

  // Load folder contents when component mounts or path changes
  useEffect(() => {
    if (bucketName && currentPath) {
      fetchFolderContents();
    }
  }, [bucketName, currentPath]);

  const fetchFolderContents = async () => {
    if (!bucketName || !currentPath) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/s3-buckets/${bucketName}/objects?prefix=${encodeURIComponent(currentPath)}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.results) {
        // Filter to only show contents of the current folder (not subfolders)
        const contents = filterCurrentFolderContents(data.data.results, currentPath);
        setFolderContents(contents);
        
        // Calculate stats
        const stats = calculateStats(contents);
        setStats(stats);
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (err) {
      console.error('Error fetching folder contents:', err);
      setError(`Failed to fetch folder contents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate folder statistics
  const calculateStats = (contents) => {
    const stats = { files: 0, folders: 0, totalSize: 0 };
    
    contents.forEach(item => {
      if (item.isFolder) {
        stats.folders++;
      } else {
        stats.files++;
        stats.totalSize += item.size || 0;
      }
    });
    
    return stats;
  };

  // Get file type icon based on file extension
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
      case 'webp':
        return <ImageIcon fontSize="small" color="success" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'webm':
        return <VideoIcon fontSize="small" color="error" />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <AudioIcon fontSize="small" color="warning" />;
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
        return <DocumentIcon fontSize="small" color="info" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <ArchiveIcon fontSize="small" color="secondary" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
      case 'xml':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
        return <CodeIcon fontSize="small" color="primary" />;
      default:
        return <FileIcon fontSize="small" color="action" />;
    }
  };

  // Filter to show only contents of the current folder
  const filterCurrentFolderContents = (objects, folderPath) => {
    const contents = [];
    const processedKeys = new Set();

    objects.forEach(object => {
      const key = object.key;
      
      // Skip if this is the folder itself or already processed
      if (key === folderPath || processedKeys.has(key)) {
        return;
      }

      // Check if this object is directly in the current folder
      const relativePath = key.substring(folderPath.length);
      const isDirectChild = !relativePath.includes('/') || (relativePath.startsWith('/') && relativePath.indexOf('/', 1) === -1);

      if (isDirectChild) {
        const isFolder = key.endsWith('/') || relativePath.includes('/');
        const displayName = isFolder ? 
          relativePath.replace(/^\/|\/$/g, '') : 
          relativePath.replace(/^\//, '');

        // Skip empty names
        if (!displayName || displayName.trim() === '') {
          return;
        }

        contents.push({
          key: key,
          name: displayName,
          size: object.size || 0,
          lastModified: object.lastModified,
          storageClass: object.storageClass || 'STANDARD',
          isFolder: isFolder,
          etag: object.etag
        });

        processedKeys.add(key);
      }
    });

    return contents.sort((a, b) => {
      // Folders first, then files, both alphabetically
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const handleRefresh = () => {
    fetchFolderContents();
  };

  const handleBackToBuckets = () => {
    navigate('/s3-bucket');
  };

  const handleBucketNameClick = () => {
    // Navigate back to S3 Bucket Management page with the current bucket pre-selected
    navigate('/s3-bucket', {
      state: {
        selectedBucket: {
          name: bucketName,
          region: bucketRegion
        }
      }
    });
  };

  const handleNavigateToFolder = (folderKey) => {
    setCurrentPath(folderKey);
  };

  const handleNavigateToParent = () => {
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    if (parentPath) {
      setCurrentPath(parentPath + '/');
    } else {
      // If we're at root, go back to buckets page
      handleBackToBuckets();
    }
  };

  const handleDownloadFile = async (fileKey, fileName) => {
    try {
      setLoading(true);
      
      // Create download URL
      const downloadUrl = `${BACKEND_API_BASE}/api/s3-buckets/${bucketName}/download/${encodeURIComponent(fileKey)}`;
      
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      
      // Add authorization headers by creating a fetch request first
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create object URL and trigger download
      const objectUrl = window.URL.createObjectURL(blob);
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(objectUrl);
      
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(`Failed to download file: ${err.message}`);
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

  // Create breadcrumb navigation
  const createBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(part => part.length > 0);
    const breadcrumbs = [
      { name: 'Buckets', path: '', isClickable: true }
    ];

    let currentPathBuilder = '';
    pathParts.forEach((part, index) => {
      currentPathBuilder += part + '/';
      breadcrumbs.push({
        name: part,
        path: currentPathBuilder,
        isClickable: index < pathParts.length - 1
      });
    });

    return breadcrumbs;
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header Section */}
      <Card sx={{ mb: 4, flexShrink: 0 }}>
        <CardContent>
          {/* Title and Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton onClick={handleBackToBuckets} color="primary">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              S3 Folder Contents
            </Typography>
          </Box>

          {/* Breadcrumb Navigation */}
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 2 }}
          >
            {createBreadcrumbs().map((breadcrumb, index) => (
              <Link
                key={index}
                color={breadcrumb.isClickable ? 'primary' : 'text.primary'}
                onClick={() => {
                  if (breadcrumb.isClickable) {
                    if (breadcrumb.path === '') {
                      handleBackToBuckets();
                    } else {
                      setCurrentPath(breadcrumb.path);
                    }
                  }
                }}
                sx={{ 
                  cursor: breadcrumb.isClickable ? 'pointer' : 'default',
                  textDecoration: breadcrumb.isClickable ? 'underline' : 'none'
                }}
              >
                {breadcrumb.name}
              </Link>
            ))}
          </Breadcrumbs>

          {/* Bucket Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <StorageIcon color="primary" />
            <Tooltip title="Click to return to S3 Bucket Management">
              <Typography 
                variant="h6" 
                color="primary"
                onClick={handleBucketNameClick}
                sx={{ 
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: 'primary.dark'
                  }
                }}
              >
                {bucketName}
              </Typography>
            </Tooltip>
            <Chip 
              label={bucketRegion} 
              size="small" 
              variant="outlined"
              color="primary"
            />
          </Box>

          {/* Folder Statistics */}
          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            <Chip 
              icon={<FolderIcon />}
              label={`${stats.folders} Folders`}
              color="primary"
              variant="outlined"
            />
            <Chip 
              icon={<FileIcon />}
              label={`${stats.files} Files`}
              color="secondary"
              variant="outlined"
            />
            <Chip 
              label={`Total Size: ${formatBytes(stats.totalSize)}`}
              color="info"
              variant="outlined"
            />
          </Box>

          {/* Actions */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
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
          </Box>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Folder Contents */}
      {!loading && !error && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Contents of: {currentPath || 'Root'}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Size</TableCell>
                    {!isMobile && (
                      <TableCell sx={{ fontWeight: 'bold', width: 140 }}>Storage Class</TableCell>
                    )}
                    {!isMobile && (
                      <TableCell sx={{ fontWeight: 'bold', width: 180 }}>Last Modified</TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {folderContents.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.isFolder ? (
                            <FolderIcon fontSize="small" color="primary" />
                          ) : (
                            getFileIcon(item.name)
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.875rem',
                              fontWeight: item.isFolder ? 'medium' : 'normal'
                            }}
                          >
                            {item.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.isFolder ? 'Folder' : 'File'} 
                          size="small" 
                          color={item.isFolder ? 'primary' : 'default'}
                          variant="outlined"
                          icon={item.isFolder ? <FolderIcon /> : <FileIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {item.isFolder ? '-' : formatBytes(item.size)}
                        </Typography>
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          <Chip 
                            label={item.storageClass} 
                            size="small" 
                            color={getStorageClassColor(item.storageClass)}
                            variant="outlined"
                          />
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {item.isFolder ? '-' : formatDate(item.lastModified)}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {item.isFolder ? (
                            <Button
                              variant="contained"
                              size="small"
                              color="primary"
                              onClick={() => handleNavigateToFolder(item.key)}
                              startIcon={<ViewIcon />}
                              sx={{ minWidth: 'auto', px: 2 }}
                            >
                              Open
                            </Button>
                          ) : (
                            <Tooltip title="Download file">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleDownloadFile(item.key, item.name)}
                                disabled={loading}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {folderContents.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Folder is Empty
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This folder contains no files or subfolders.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default S3Folder;
