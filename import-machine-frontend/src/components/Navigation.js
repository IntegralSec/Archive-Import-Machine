import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Avatar,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Info as InfoIcon,

  Settings as SettingsIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,

  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Input as InputIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Work as WorkIcon,
  Lock as LockIcon,
  Storage as StorageIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDrawer } from '../contexts/DrawerContext';

function Navigation() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { drawerExpanded, drawerOpen, drawerWidth, toggleDrawerExpanded, setDrawerState } = useDrawer();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const handleDrawerClose = () => {
    if (isMobile) {
      setDrawerState(drawerExpanded, false);
    }
  };

  const toggleDrawer = () => {
    if (isMobile) {
      setDrawerState(drawerExpanded, !drawerOpen);
    } else {
      toggleDrawerExpanded();
    }
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
  };

  // Navigation items based on authentication status
  const getNavItems = () => {
    const publicItems = [
      { path: '/', label: 'Home', icon: <HomeIcon /> },
      { path: '/about', label: 'About', icon: <InfoIcon /> },

    ];

    const protectedItems = [
      { path: '/config', label: 'Config', icon: <SettingsIcon /> },
      { path: '/ingestion-points', label: 'Ingestion Points', icon: <InputIcon /> },
      { path: '/import-jobs', label: 'Import Jobs', icon: <WorkIcon /> },
      { path: '/s3-bucket', label: 'S3 Bucket', icon: <StorageIcon /> },
      { path: '/upload', label: 'Upload', icon: <CloudUploadIcon /> },
    ];

    const authItems = isAuthenticated 
      ? [] 
      : [
          { path: '/signin', label: 'Sign In', icon: <LoginIcon /> },
          { path: '/signup', label: 'Sign Up', icon: <PersonAddIcon /> }
        ];

    // Only include protected items if user is authenticated
    return isAuthenticated 
      ? [...publicItems, ...protectedItems, ...authItems]
      : [...publicItems, ...authItems];
  };

  const navItems = getNavItems();

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
          left: isMobile ? 0 : drawerWidth,
          transition: (theme) => theme.transitions.create(['width', 'left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="toggle navigation"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
          >
            {isMobile ? (drawerOpen ? <CloseIcon /> : <MenuIcon />) : (drawerExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />)}
          </IconButton>
          
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/"
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none', 
              color: 'inherit',
              fontWeight: 'bold'
            }}
          >
            Import Machine
          </Typography>
          
          {/* User Menu */}
          {isAuthenticated && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="User menu">
                <IconButton
                  onClick={handleUserMenuOpen}
                  sx={{ ml: 1 }}
                  color="inherit"
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                    {user?.username?.charAt(0).toUpperCase() || <AccountCircleIcon />}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                             <MenuItem disabled>
               <Typography variant="body2" color="text.secondary">
                 Signed in as <strong>{user?.username}</strong>
               </Typography>
             </MenuItem>
             <Divider />
             <MenuItem component={RouterLink} to="/change-password" onClick={handleUserMenuClose}>
               <ListItemIcon>
                 <LockIcon fontSize="small" />
               </ListItemIcon>
               Change Password
             </MenuItem>
             <MenuItem onClick={handleLogout}>
               <ListItemIcon>
                 <LogoutIcon fontSize="small" />
               </ListItemIcon>
               Logout
             </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            position: 'fixed',
            height: '100%',
            top: 0,
            left: 0,
            transition: (theme) => theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
      >
        {/* Navigation Items */}
        <List sx={{ flexGrow: 1, mt: isMobile ? 0 : 8 }}>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <Tooltip 
                title={!drawerExpanded ? item.label : ""} 
                placement="right"
                disableHoverListener={drawerExpanded}
              >
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  onClick={handleDrawerClose}
                  selected={location.pathname === item.path}
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerExpanded ? 'initial' : 'center',
                    px: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'inherit',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: drawerExpanded ? 3 : 'auto',
                      justifyContent: 'center',
                      color: 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {drawerExpanded && <ListItemText primary={item.label} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
        </List>
        
        {/* Theme Toggle at Bottom */}
        <Divider />
        <List>
          <ListItem disablePadding>
            <Tooltip 
              title={!drawerExpanded ? (isDarkMode ? 'Switch to light mode' : 'Switch to dark mode') : ""} 
              placement="right"
              disableHoverListener={drawerExpanded}
            >
              <ListItemButton
                onClick={toggleTheme}
                sx={{
                  minHeight: 48,
                  justifyContent: drawerExpanded ? 'initial' : 'center',
                  px: 2.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: drawerExpanded ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </ListItemIcon>
                {drawerExpanded && (
                  <ListItemText primary={isDarkMode ? 'Light Mode' : 'Dark Mode'} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}

export default Navigation; 