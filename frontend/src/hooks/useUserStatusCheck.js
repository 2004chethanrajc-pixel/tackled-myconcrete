import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { authApi } from '../features/auth/api';

export const useUserStatusCheck = () => {
  const { user, updateUser, logout } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkUserStatus = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          const updatedUser = response.data;
          
          // If user status changed, update the context
          if (updatedUser.is_active !== user.is_active) {
            updateUser(updatedUser);
            
            // If user was deactivated, they'll see the deactivated screen
            // No need to logout here as the AppNavigator will handle it
          }
        }
      } catch (error) {
        // If we get a 401, the user might have been deactivated
        if (error.response?.status === 401) {
          // Force logout to clear invalid session
          await logout();
        }
      }
    };

    // Check status every 30 seconds when app is active
    const interval = setInterval(checkUserStatus, 30000);

    // Also check immediately
    checkUserStatus();

    return () => clearInterval(interval);
  }, [user, updateUser, logout]);
};