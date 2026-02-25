import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved preference, default to light mode
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#000000',
        secondary: '#666666',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: '#f5f5f5 !important',
            color: '#000000 !important',
          },
          html: {
            backgroundColor: '#f5f5f5 !important',
          },
          '#root': {
            backgroundColor: '#f5f5f5 !important',
            minHeight: '100vh',
          },
        },
      },
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#90caf9',
      },
      secondary: {
        main: '#f48fb1',
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      text: {
        primary: '#ffffff',
        secondary: '#b3b3b3',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: '#121212 !important',
            color: '#ffffff !important',
          },
          html: {
            backgroundColor: '#121212 !important',
          },
          '#root': {
            backgroundColor: '#121212 !important',
            minHeight: '100vh',
          },
        },
      },
    },
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const value = {
    isDarkMode,
    toggleTheme,
    theme: isDarkMode ? darkTheme : lightTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 