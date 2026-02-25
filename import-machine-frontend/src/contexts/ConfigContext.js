import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { BACKEND_API_BASE } from '../config';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [archiveWebUI, setArchiveWebUI] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [customerGUID, setCustomerGUID] = useState('');
  const [s3Settings, setS3Settings] = useState({
    accessKeyId: '',
    secretAccessKey: ''
  });
  const [loading, setLoading] = useState(true);

  // Load configuration from backend on mount
  useEffect(() => {
    loadBackendConfig();
  }, []);

  const loadBackendConfig = useCallback(async () => {
    setLoading(true);
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.log('No auth token found, skipping config load');
        setLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_API_BASE}/api/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log('Loading configuration from backend:', {
            archiveWebUI: data.data.archiveWebUI ? 'set' : 'not set',
            apiTokenLength: data.data.apiToken ? data.data.apiToken.length : 0,
            apiTokenPrefix: data.data.apiToken ? data.data.apiToken.substring(0, 10) + '...' : 'none',
            s3Settings: data.data.s3Settings ? {
              accessKeyId: data.data.s3Settings.accessKeyId ? 'set (' + data.data.s3Settings.accessKeyId.substring(0, 8) + '...)' : 'not set',
              secretAccessKey: data.data.s3Settings.secretAccessKey ? 'set (' + data.data.s3Settings.secretAccessKey.substring(0, 8) + '...)' : 'not set'
            } : 'not present'
          });

          // Update local state with backend config
          if (data.data.archiveWebUI) {
            setArchiveWebUI(data.data.archiveWebUI);
          }
          if (data.data.apiToken) {
            setApiToken(data.data.apiToken);
          }
          if (data.data.customerGUID) {
            setCustomerGUID(data.data.customerGUID);
          }
          if (data.data.s3Settings) {
            // Always update S3 settings with backend values, even if they are empty strings
            setS3Settings({
              accessKeyId: data.data.s3Settings.accessKeyId || '',
              secretAccessKey: data.data.s3Settings.secretAccessKey || ''
            });
          } else {
            // If no S3 settings in response, reset to empty
            setS3Settings({
              accessKeyId: '',
              secretAccessKey: ''
            });
          }
          
          console.log('Configuration loaded successfully from backend');
        }
      } else {
        console.log('Failed to load config from backend:', response.status);
      }
    } catch (error) {
      console.error('Failed to load backend configuration:', error);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_API_BASE]);

  const updateArchiveWebUI = useCallback((value) => {
    console.log('ConfigContext: updateArchiveWebUI called with:', value);
    setArchiveWebUI(value);
  }, []);

  const updateApiToken = useCallback((value) => {
    setApiToken(value);
  }, []);

  const updateCustomerGUID = useCallback((value) => {
    setCustomerGUID(value);
  }, []);

  const updateS3Settings = useCallback((field, value) => {
    setS3Settings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const value = useMemo(() => ({
    archiveWebUI,
    apiToken,
    customerGUID,
    s3Settings,
    loading,
    updateArchiveWebUI,
    updateApiToken,
    updateCustomerGUID,
    updateS3Settings,
    loadBackendConfig, // Expose this function to allow manual refresh
  }), [archiveWebUI, apiToken, customerGUID, s3Settings, loading, updateArchiveWebUI, updateApiToken, updateCustomerGUID, updateS3Settings, loadBackendConfig]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
