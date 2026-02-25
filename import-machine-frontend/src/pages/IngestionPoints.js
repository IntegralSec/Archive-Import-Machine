import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function IngestionPoints() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { archiveWebUI, apiToken, loading: configLoading } = useConfig();
  const { getAuthHeaders } = useAuth();
  const [ingestionPoints, setIngestionPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchIngestionPoints = useCallback(async () => {
    console.log('=== Starting fetchIngestionPoints ===');
    console.log('Backend API Base:', BACKEND_API_BASE);
    
    const debugData = {
      timestamp: new Date().toISOString(),
      backendApiBase: BACKEND_API_BASE,
      archiveWebUI,
      apiTokenLength: apiToken ? apiToken.length : 0,
      apiTokenPrefix: apiToken ? apiToken.substring(0, 10) : 'undefined'
    };

    if (!archiveWebUI || !apiToken) {
      const errorMsg = 'Please configure Archive Web UI and API Token in the Config page first.';
      console.error('Configuration missing:', { archiveWebUI: !!archiveWebUI, apiToken: !!apiToken });
      setError(errorMsg);
      setDebugInfo({ ...debugData, error: errorMsg, step: 'configuration_check' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch ingestion points from backend
      const url = `${BACKEND_API_BASE}/api/ingestion-points`;
      console.log('Fetching from backend URL:', url);

      debugData.backendUrl = url;
      debugData.step = 'backend_request';

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      console.log('Backend response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      debugData.backendResponse = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      };

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend API Error:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      console.log('Parsing backend response...');
      debugData.step = 'json_parsing';
      
      const data = await response.json();

      console.log('Backend API Response:', data);
      console.log('Total results:', data.data?.totalCount);
      console.log('ImportS3 count:', data.data?.importS3Count);

      debugData.backendData = {
        success: data.success,
        totalCount: data.data?.totalCount || 0,
        importS3Count: data.data?.importS3Count || 0,
        resultsCount: data.data?.results?.length || 0
      };

      if (data.success && data.data?.results) {
        setIngestionPoints(data.data.results);
        setDebugInfo({ ...debugData, step: 'success' });
      } else {
        throw new Error('Invalid response format from backend');
      }
      
    } catch (err) {
      console.error('=== Error in fetchIngestionPoints ===');
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      debugData.error = {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack
      };
      debugData.step = 'error';
      
      setError(`Failed to fetch ingestion points: ${err.message}`);
      setDebugInfo(debugData);
    } finally {
      setLoading(false);
      console.log('=== fetchIngestionPoints completed ===');
    }
  }, [archiveWebUI, apiToken, getAuthHeaders]);

  // Load configuration and fetch ingestion points on component mount
  useEffect(() => {
    console.log('=== IngestionPoints useEffect triggered ===');
    console.log('Config loading:', configLoading);
    console.log('archiveWebUI:', archiveWebUI);
    console.log('apiToken:', apiToken ? 'present' : 'missing');
    
    // Configuration is already loaded by ConfigContext, no need to reload here
  }, []); // Only run on mount

  // Fetch ingestion points when configuration is loaded
  useEffect(() => {
    if (!configLoading && archiveWebUI && apiToken) {
      console.log('Configuration loaded, fetching ingestion points...');
      fetchIngestionPoints();
    }
  }, [configLoading, archiveWebUI, apiToken, fetchIngestionPoints]);

  const handleAddIngestionPoint = () => {
    navigate('/new-ingestion-point');
  };

  const handleEditIngestionPoint = (id) => {
    // TODO: Implement edit functionality
    console.log('Edit ingestion point:', id);
  };

  const handleDeleteIngestionPoint = (id) => {
    // TODO: Implement delete functionality
    console.log('Delete ingestion point:', id);
  };

  const handleViewIngestionPoint = (id) => {
    // TODO: Implement view functionality
    console.log('View ingestion point:', id);
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    fetchIngestionPoints();
  };

  const handleRowToggle = (aid) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(aid)) {
      newExpandedRows.delete(aid);
    } else {
      newExpandedRows.add(aid);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!ingestionPoints.length) return [];
    
    return [...ingestionPoints].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'description':
          aValue = a.description || '';
          bValue = b.description || '';
          break;
        case 'bucketPrefix':
          aValue = a.typeDetails?.bucketPrefix || '';
          bValue = b.typeDetails?.bucketPrefix || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'importS3':
        return 'primary';
      case 'liveMta':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      default:
        return 'default';
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

  const CollapsibleRow = ({ point, isExpanded }) => {
    const bucketPrefix = point.typeDetails?.bucketPrefix || 'N/A';
    
    return (
      <>
        <TableRow hover>
          <TableCell>
            <IconButton
              size="small"
              onClick={() => handleRowToggle(point.aid)}
            >
              {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell sx={{ fontWeight: 'medium' }}>
            {point.name}
          </TableCell>
          {!isMobile && (
            <TableCell sx={{ minWidth: 200 }}>
              <Typography variant="body2">
                {point.description || 'No description'}
              </Typography>
            </TableCell>
          )}
          {!isMobile && (
            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {bucketPrefix}
            </TableCell>
          )}
          {!isMobile && (
            <TableCell>
              <Chip 
                label={point.status} 
                size="small"
                color={getStatusColor(point.status)}
              />
            </TableCell>
          )}
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 2 : 5}>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    Detailed Information
                  </Typography>
                  {isMobile && (
                    <Chip 
                      label={point.status} 
                      color={getStatusColor(point.status)}
                      size="small"
                    />
                  )}
                </Box>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: 2 
                }}>
                  {/* Basic Information */}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Basic Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {isMobile && (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: 0.5
                        }}>
                          <Typography variant="body2" color="text.secondary">Description:</Typography>
                          <Typography variant="body2">
                            {point.description || 'No description'}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: isMobile ? 'flex-start' : 'space-between',
                        gap: isMobile ? 0.5 : 0
                      }}>
                        <Typography variant="body2" color="text.secondary">AID:</Typography>
                        <Typography variant="body2" sx={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.75rem',
                          wordBreak: 'break-all'
                        }}>
                          {point.aid}
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: isMobile ? 'flex-start' : 'space-between',
                        gap: isMobile ? 0.5 : 0
                      }}>
                        <Typography variant="body2" color="text.secondary">Source Short Name:</Typography>
                        <Typography variant="body2">
                          <Chip label={point.srcShortName} size="small" variant="outlined" />
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: isMobile ? 'flex-start' : 'space-between',
                        gap: isMobile ? 0.5 : 0
                      }}>
                        <Typography variant="body2" color="text.secondary">Type:</Typography>
                        <Typography variant="body2">
                          <Chip 
                            label={point.typeDetails?.type} 
                            color={getTypeColor(point.typeDetails?.type)}
                            size="small"
                          />
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: isMobile ? 'flex-start' : 'space-between',
                        gap: isMobile ? 0.5 : 0
                      }}>
                        <Typography variant="body2" color="text.secondary">Created On:</Typography>
                        <Typography variant="body2">{formatDate(point.createdOn)}</Typography>
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: isMobile ? 'flex-start' : 'space-between',
                        gap: isMobile ? 0.5 : 0
                      }}>
                        <Typography variant="body2" color="text.secondary">Updated On:</Typography>
                        <Typography variant="body2">{formatDate(point.updatedOn)}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Type-specific Details */}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Type Details
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {point.typeDetails?.type === 'importS3' ? (
                        <>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: isMobile ? 'flex-start' : 'space-between',
                            gap: isMobile ? 0.5 : 0
                          }}>
                            <Typography variant="body2" color="text.secondary">AWS Region:</Typography>
                            <Typography variant="body2">
                              <Chip label={point.typeDetails.awsRegion} size="small" variant="outlined" color="info" />
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: isMobile ? 'flex-start' : 'space-between',
                            gap: isMobile ? 0.5 : 0
                          }}>
                            <Typography variant="body2" color="text.secondary">Bucket Name:</Typography>
                            <Typography variant="body2" sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.75rem',
                              wordBreak: 'break-all'
                            }}>
                              {point.typeDetails.bucketName}
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: isMobile ? 'flex-start' : 'space-between',
                            gap: isMobile ? 0.5 : 0
                          }}>
                            <Typography variant="body2" color="text.secondary">Import AWS Role:</Typography>
                            <Typography variant="body2">
                              {point.typeDetails.importAwsRole || 'N/A'}
                            </Typography>
                          </Box>
                        </>
                      ) : point.typeDetails?.type === 'liveMta' ? (
                        <>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: isMobile ? 'flex-start' : 'space-between',
                            gap: isMobile ? 0.5 : 0
                          }}>
                            <Typography variant="body2" color="text.secondary">Address:</Typography>
                            <Typography variant="body2" sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.75rem',
                              wordBreak: 'break-all'
                            }}>
                              {point.typeDetails.address}
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: isMobile ? 'flex-start' : 'space-between',
                            gap: isMobile ? 0.5 : 0
                          }}>
                            <Typography variant="body2" color="text.secondary">Daily Volume:</Typography>
                            <Typography variant="body2">{point.typeDetails.dailyVolume}</Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: isMobile ? 'flex-start' : 'space-between',
                            gap: isMobile ? 0.5 : 0
                          }}>
                            <Typography variant="body2" color="text.secondary">Daily Size:</Typography>
                            <Typography variant="body2">{point.typeDetails.dailySize}</Typography>
                          </Box>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Unknown type details
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before viewing ingestion points.
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
              Ingestion Points
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
              onClick={handleAddIngestionPoint}
              sx={{ width: isMobile ? '100%' : 'auto' }}
            >
              Add Ingestion Point
            </Button>
          </Box>
          
          {/* Description */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage Archive ingestion points. Click the arrow to expand and view detailed information for each ingestion point.
            {isMobile && ' On mobile devices, only the name column is shown. Expand rows to see full details.'}
          </Typography>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          {error.includes('Failed to fetch') && (
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

      {/* Loading State */}
      {(loading || configLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Table Section */}
      {!loading && !configLoading && !error && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Ingestion Points List
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
              <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: 50 }}></TableCell>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      minWidth: 200, 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                    onClick={() => handleSort('name')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Name
                      {getSortIcon('name')}
                    </Box>
                  </TableCell>
                  {!isMobile && (
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        minWidth: 300, 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                      onClick={() => handleSort('description')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Description
                        {getSortIcon('description')}
                      </Box>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        minWidth: 150, 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                      onClick={() => handleSort('bucketPrefix')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Bucket Prefix
                        {getSortIcon('bucketPrefix')}
                      </Box>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        minWidth: 100, 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                      onClick={() => handleSort('status')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Status
                        {getSortIcon('status')}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {ingestionPoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 2 : 5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No ingestion points found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getSortedData().map((point) => (
                    <CollapsibleRow 
                      key={point.aid} 
                      point={point} 
                      isExpanded={expandedRows.has(point.aid)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default IngestionPoints;
