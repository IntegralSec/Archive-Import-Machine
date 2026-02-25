import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

function ThemeToggle({ size = 'medium', sx = {} }) {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Tooltip title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        color="inherit"
        onClick={toggleTheme}
        size={size}
        sx={sx}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}

export default ThemeToggle; 