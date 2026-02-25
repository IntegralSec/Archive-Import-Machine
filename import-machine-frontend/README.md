# Import Machine

A modern React-based web application for managing data ingestion points and configuring data flows into archive systems. Built with Material-UI for a professional, responsive interface.

## 🚀 Features

### Core Functionality
- **Authentication System**: Secure user authentication with JWT tokens
- **Protected Routes**: Config, Ingestion Points, and Import Jobs require authentication
- **Ingestion Points Management**: View and manage data ingestion points with real-time API integration
- **Configuration Management**: Centralized configuration for archive access and API credentials
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between dark and light themes for optimal viewing experience

### Navigation & Layout
- **Mini Variant Drawer**: Collapsible navigation drawer that adapts to screen size
- **Persistent Navigation**: Always-accessible navigation on larger screens
- **Mobile-Friendly**: Temporary drawer navigation on smaller devices
- **Theme Toggle**: Easy access to theme switching from the navigation drawer

### Data Management
- **Real-time API Integration**: Fetches ingestion points from archive systems
- **Filtered Views**: Displays only importS3 type ingestion points
- **CRUD Operations**: View, edit, and delete functionality (ready for implementation)
- **Status Tracking**: Visual status indicators for ingestion points

## 🛠️ Technology Stack

- **Frontend Framework**: React 18.2.0
- **UI Library**: Material-UI (MUI) v5.14.20
- **Routing**: React Router DOM v6.20.1
- **State Management**: React Context API
- **Development**: Create React App
- **Styling**: Emotion (CSS-in-JS)

## 📋 Prerequisites

Before running this application, ensure you have:

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- **Archive System Access**: Valid archive web UI URL and API token
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd import-machine
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication

### User Registration & Login
1. **Sign Up**: Create a new account with username, email, and password
2. **Sign In**: Login with your credentials to access protected features
3. **Protected Routes**: Config, Ingestion Points, and Import Jobs require authentication
4. **Session Management**: JWT tokens are automatically managed and refreshed

### Default Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Administrator

## ⚙️ Configuration

### Initial Setup
1. **Sign In** to the application using your credentials
2. Navigate to the **Config** page (requires authentication)
3. Enter your **Archive Web UI** URL (e.g., `https://archive.example.com`)
4. Enter your **API Token** (the application automatically prepends "PWSAK2" if needed)
5. Configure additional S3 bucket settings if required

### API Configuration
- **Archive Web UI**: The base URL for your archive system
- **API Token**: Authentication token for API access (format: `PWSAK2 <token>`)
- **S3 Settings**: AWS credentials and bucket configuration for data import

## 📱 Usage

### Navigation
- **Desktop**: Use the persistent mini variant drawer on the left
- **Mobile**: Tap the hamburger menu to open/close the navigation drawer
- **Theme Toggle**: Click the sun/moon icon in the navigation drawer

### Ingestion Points
1. Navigate to **Ingestion Points** from the main menu
2. The application will automatically fetch and display importS3 type ingestion points
3. Use the **Refresh** button to reload data
4. View detailed information in the debug panel if needed

### Pages Available
- **Home**: Landing page with application overview
- **About**: Information about the application
- **Contact**: Contact information and support
- **Sign In/Sign Up**: Authentication pages for user login and registration
- **Config**: Configuration management for API and S3 settings (requires authentication)
- **Ingestion Points**: Main data management interface (requires authentication)


## 🔧 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── Navigation.js   # Main navigation component
│   └── ThemeToggle.js  # Theme switching component
├── contexts/           # React Context providers
│   ├── ConfigContext.js # Configuration state management
│   └── ThemeContext.js  # Theme state management
├── pages/              # Application pages
│   ├── Home.js         # Landing page
│   ├── About.js        # About page
│   ├── Config.js       # Configuration page
│   ├── IngestionPoints.js # Main data management page
│   └── ...             # Other pages
└── App.js              # Main application component
```

### Available Scripts

- **`npm start`**: Runs the development server
- **`npm test`**: Launches the test runner
- **`npm run build`**: Builds the app for production
- **`npm run eject`**: Ejects from Create React App (one-way operation)

### API Integration
The application integrates with archive systems via REST API:
- **Endpoint**: `/web.ui/api/ingestionPoints/_query`
- **Method**: GET
- **Authentication**: Bearer token (PWSAK2 format)
- **CORS**: Handled via development proxy configuration

## 🐛 Troubleshooting

### Common Issues

#### "Failed to fetch" Error
- **Cause**: CORS policy restrictions or network connectivity issues
- **Solution**: The application uses a development proxy to handle CORS. Restart the development server after configuration changes.

#### Configuration Issues
- **Ensure**: Archive Web UI URL is correct and accessible
- **Verify**: API token is valid and properly formatted
- **Check**: Network connectivity to the archive system

#### Debug Information
- Expand the **Debug Information** panel on the Ingestion Points page
- Check browser console for detailed error messages
- Verify API endpoint accessibility

### Development Tips
- Use the debug panel to monitor API requests and responses
- Check browser network tab for request/response details
- Restart the development server after configuration changes

## 🔒 Security

- API tokens are stored in application state (consider implementing secure storage for production)
- CORS is handled via development proxy
- No sensitive data is logged to console (tokens are truncated in debug output)

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Considerations
- Configure proper CORS settings on the archive server
- Implement secure token storage
- Set up environment variables for configuration
- Consider implementing authentication/authorization

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the debug information in the application
- Review the browser console for error messages
- Contact the development team

---

**Import Machine** - Streamlining data ingestion management for archive systems.
