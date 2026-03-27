import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from './storage';
import { getApiUrl } from '../config/api.config';

// Get base URL from centralized config
const BASE_URL = getApiUrl();

console.log('API Base URL:', BASE_URL, 'Platform:', Platform.OS);

// Simple event emitter for auth events — avoids circular imports
const authEventListeners = new Set();
export const onAuthEvent = (cb) => {
  authEventListeners.add(cb);
  // Return cleanup function
  return () => authEventListeners.delete(cb);
};
export const emitForceLogout = () => authEventListeners.forEach(cb => cb('force_logout'));

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - attach token and ensure proper headers
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (config.headers['X-FormData-Request'] === 'true') {
      delete config.headers['X-FormData-Request'];
      delete config.headers['Content-Type'];
      console.log('FormData request detected - Content-Type will be set automatically');
    } else if (['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
      if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
      }
    }
    
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data instanceof FormData ? 'FormData' : config.data,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 and log responses
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const status = error.response?.status;

    // Don't log 409 (session conflict) as an error — it's an expected handled response
    if (status === 409) {
      return Promise.reject(error);
    }

    console.error('API Error:', {
      status,
      data: error.response?.data,
      message: error.message
    });
    
    if (status === 401) {
      // Only force-logout on session-related 401s, not login failures
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                             error.config?.url?.includes('/auth/logout');
      if (!isAuthEndpoint) {
        await storage.clearAuth();
        emitForceLogout();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
