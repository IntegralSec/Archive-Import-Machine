import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Divider,
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
  Breadcrumbs,
  Link,
  Grid,
  Card,
  CardContent,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Assessment as AssessmentIcon,
  TableRows as TableRowsIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function BatchList() {
  const { importJobAid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { archiveWebUI, apiToken } = useConfig();
  const { getAuthHeaders } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'batchId', direction: 'asc' });
  
  // Get import job name from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const importJobName = urlParams.get('name') || 'Import Job';

  const fetchBatches = useCallback(async () => {
    console.log('=== Starting fetchBatches ===');
    console.log('Import Job AID:', importJobAid);
    console.log('Backend API Base:', BACKEND_API_BASE);
    
    const debugData = {
      timestamp: new Date().toISOString(),
      backendApiBase: BACKEND_API_BASE,
      importJobAid,
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

    if (!importJobAid) {
      const errorMsg = 'Import Job AID is required.';
      console.error('Import Job AID missing');
      setError(errorMsg);
      setDebugInfo({ ...debugData, error: errorMsg, step: 'aid_check' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch batches from backend
      const url = `${BACKEND_API_BASE}/api/import-job-batches/${encodeURIComponent(importJobAid)}`;
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

      debugData.backendData = {
        success: data.success,
        totalCount: data.data?.totalCount || 0,
        resultsCount: data.data?.results?.length || 0
      };

      if (data.success && data.data?.results) {
        setBatches(data.data.results);
        setDebugInfo({ ...debugData, step: 'success' });
      } else {
        throw new Error('Invalid response format from backend');
      }
      
    } catch (err) {
      console.error('=== Error in fetchBatches ===');
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      debugData.error = {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack
      };
      debugData.step = 'error';
      
      setError(`Failed to fetch batches: ${err.message}`);
      setDebugInfo(debugData);
    } finally {
      setLoading(false);
      console.log('=== fetchBatches completed ===');
    }
  }, [importJobAid, archiveWebUI, apiToken, getAuthHeaders]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log('=== useEffect triggered ===');
    console.log('importJobAid changed:', importJobAid);
    console.log('archiveWebUI changed:', archiveWebUI);
    console.log('apiToken changed:', apiToken ? 'present' : 'missing');
    fetchBatches();
  }, [fetchBatches]);

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    fetchBatches();
  };

  const handleBackToImportJobs = () => {
    navigate('/import-jobs');
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!batches.length) return [];
    
    return [...batches].sort((a, b) => {
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
        case 'reimport':
          aValue = a.reimport ? 'yes' : 'no';
          bValue = b.reimport ? 'yes' : 'no';
          break;
        case 'containerType':
          aValue = a.containerType || '';
          bValue = b.containerType || '';
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'done':
        return 'success';
      case 'validation_failed':
        return 'error';
      case 'processing':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getReimportColor = (reimport) => {
    return reimport ? 'warning' : 'default';
  };

  // Calculate batch statistics
  const batchStats = useMemo(() => {
    if (!batches.length) {
      return {
        totalBatches: 0,
        statusCounts: {},
        statusData: [],
        reimportCounts: { true: 0, false: 0 },
        containerTypeCounts: {}
      };
    }

    const statusCounts = {};
    const reimportCounts = { true: 0, false: 0 };
    const containerTypeCounts = {};

    batches.forEach(batch => {
      // Count statuses
      const status = batch.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      // Count reimport flags
      const reimport = batch.reimport || false;
      reimportCounts[reimport] = (reimportCounts[reimport] || 0) + 1;

      // Count container types
      const containerType = batch.containerType || 'unknown';
      containerTypeCounts[containerType] = (containerTypeCounts[containerType] || 0) + 1;
    });

    // Convert status counts to chart data format
    const statusData = Object.entries(statusCounts).map(([status, count], index) => ({
      id: index,
      name: status,
      value: count,
      color: getStatusColor(status)
    }));

    return {
      totalBatches: batches.length,
      statusCounts,
      statusData,
      reimportCounts,
      containerTypeCounts
    };
  }, [batches]);

  // Get unique status values for display
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(batches.map(batch => batch.status || 'unknown'))];
    return statuses.sort();
  }, [batches]);

  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before viewing batch details.
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
                 <Typography color="text.primary">{importJobName || 'Import Job'}</Typography>
      </Breadcrumbs>

             {/* Header Section */}
       <Card sx={{ mb: 4, flexShrink: 0 }}>
         <CardContent>
           {/* Title and Subtitle */}
           <Box sx={{ mb: 2 }}>
             <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
               {importJobName || 'Import Job'}
             </Typography>
          
           </Box>
           
           {/* Buttons */}
           <Box sx={{ 
             display: 'flex', 
             gap: 2, 
             flexWrap: 'wrap',
             flexDirection: isMobile ? 'column' : 'row',
             width: '100%'
           }}>
             <Button
               variant="outlined"
               startIcon={<ArrowBackIcon />}
               onClick={handleBackToImportJobs}
               sx={{ flex: 1, minWidth: 0 }}
             >
               Back
             </Button>
             <Button
               variant="outlined"
               startIcon={<RefreshIcon />}
               onClick={handleRefresh}
               disabled={loading}
               sx={{ flex: 1, minWidth: 0 }}
             >
               Refresh
             </Button>
             <Button
               variant="contained"
               startIcon={<AssessmentIcon />}
               onClick={() => navigate(`/batch-stats/${encodeURIComponent(importJobAid)}?name=${encodeURIComponent(importJobName)}`)}
               sx={{ flex: 1, minWidth: 0 }}
             >
               Stats
             </Button>
             <Button
               variant="contained"
               startIcon={<TableRowsIcon />}
               onClick={() => navigate(`/batch-report/${encodeURIComponent(importJobAid)}?name=${encodeURIComponent(importJobName)}`)}
               sx={{ flex: 1, minWidth: 0 }}
             >
               Report
             </Button>
           </Box>
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
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Table Section */}
      {!loading && !error && (
        <Card>
          <CardContent >
          <Typography variant="h5" gutterBottom>
              Batch List
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
              <Table stickyHeader sx={{ minWidth: isMobile ? 400 : 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      minWidth: isMobile ? 200 : 200,
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
                        minWidth: 120,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                      onClick={() => handleSort('reimport')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Reimport
                        {getSortIcon('reimport')}
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
                      onClick={() => handleSort('containerType')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Container Type
                        {getSortIcon('containerType')}
                      </Box>
                    </TableCell>
                  )}
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      minWidth: isMobile ? 150 : 100,
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
                </TableRow>
              </TableHead>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 2 : 5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No batches found for this import job.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getSortedData().map((batch) => (
                    <TableRow key={batch.aid} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        {batch.name}
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2">
                            {batch.description || 'No description'}
                          </Typography>
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          <Chip 
                            label={batch.reimport ? 'Yes' : 'No'} 
                            color={getReimportColor(batch.reimport)}
                            size="small"
                            variant={batch.reimport ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                      )}
                      {!isMobile && (
                        <TableCell>
                          <Chip 
                            label={batch.containerType} 
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip 
                          label={batch.status} 
                          color={getStatusColor(batch.status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
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

export default BatchList;
