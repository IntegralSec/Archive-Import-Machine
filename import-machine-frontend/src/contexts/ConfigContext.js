import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BACKEND_API_BASE } from '../config';
import { useAuth } from './AuthContext';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

function applyConfigFromResponse(data) {
  const d = data || {};
  const s3 = d.s3Settings || {};
  return {
    archiveWebUI: d.archiveWebUI ?? '',
    apiToken: d.apiToken ?? '',
    customerGUID: d.customerGUID ?? '',
    s3Settings: {
      accessKeyId: s3.accessKeyId ?? '',
      secretAccessKey: s3.secretAccessKey ?? '',
    },
  };
}

export const ConfigProvider = ({ children }) => {
  const { token } = useAuth();
  const prevTokenRef = useRef(undefined);

  const [archiveWebUI, setArchiveWebUI] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [customerGUID, setCustomerGUID] = useState('');
  const [s3Settings, setS3Settings] = useState({
    accessKeyId: '',
    secretAccessKey: ''
  });
  const [loading, setLoading] = useState(true);

  const loadBackendConfig = useCallback(async () => {
    const authToken = token ?? localStorage.getItem('authToken');
    setLoading(true);
    try {
      if (!authToken) {
        console.log('No auth token found, skipping config load');
        return;
      }

      const response = await fetch(`${BACKEND_API_BASE}/api/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const applied = applyConfigFromResponse(data.data);
          console.log('Loading configuration from backend:', {
            archiveWebUI: applied.archiveWebUI ? 'set' : 'not set',
            apiTokenLength: applied.apiToken ? applied.apiToken.length : 0,
            apiTokenPrefix: applied.apiToken ? applied.apiToken.substring(0, 10) + '...' : 'none',
            s3Settings: {
              accessKeyId: applied.s3Settings.accessKeyId ? 'set (' + applied.s3Settings.accessKeyId.substring(0, 8) + '...)' : 'not set',
              secretAccessKey: applied.s3Settings.secretAccessKey ? 'set (' + applied.s3Settings.secretAccessKey.substring(0, 8) + '...)' : 'not set'
            }
          });

          setArchiveWebUI(applied.archiveWebUI);
          setApiToken(applied.apiToken);
          setCustomerGUID(applied.customerGUID);
          setS3Settings(applied.s3Settings);

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
  }, [token, BACKEND_API_BASE]);

  // Reload whenever the logged-in user changes; clear when logged out so another user never sees stale values
  useEffect(() => {
    if (!token) {
      prevTokenRef.current = null;
      setArchiveWebUI('');
      setApiToken('');
      setCustomerGUID('');
      setS3Settings({ accessKeyId: '', secretAccessKey: '' });
      setLoading(false);
      return;
    }

    const prev = prevTokenRef.current;
    prevTokenRef.current = token;
    const switchedUser = prev != null && prev !== token;

    if (switchedUser) {
      setArchiveWebUI('');
      setApiToken('');
      setCustomerGUID('');
      setS3Settings({ accessKeyId: '', secretAccessKey: '' });
    }

    loadBackendConfig();
  }, [token, loadBackendConfig]);

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
