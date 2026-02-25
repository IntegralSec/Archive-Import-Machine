import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BACKEND_API_BASE } from '../config';

const EncryptionContext = createContext();

export const useEncryption = () => {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
};

export const EncryptionProvider = ({ children }) => {
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if configuration is encrypted on mount
  useEffect(() => {
    checkEncryptionStatus();
  }, []);

  const checkEncryptionStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      console.log('Checking encryption status...');
      const response = await fetch(`${BACKEND_API_BASE}/api/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Encryption status response:', {
          success: data.success,
          isEncrypted: data.data?.isEncrypted,
          hasData: !!data.data
        });
        if (data.success && data.data) {
          setIsEncrypted(data.data.isEncrypted || false);
        }
      } else {
        console.error('Failed to check encryption status:', response.status);
      }
    } catch (error) {
      console.error('Error checking encryption status:', error);
    }
  }, [BACKEND_API_BASE]);

  const autoSetupEncryption = useCallback(async (userPassword) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${BACKEND_API_BASE}/api/config/auto-setup-encryption`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: userPassword })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.data.encryptionKey) {
          setEncryptionKey(data.data.encryptionKey);
          setIsEncrypted(true);
        }
        return { success: true, alreadyEncrypted: data.data.alreadyEncrypted };
      } else {
        throw new Error(data.error || 'Failed to setup encryption');
      }
    } catch (error) {
      console.error('Error auto-setting up encryption:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [BACKEND_API_BASE]);

  const decryptConfiguration = useCallback(async (userPassword) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${BACKEND_API_BASE}/api/config/decrypt-with-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: userPassword })
      });

      const data = await response.json();
      
      if (data.success) {
        setEncryptionKey(data.data.encryptionKey);
        setIsEncrypted(true);
        return { 
          success: true, 
          config: data.data.config,
          encryptionKey: data.data.encryptionKey
        };
      } else {
        throw new Error(data.error || 'Failed to decrypt configuration');
      }
    } catch (error) {
      console.error('Error decrypting configuration:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [BACKEND_API_BASE]);

  // New function to decrypt with encryption key (for when key is already cached)
  const decryptWithKey = useCallback(async (key) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get the current configuration from the backend
      const response = await fetch(`${BACKEND_API_BASE}/api/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.isEncrypted) {
        // Decrypt the configuration using the provided key
        const decryptionResponse = await fetch(`${BACKEND_API_BASE}/api/config/decrypt-with-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: 'dummy', encryptionKey: key }) // Backend will use encryptionKey if provided
        });

        const decryptionData = await decryptionResponse.json();
        
        if (decryptionData.success) {
          return { 
            success: true, 
            config: decryptionData.data.config,
            encryptionKey: key
          };
        } else {
          throw new Error(decryptionData.error || 'Failed to decrypt configuration');
        }
      } else {
        // Configuration is not encrypted, return as-is
        return { 
          success: true, 
          config: data.data,
          encryptionKey: null
        };
      }
    } catch (error) {
      console.error('Error decrypting with key:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [BACKEND_API_BASE]);

  const clearEncryptionKey = useCallback(() => {
    setEncryptionKey(null);
    setIsEncrypted(false);
  }, []);

  const value = {
    encryptionKey,
    isEncrypted,
    isLoading,
    autoSetupEncryption,
    decryptConfiguration,
    decryptWithKey,
    clearEncryptionKey,
    checkEncryptionStatus
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
};
