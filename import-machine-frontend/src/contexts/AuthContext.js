import React, { createContext, useContext, useState, useEffect } from 'react';
import { BACKEND_API_BASE } from '../config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Verify token by calling /api/auth/me
          const response = await fetch(`${BACKEND_API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.data.user);
          } else {
            // Token is invalid, clear it
            logout();
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  // Login function
  const login = async (username, password) => {
    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { token: newToken, user: userData } = data.data;
        
        // Store token in localStorage
        localStorage.setItem('authToken', newToken);
        
        // Update state
        setToken(newToken);
        setUser(userData);
        
        return { success: true, user: userData };
      } else {
        return { 
          success: false, 
          error: data.error || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    }
  };

  // Signup function
  const signup = async (username, email, password, role = 'user') => {
    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, role })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { token: newToken, user: userData } = data.data;
        
        // Store token in localStorage
        localStorage.setItem('authToken', newToken);
        
        // Update state
        setToken(newToken);
        setUser(userData);
        
        return { success: true, user: userData };
      } else {
        return { 
          success: false, 
          error: data.error || 'Signup failed',
          errors: data.errors || []
        };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear token from localStorage
    localStorage.removeItem('authToken');
    
    // Clear state
    setToken(null);
    setUser(null);
  };

  // Refresh token function
  const refreshToken = async () => {
    if (!token) return false;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newToken = data.data.token;
        
        // Update token in localStorage
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshToken,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
