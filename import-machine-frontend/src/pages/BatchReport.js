import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  useMediaQuery,
  useTheme,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  Assessment as AssessmentIcon,
  List as ListIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

// Backend API base URL
import { BACKEND_API_BASE } from '../config';

function BatchReport() {
  const { importJobAid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { archiveWebUI, apiToken } = useConfig();
  const { getAuthHeaders } = useAuth();
  
  // Get import job name from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const importJobName = urlParams.get('name') || 'Import Job';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchReport, setBatchReport] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchBatchReport = async () => {
    if (!archiveWebUI || !apiToken) {
      setError('Please configure your Archive Web UI and API Token in the Config page first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/import-job-batches/${encodeURIComponent(importJobAid)}/batch-report`, {
        method: 'GET',
        headers: { ...getAuthHeaders() }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setBatchReport(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch batch report');
      }
      
    } catch (err) {
      console.error('Error fetching batch report:', err);
      setError(`Failed to fetch batch report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (importJobAid) {
      fetchBatchReport();
    }
  }, [importJobAid]);

  const handleBackToImportJobs = () => {
    navigate('/import-jobs');
  };

  const handleRefresh = () => {
    fetchBatchReport();
  };

  const handleBatchList = () => {
    console.log('Navigate to batch list for:', importJobAid, 'with name:', importJobName);
    const encodedName = encodeURIComponent(importJobName || 'Import Job');
    navigate(`/import-job-batches/${encodeURIComponent(importJobAid)}?name=${encodedName}`);
  };

  const handleBatchStats = () => {
    console.log('Navigate to batch stats for:', importJobAid, 'with name:', importJobName);
    const encodedName = encodeURIComponent(importJobName || 'Import Job');
    navigate(`/batch-stats/${encodeURIComponent(importJobAid)}?name=${encodedName}`);
  };

  const handleRowToggle = (batchId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(batchId)) {
      newExpandedRows.delete(batchId);
    } else {
      newExpandedRows.add(batchId);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      'done': { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'Done' },
      'processing': { color: 'info', icon: <ScheduleIcon fontSize="small" />, label: 'Processing' },
      'validation_failed': { color: 'error', icon: <ErrorIcon fontSize="small" />, label: 'Validation Failed' },
      'failed': { color: 'error', icon: <ErrorIcon fontSize="small" />, label: 'Failed' },
      'pending': { color: 'warning', icon: <WarningIcon fontSize="small" />, label: 'Pending' }
    };

    const config = statusConfig[status] || { color: 'default', icon: null, label: status };

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  if (!archiveWebUI || !apiToken) {
    return (
      <Box sx={{ p: 3, minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please configure your Archive Web UI and API Token in the Config page before viewing batch reports.
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
          onClick={() => navigate(`/import-job-batches/${encodeURIComponent(importJobAid)}?name=${encodeURIComponent(importJobName)}`)}
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
        >
          <AssessmentIcon sx={{ mr: 0.5 }} fontSize="small" />
          {importJobName}
        </Link>
        <Typography color="text.primary">Batch Report</Typography>
      </Breadcrumbs>

      {/* Header Section*/}
      <Card sx={{ mb: 4, flexShrink: 0 }}>
        <CardContent>
            {/* Title and Subtitle */}
            <Box sx={{ mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              {importJobName || 'Import Job'} - Batch Report
            </Typography>

          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
              width: '100%'
            }}>
                            <Button
                variant="outlined"
                startIcon={<BackIcon />}
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
                startIcon={<AssessmentIcon />}
                onClick={handleBatchStats}
                sx={{ flex: 1, minWidth: 0 }}
              >
                Stats
              </Button>

            </Box>
          </Box>
         
          {batchReport && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Total Batches: {batchReport.totalCount}
            </Typography>
          )}
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

      {/* Batch Report Table */}
      {!loading && !error && batchReport && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Batch Details
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader sx={{ minWidth: isMobile ? 400 : 1200 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50 }}></TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: isMobile ? 150 : 150 }}>Batch Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: isMobile ? 120 : 120 }}>Status</TableCell>
                    {!isMobile && (
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Type</TableCell>
                    )}
                    {!isMobile && (
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Messages</TableCell>
                    )}
                    {!isMobile && (
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Processed</TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 'bold', minWidth: isMobile ? 120 : 120 }}>Archived</TableCell>
                    {!isMobile && (
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Size</TableCell>
                    )}
                    {!isMobile && (
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Last Updated</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchReport.results.map((batch) => (
                    <React.Fragment key={batch.batchId}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRowToggle(batch.batchId)}
                          >
                            {expandedRows.has(batch.batchId) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {batch.batchName}
                          </Typography>
                          {batch.description && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {batch.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusChip(batch.batchStatus)}
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            <Chip
                              label={batch.batchType}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          </TableCell>
                        )}
                        {!isMobile && (
                          <TableCell>
                            <Typography variant="body2">
                              {formatNumber(batch.totalMessages)}
                            </Typography>
                          </TableCell>
                        )}
                        {!isMobile && (
                          <TableCell>
                            <Typography variant="body2">
                              {formatNumber(batch.totalProcessed)}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell>
                          <Typography variant="body2">
                            {formatNumber(batch.totalArchived)}
                          </Typography>
                        </TableCell>
                        {!isMobile && (
                          <TableCell>
                            <Typography variant="body2">
                              {formatBytes(batch.batchSizeInBytes)}
                            </Typography>
                          </TableCell>
                        )}
                        {!isMobile && (
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(batch.lastUpdatedAt)}
                            </Typography>
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {/* Expanded Row Details */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={isMobile ? 4 : 9}>
                          <Collapse in={expandedRows.has(batch.batchId)} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="h6" gutterBottom>
                                Detailed Information
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Batch ID</Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                    {batch.batchId}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Ready At</Typography>
                                  <Typography variant="body2">{formatDate(batch.readyAt)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Start At</Typography>
                                  <Typography variant="body2">{formatDate(batch.startAt)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">To Be Processed</Typography>
                                  <Typography variant="body2">{formatNumber(batch.totalToBeProcessed)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Deduplicated</Typography>
                                  <Typography variant="body2">{formatNumber(batch.totalDeduplicated)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Supervision Evaluated</Typography>
                                  <Typography variant="body2">{formatNumber(batch.totalSupervisionEvaluated)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">Supervision Flagged</Typography>
                                  <Typography variant="body2">{formatNumber(batch.totalSupervisionFlagged)}</Typography>
                                </Box>
                                {batch.validationDetailsUrl && (
                                  <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Validation Details</Typography>
                                    <Button
                                      size="small"
                                      startIcon={<OpenInNewIcon />}
                                      onClick={() => window.open(batch.validationDetailsUrl, '_blank')}
                                      sx={{ mt: 0.5 }}
                                    >
                                      View Details
                                    </Button>
                                  </Box>
                                )}
                                {batch.validationFailReason && (
                                  <Box sx={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                                    <Typography variant="subtitle2" color="text.secondary">Validation Fail Reason</Typography>
                                    <Alert severity="error" sx={{ mt: 0.5 }}>
                                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {batch.validationFailReason}
                                      </Typography>
                                    </Alert>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && batchReport && batchReport.results.length === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" align="center" color="text.secondary">
              No batches found for this import job.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default BatchReport;
