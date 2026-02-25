import React from 'react';
import {
  Typography,
  Card,
  CardContent,
  Box
} from '@mui/material';

function About() {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Box sx={{ width: '100%' }}>
        {/* Header Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h4" component="h1" gutterBottom>
              About Import Machine
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              This is a modern React application built with Material-UI and React Router.
              It demonstrates best practices for building scalable web applications.
            </Typography>
          </CardContent>
        </Card>
        
        {/* Technology Stack Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Technology Stack
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • React 19<br/>
              • React Router DOM<br/>
              • Material-UI (MUI)<br/>
              • Create React App<br/>
              • Modern JavaScript (ES6+)
            </Typography>
          </CardContent>
        </Card>
        
        {/* Workflow Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Workflow
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1. <strong>Configure</strong> — Enter the Archive URL, API Key, and S3 bucket details in Config.<br/>
              2. <strong>Create Ingestion Points</strong> — Define ingestion points for your archive.<br/>
              3. <strong>Create Import Jobs</strong> — Create import jobs linked to ingestion points.<br/>
              4. <strong>Add Files</strong> — Select EML files via S3 or upload them directly.<br/>
              5. <strong>Create Batches</strong> — Package EML files into batches with manifest JSON.<br/>
              6. <strong>Import</strong> — Trigger the archive import process.<br/>
              7. <strong>Monitor</strong> — View batch reports and stats to track import progress.
            </Typography>
          </CardContent>
        </Card>
        
        {/* Features Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Features
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Responsive design<br/>
              • Component-based architecture<br/>
              • Clean and modern UI<br/>
              • Easy navigation<br/>
              • Scalable structure
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default About; 