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
  Card,
  CardContent,
  Collapse,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  BarChart as BarChartIcon,
  TableRows as TableRowsIcon
} from '@mui/icons-material';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function ImportJobs() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { archiveWebUI, apiToken, loading: configLoading } = useConfig();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [importJobs, setImportJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchImportJobs = useCallback(async (forceRefresh = false) => {
    console.log('=== Starting fetchImportJobs ===');
    console.log('Backend API Base:', BACKEND_API_BASE);
    console.log('Force refresh:', forceRefresh);
    
    const debugData = {
      timestamp: new Date().toISOString(),
      backendApiBase: BACKEND_API_BASE,
      archiveWebUI,
      apiTokenLength: apiToken ? apiToken.length : 0,
      apiTokenPrefix: apiToken ? apiToken.substring(0, 10) : 'undefined',
      forceRefresh
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
      // Fetch import jobs from backend
      const url = `${BACKEND_API_BASE}/api/import-jobs${forceRefresh ? '?refresh=true' : ''}`;
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
        setImportJobs(data.data.results);
        setDebugInfo({ ...debugData, step: 'success' });
      } else {
        throw new Error('Invalid response format from backend');
      }
      
    } catch (err) {
      console.error('=== Error in fetchImportJobs ===');
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      debugData.error = {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack
      };
      debugData.step = 'error';
      
      setError(`Failed to fetch import jobs: ${err.message}`);
      setDebugInfo(debugData);
    } finally {
      setLoading(false);
      console.log('=== fetchImportJobs completed ===');
    }
  }, [archiveWebUI, apiToken, getAuthHeaders]);

  // Load configuration and fetch import jobs on component mount
  useEffect(() => {
    console.log('=== ImportJobs useEffect triggered ===');
    console.log('Config loading:', configLoading);
    console.log('archiveWebUI:', archiveWebUI);
    console.log('apiToken:', apiToken ? 'present' : 'missing');
    
    // Configuration is already loaded by ConfigContext, no need to reload here
  }, []); // Only run on mount

  // Fetch import jobs when configuration is loaded
  useEffect(() => {
    if (!configLoading && archiveWebUI && apiToken) {
      console.log('Configuration loaded, fetching import jobs...');
      fetchImportJobs(false); // Use cached data if available on initial load
    }
  }, [configLoading, archiveWebUI, apiToken]); // Removed fetchImportJobs from dependencies to prevent infinite loop

  const handleAddImportJob = () => {
    navigate('/create-import-job');
  };

  const handleNewBatch = (id, name) => {
    console.log('Create new batch for import job:', id, 'with name:', name);
    const encodedName = encodeURIComponent(name || 'Import Job');
    navigate(`/new-batch/${encodeURIComponent(id)}?name=${encodedName}`);
  };

  const handleViewImportJob = (id, name) => {
    console.log('View import job statistics:', id, 'with name:', name);
    const encodedName = encodeURIComponent(name || 'Import Job');
    navigate(`/batch-stats/${encodeURIComponent(id)}?name=${encodedName}`);
  };

  const handleBatchReport = (id, name) => {
    console.log('View batch report for import job:', id, 'with name:', name);
    const encodedName = encodeURIComponent(name || 'Import Job');
    navigate(`/batch-report/${encodeURIComponent(id)}?name=${encodedName}`);
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered - forcing refresh from archive system');
    fetchImportJobs(true);
  };

  const handleRowClick = (importJobAid, importJobName) => {
    console.log('Row clicked, navigating to batch details for:', importJobAid, 'with name:', importJobName);
    const encodedName = encodeURIComponent(importJobName || 'Import Job');
    navigate(`/import-job-batches/${encodeURIComponent(importJobAid)}?name=${encodedName}`);
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
    if (!importJobs.length) return [];
    
    return [...importJobs].sort((a, b) => {
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
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const CollapsibleRow = ({ job, isExpanded }) => {
    return (
      <>
        <TableRow 
          hover 
          onClick={() => handleRowClick(job.aid, job.name)}
          sx={{ 
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)'
            }
          }}
        >
          <TableCell onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="small"
              onClick={() => handleRowToggle(job.aid)}
            >
              {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell sx={{ fontWeight: 'medium' }}>
            {job.name}
          </TableCell>
          {!isMobile && (
            <TableCell sx={{ minWidth: 300 }}>
              <Typography variant="body2">
                {job.description || 'No description'}
              </Typography>
            </TableCell>
          )}
          {!isMobile && (
            <TableCell>
              <Chip 
                label={job.status} 
                color={getStatusColor(job.status)}
                size="small"
              />
            </TableCell>
          )}
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 2 : 4}>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      Detailed Information
                    </Typography>
                    {isMobile && (
                      <Chip 
                        label={job.status} 
                        color={getStatusColor(job.status)}
                        size="small"
                      />
                    )}
                  </Box>
                                 <Box sx={{ 
                   display: 'flex', 
                   flexDirection: 'column',
                   gap: 2 
                 }}>
                   <Box>
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                       {isMobile && (
                         <Box sx={{ 
                           display: 'flex', 
                           flexDirection: 'row',
                           gap: 2,
                           alignItems: 'center'
                         }}>
                           <Typography variant="body2" color="text.secondary" sx={{ minWidth: '120px' }}>Description:</Typography>
                           <Typography variant="body2">
                             {job.description || 'No description'}
                           </Typography>
                         </Box>
                       )}
                       <Box sx={{ 
                         display: 'flex', 
                         flexDirection: 'row',
                         gap: 2,
                         alignItems: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary" sx={{ minWidth: '120px' }}>AID:</Typography>
                         <Typography variant="body2">{job.aid}</Typography>
                       </Box>
                       <Box sx={{ 
                         display: 'flex', 
                         flexDirection: 'row',
                         gap: 2,
                         alignItems: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary" sx={{ minWidth: '120px' }}>Ingestion Point ID:</Typography>
                         <Typography variant="body2">{job.ingestionPointId}</Typography>
                       </Box>
                     </Box>
                   </Box>

                   <Box>
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                       <Box sx={{ 
                         display: 'flex', 
                         flexDirection: 'row',
                         gap: 2,
                         alignItems: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary" sx={{ minWidth: '120px' }}>Apply Supervision:</Typography>
                         <Chip 
                           label={job.applySupervision ? 'Yes' : 'No'} 
                           color={job.applySupervision ? 'primary' : 'default'}
                           size="small"
                           variant={job.applySupervision ? 'filled' : 'outlined'}
                         />
                       </Box>
                       <Box sx={{ 
                         display: 'flex', 
                         flexDirection: 'row',
                         gap: 2,
                         alignItems: 'center'
                       }}>
                         <Typography variant="body2" color="text.secondary" sx={{ minWidth: '120px' }}>Apply Legal Hold:</Typography>
                         <Chip 
                           label={job.applyLegalHold ? 'Yes' : 'No'} 
                           color={job.applyLegalHold ? 'primary' : 'default'}
                           size="small"
                           variant={job.applyLegalHold ? 'filled' : 'outlined'}
                         />
                       </Box>
                     </Box>
                   </Box>
                 </Box>
                
                                 {/* Action Buttons */}
                 <Box sx={{ 
                   mt: 3, 
                   display: 'flex', 
                   flexDirection: 'row',
                   gap: 2
                 }}>
                   <Button
                     variant="outlined"
                     size="medium"
                     fullWidth
                     startIcon={<InfoIcon />}
                     onClick={() => handleRowClick(job.aid, job.name)}
                   >
                     Info
                   </Button>
                   <Button
                     variant="outlined"
                     size="medium"
                     fullWidth
                     startIcon={<BarChartIcon />}
                     onClick={() => handleViewImportJob(job.aid, job.name)}
                   >
                     Stats
                   </Button>
                   <Button
                     variant="outlined"
                     size="medium"
                     fullWidth
                     startIcon={<TableRowsIcon />}
                     onClick={() => handleBatchReport(job.aid, job.name)}
                   >
                     Report
                   </Button>
                                      <Button
                     variant="outlined"
                     size="medium"
                     fullWidth
                     startIcon={<AddIcon />}
                     onClick={() => handleNewBatch(job.aid, job.name)}
                   >
                     New Batch
                   </Button>
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
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before viewing import jobs.
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
               Import Jobs
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
              onClick={handleAddImportJob}
              sx={{ width: isMobile ? '100%' : 'auto' }}
            >
              Add Import Job
            </Button>
          </Box>
          
          {/* Description */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage Archive import jobs. Click the arrow to expand and view detailed information for each import job.
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
              Import Jobs
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
                {importJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 2 : 4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No import jobs found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getSortedData().map((job) => (
                    <CollapsibleRow 
                      key={job.aid} 
                      job={job} 
                      isExpanded={expandedRows.has(job.aid)}
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

export default ImportJobs;

