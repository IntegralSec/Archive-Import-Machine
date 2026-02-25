import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';

const DrawerContext = createContext();

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};

export const DrawerProvider = ({ children }) => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));
  const [drawerExpanded, setDrawerExpanded] = useState(!isMobile);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  
  const drawerWidth = drawerExpanded ? 280 : 64;

  // Update drawer state when screen size changes
  useEffect(() => {
    setDrawerExpanded(!isMobile);
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const toggleDrawerExpanded = () => {
    setDrawerExpanded(!drawerExpanded);
  };

  const setDrawerState = (expanded, open) => {
    setDrawerExpanded(expanded);
    setDrawerOpen(open);
  };

  const value = {
    drawerExpanded,
    drawerOpen,
    drawerWidth,
    toggleDrawerExpanded,
    setDrawerState
  };

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
};
