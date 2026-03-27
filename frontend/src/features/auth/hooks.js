import { useState } from 'react';
import { authApi } from './api';
import { useAuth } from '../../hooks/useAuth';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const handleLogin = async (identifier, password, forceLogout = false) => {
    setLoading(true);
    setError(null);

    if (!identifier || !password) {
      setLoading(false);
      setError('Please enter email/phone and password');
      return { success: false, error: 'Please enter email/phone and password' };
    }

    try {
      const response = await authApi.login(identifier, password, forceLogout);
      
      if (response.success) {
        const { user, token } = response.data;
        await login(user, token);
        return { success: true, user };
      } else {
        setError('Login failed');
        return { success: false, error: 'Login failed' };
      }
    } catch (err) {
      const status = err.response?.status;
      const errorMessage = err.response?.data?.message || 'Network error. Please try again.';

      if (status === 409) {
        // Active session on another device
        return { success: false, sessionConflict: true, error: errorMessage };
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return { handleLogin, loading, error };
};
