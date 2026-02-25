import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, Box, CssBaseline, useMediaQuery } from '@mui/material';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { AuthProvider } from './contexts/AuthContext';
import { DrawerProvider, useDrawer } from './contexts/DrawerContext';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';

import Config from './pages/Config';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';

import IngestionPoints from './pages/IngestionPoints';
import NewIngestionPoint from './pages/NewIngestionPoint';
import ImportJobs from './pages/ImportJobs';
import ChangePassword from './pages/ChangePassword';
import BatchList from './pages/BatchList';
import BatchStats from './pages/BatchStats';
import NewBatch from './pages/NewBatch';
import BatchReport from './pages/BatchReport';
import CreateImportJob from './pages/CreateImportJob';
import S3Bucket from './pages/S3Bucket';
import S3Folder from './pages/S3Folder';
import ImportNow from './pages/ImportNow';
import Upload from './pages/Upload';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfigProvider>
          <AppContent />
        </ConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme } = useTheme();
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <DrawerProvider>
        <Router>
          <AppLayout />
        </Router>
      </DrawerProvider>
    </MuiThemeProvider>
  );
}

function AppLayout() {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const { drawerWidth } = useDrawer();
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
          mt: '64px', // Height of AppBar
          display: 'flex',
          justifyContent: 'center',
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Box
          sx={{
            width: isMobile ? '100%' : '90%',
            maxWidth: isMobile ? '100%' : '1800px',
            minWidth: isMobile ? '100%' : '1200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />

          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/config" element={
            <ProtectedRoute>
              <Config />
            </ProtectedRoute>
          } />
          <Route path="/ingestion-points" element={
            <ProtectedRoute>
              <IngestionPoints />
            </ProtectedRoute>
          } />
          <Route path="/new-ingestion-point" element={
            <ProtectedRoute>
              <NewIngestionPoint />
            </ProtectedRoute>
          } />
          <Route path="/import-jobs" element={
            <ProtectedRoute>
              <ImportJobs />
            </ProtectedRoute>
          } />
          
          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />
                  <Route path="/import-job-batches/:importJobAid" element={
          <ProtectedRoute>
            <BatchList />
          </ProtectedRoute>
        } />
        <Route path="/batch-stats/:importJobAid" element={
          <ProtectedRoute>
            <BatchStats />
          </ProtectedRoute>
        } />
        <Route path="/new-batch/:importJobAid" element={
          <ProtectedRoute>
            <NewBatch />
          </ProtectedRoute>
        } />
        <Route path="/batch-report/:importJobAid" element={
          <ProtectedRoute>
            <BatchReport />
          </ProtectedRoute>
        } />
        <Route path="/create-import-job" element={
          <ProtectedRoute>
            <CreateImportJob />
          </ProtectedRoute>
        } />
        <Route path="/s3-bucket" element={
          <ProtectedRoute>
            <S3Bucket />
          </ProtectedRoute>
        } />
        <Route path="/s3-folder" element={
          <ProtectedRoute>
            <S3Folder />
          </ProtectedRoute>
        } />
        <Route path="/import-now" element={
          <ProtectedRoute>
            <ImportNow />
          </ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        } />
        </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default App;

