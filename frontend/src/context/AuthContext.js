import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { storage } from '../services/storage';
import { registerForPushNotificationsAsync, unregisterPushToken } from '../services/notificationService';
import apiClient, { onAuthEvent } from '../services/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushToken, setPushToken] = useState(null);

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  // Listen for force-logout events from the API client (e.g. session kicked by another device)
  useEffect(() => {
    const cleanup = onAuthEvent((event) => {
      if (event === 'force_logout') {
        setToken(null);
        setUser(null);
        setPushToken(null);
      }
    });
    return cleanup;
  }, []);

  const loadAuthState = async () => {
    try {
      const savedToken = await storage.getToken();
      const savedUser = await storage.getUser();
      
      if (savedToken && savedUser) {
        // Validate token is still active on the backend before restoring session.
        // Temporarily set token in state so apiClient interceptor can attach it.
        setToken(savedToken);
        try {
          await apiClient.get('/auth/me');
          // Token is valid — fully restore session
          setUser(savedUser);
          if (Platform.OS !== 'web') {
            const pushTok = await registerForPushNotificationsAsync();
            setPushToken(pushTok);
          }
        } catch (err) {
          // 401 — session was invalidated (kicked by another device or expired)
          // apiClient interceptor already called storage.clearAuth() + emitForceLogout
          // Clear the token we temporarily set above
          setToken(null);
        }
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, authToken) => {
    try {
      await storage.saveToken(authToken);
      await storage.saveUser(userData);
      setToken(authToken);
      setUser(userData);
      
      // Register for push notifications after successful login (only on mobile)
      if (Platform.OS !== 'web') {
        const token = await registerForPushNotificationsAsync();
        setPushToken(token);
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (Platform.OS !== 'web' && pushToken) {
        await unregisterPushToken(pushToken);
      }

      // Get token BEFORE clearing storage so we can send it to backend
      const currentToken = await storage.getToken();

      // Clear local state and storage immediately
      await storage.clearAuth();
      setToken(null);
      setUser(null);
      setPushToken(null);

      // Invalidate session on backend using the saved token directly (fire and forget)
      if (currentToken) {
        fetch(`${apiClient.defaults.baseURL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
        }).catch(e => console.warn('Backend logout failed:', e.message));
      }
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    storage.saveUser(updatedUserData);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isDeactivated: !!user && user.is_active !== 1,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
