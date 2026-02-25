import React from 'react';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Chip
} from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

function Home() {
  const { isDarkMode } = useTheme();
  
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Box sx={{ width: '100%' }}>
        {/* Header Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h4" component="h1" gutterBottom>
              Archive Import Machine
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
             This web app will help you import EML files into your archive.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip 
                label={`Current Theme: ${isDarkMode ? 'Dark' : 'Light'}`}
                color={isDarkMode ? 'primary' : 'secondary'}
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
        
        {/* Features Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Features
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Select EML files to import.<br/>
              • Package EML files into a ZIP file as a batch.<br/>
              • Geneerate a manifest JSON file.<br/>
              • Upload to an S3 bucket.<br/>
              • Trigger the archive import process.<br/>
              • Monitor the import process.<br/>
              
              • Generate reports.<br/>
              • Validate imported files.
            </Typography>
          </CardContent>
        </Card>
        
        {/* Getting Started Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Getting Started
            </Typography>
                        <Typography variant="body2" color="text.secondary">
             1. Enter the Archive URL.<br/>
             2. Enter the Archive API Key.<br/>
             3. Enter the S3 Bucket details.<br/>
             4. Select a folder that contains the EML files to import.<br/>
             5. Click the "Start Import" button to start the import process.<br/>

             </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default Home; 
