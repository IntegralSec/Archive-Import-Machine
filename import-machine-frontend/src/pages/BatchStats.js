import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
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
  Assessment as AssessmentIcon,
  List as ListIcon,
  Info as InfoIcon,
  TableRows as TableRowsIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function BatchStats() {
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

  // Load configuration and fetch batches on component mount
  useEffect(() => {
    console.log('=== BatchStats useEffect triggered ===');
    console.log('archiveWebUI:', archiveWebUI);
    console.log('apiToken:', apiToken ? 'present' : 'missing');
    
    if (archiveWebUI && apiToken) {
      fetchBatches();
    }
  }, [archiveWebUI, apiToken, fetchBatches]);

  const handleBackToImportJobs = () => {
    navigate('/import-jobs');
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    fetchBatches();
  };

  const handleBatchReport = () => {
    console.log('Navigate to batch report for:', importJobAid, 'with name:', importJobName);
    const encodedName = encodeURIComponent(importJobName || 'Import Job');
    navigate(`/batch-report/${encodeURIComponent(importJobAid)}?name=${encodedName}`);
  };

  const handleBatchList = () => {
    console.log('Navigate to batch list for:', importJobAid, 'with name:', importJobName);
    const encodedName = encodeURIComponent(importJobName || 'Import Job');
    navigate(`/import-job-batches/${encodeURIComponent(importJobAid)}?name=${encodedName}`);
  };

  // Helper function to get status color (for MUI components)
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'processing':
      case 'active':
        return 'info';
      case 'pending':
      case 'waiting':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Chart color mapping: Done=green, validation_failed=red, importing=blue
  const getStatusChartColor = useCallback((status) => {
    const statusLower = status?.toLowerCase() || '';
    const colorMap = {
      done: '#4caf50',              // Green
      validation_failed: '#f44336', // Red
      importing: '#2196f3',         // Blue
      completed: '#4caf50',
      success: '#4caf50',
      failed: '#f44336',
      error: '#f44336',
      processing: '#2196f3',
      active: '#2196f3',
      pending: '#ff9800',
      waiting: '#ff9800'
    };
    return colorMap[statusLower] || '#9e9e9e';
  }, []);

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

    // Convert status counts to chart data format (color assigned in render via getStatusChartColor)
    const statusData = Object.entries(statusCounts).map(([status, count], index) => ({
      id: index,
      name: status,
      value: count,
      color: getStatusChartColor(status)
    }));

    return {
      totalBatches: batches.length,
      statusCounts,
      statusData,
      reimportCounts,
      containerTypeCounts
    };
  }, [batches, getStatusChartColor]);

  // Get unique status values for display
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(batches.map(batch => batch.status || 'unknown'))];
    return statuses.sort();
  }, [batches]);

  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before viewing batch statistics.
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
              {importJobName || 'Import Job'} - Statistics
            </Typography>

          </Box>
          
          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'center', 
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
              startIcon={<InfoIcon />}
              onClick={handleBatchList}
              sx={{ flex: 1, minWidth: 0 }}
            >
              Info
            </Button>
            <Button
              variant="contained"
              startIcon={<TableRowsIcon />}
              onClick={handleBatchReport}
              sx={{ flex: 1, minWidth: 0 }}
            >
              Report
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Section */}
      {!loading && !error && batches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          
          
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Batches
                  </Typography>
                  <Typography variant="h4" component="div">
                    {batchStats.totalBatches}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Unique Statuses
                  </Typography>
                  <Typography variant="h4" component="div">
                    {uniqueStatuses.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Reimport Batches
                  </Typography>
                  <Typography variant="h4" component="div">
                    {batchStats.reimportCounts.true || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Container Types
                  </Typography>
                  <Typography variant="h4" component="div">
                    {Object.keys(batchStats.containerTypeCounts).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={3}>
            {/* Status Distribution Pie Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                    Status Distribution
                  </Typography>
                  {batchStats.statusData.length > 0 ? (
                    <Box sx={{ height: 300, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                                                     <Pie
                             data={batchStats.statusData}
                             cx="50%"
                             cy="50%"
                             labelLine={false}
                             label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                             outerRadius={80}
                             fill="#8884d8"
                             dataKey="value"
                           >
                             {batchStats.statusData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography color="text.secondary" align="center">
                      No data available for chart
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Status Count Bar Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                    Status Counts
                  </Typography>
                  {batchStats.statusData.length > 0 ? (
                    <Box sx={{ height: 300, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                                                 <RechartsBarChart
                           data={batchStats.statusData}
                           margin={{
                             top: 5,
                             right: 30,
                             left: 20,
                             bottom: 5,
                           }}
                         >
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis dataKey="name" />
                           <YAxis />
                           <RechartsTooltip />
                           <Bar dataKey="value">
                             {batchStats.statusData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Bar>
                         </RechartsBarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography color="text.secondary" align="center">
                      No data available for chart
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

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

      {/* No Data State */}
      {!loading && !error && batches.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No batches found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This import job doesn't have any batches yet, or the batches couldn't be retrieved.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default BatchStats;
