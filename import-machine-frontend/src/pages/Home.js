import React from 'react';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Link,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const FLOW_STEPS = [
  { text: 'Config', path: '/config' },
  { text: 'Create ingestion point', path: '/ingestion-points' },
  { text: 'Create import job', path: '/import-jobs' },
  { text: 'Package EML files into batches', path: null },
  { text: 'Upload batches to an S3 bucket', path: '/upload' },
  { text: 'Start importing the batches', path: '/s3-bucket' },
];

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
          </CardContent>
        </Card>

        {/* Flow Chart Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              How It Works
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 2,
              }}
            >
              {FLOW_STEPS.map((step, index) => (
                <React.Fragment key={step.text}>
                  {step.path ? (
                    <Link
                      component={RouterLink}
                      to={step.path}
                      underline="none"
                      sx={{
                        display: 'block',
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        border: 2,
                        borderColor: 'primary.main',
                        bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.12)' : 'rgba(25, 118, 210, 0.08)',
                        width: 320,
                        minWidth: 320,
                        textAlign: 'left',
                        color: 'inherit',
                        '&:hover': {
                          bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.15)',
                        },
                      }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {index + 1}. {step.text}
                      </Typography>
                    </Link>
                  ) : (
                    <Box
                      sx={{
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        border: 2,
                        borderColor: 'primary.main',
                        bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.12)' : 'rgba(25, 118, 210, 0.08)',
                        width: 320,
                        minWidth: 320,
                        textAlign: 'left',
                      }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {index + 1}. {step.text}
                      </Typography>
                    </Box>
                  )}
                  {index < FLOW_STEPS.length - 1 && (
                    <Box sx={{ py: 0.5 }}>
                      <ArrowDownwardIcon
                        sx={{ color: 'primary.main', fontSize: 28 }}
                        aria-hidden
                      />
                    </Box>
                  )}
                </React.Fragment>
              ))}
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
