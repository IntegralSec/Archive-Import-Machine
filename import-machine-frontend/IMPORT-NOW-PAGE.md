# Import Now Page

## Overview
The Import Now page is a comprehensive import workflow that allows users to import files from S3 buckets into the Archive Web UI system. It provides a step-by-step wizard interface for configuring and executing import jobs.

## Navigation
The page is accessed by clicking the "Import Now" button from the S3 Bucket Management page. The button passes bucket and folder information through React Router's navigation state.

## Features

### 1. Step-by-Step Wizard
The page uses a Material-UI Stepper component with three main steps:
- **Step 1**: Select Import Options - Configure import job settings
- **Step 2**: Review & Confirm - Review all settings before proceeding
- **Step 3**: Import Progress - Monitor the import process

### 2. Import Configuration
Users can configure the following import job settings:
- **Import Job Name**: Auto-generated based on bucket and folder info
- **Description**: Optional description of the import job
- **Customer**: Customer name or identifier
- **Ingestion Point**: Required selection from available ingestion points
- **Priority**: Low, Normal, High, or Urgent
- **Processing Options**: Apply Supervision and Legal Hold checkboxes

### 3. Auto-Generation
The page automatically generates:
- Import job name using format: `Import-{bucketName}-{folderName}-{timestamp}`
- Description with bucket and folder information

### 4. Validation
The page includes comprehensive validation:
- Required fields validation (name, ingestion point)
- Configuration check (Archive Web UI and API Token)
- Bucket information validation

### 5. Error Handling
- Displays clear error messages for validation failures
- Shows configuration warnings when credentials are missing
- Handles API errors gracefully

### 6. Progress Tracking
The import progress step shows:
- Ready state with instructions
- Starting state with loading indicator
- Success state with confirmation
- Error state with failure details

## Integration

### Backend API
The page integrates with the following backend endpoints:
- `GET /api/ingestion-points` - Fetch available ingestion points
- `POST /api/import-jobs` - Create new import job

### Navigation State
The page receives bucket information through React Router state:
```javascript
{
  bucketInfo: {
    bucketName: "my-bucket",
    folderPath: "documents/2024",
    bucketRegion: "us-east-1"
  }
}
```

## User Flow

1. **Access**: User clicks "Import Now" from S3 Bucket Management page
2. **Configuration**: User fills out import job configuration form
3. **Validation**: System validates all required fields
4. **Review**: User reviews all settings before proceeding
5. **Execution**: System creates import job and shows progress
6. **Completion**: User is redirected to Import Jobs page

## Error States

### Missing Configuration
If Archive Web UI or API Token is not configured:
- Shows warning alert
- Provides button to navigate to Configuration page

### Missing Bucket Information
If no bucket info is provided:
- Shows error alert
- Provides button to return to S3 Bucket Management page

### Validation Errors
- Form validation errors are displayed inline
- API errors are shown in alert components

## Responsive Design
The page is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast support

## Future Enhancements
Potential improvements for future versions:
- Real-time progress updates
- Import job templates
- Batch import capabilities
- Advanced filtering options
- Import scheduling
- Email notifications
