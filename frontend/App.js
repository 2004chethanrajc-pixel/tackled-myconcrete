import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
// import { useUserStatusCheck } from './src/hooks/useUserStatusCheck';
import AppNavigator from './src/navigation/AppNavigator';
import { initDB } from './src/services/offlineQueue';
import { startSyncListener, processQueue } from './src/services/syncService';

const AppContent = () => {
  // useUserStatusCheck(); // Temporarily disabled for debugging
  return <AppNavigator />;
};

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigationRef = useRef();

  useEffect(() => {
    // Initialize offline queue DB and start sync listener
    initDB().catch(e => console.warn('DB init error:', e));
    const unsubscribe = startSyncListener();
    processQueue(); // Try to sync any pending items on app start

    // Enable scrolling on web - only vertical
    if (Platform.OS === 'web') {
      // Add global styles for web scrolling
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          max-width: 100vw;
        }
        body {
          overflow-y: scroll;
          overflow-x: hidden;
          max-width: 100vw;
        }
        * {
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }
        /* Fix for React Native Web ScrollView - only vertical */
        [data-focusable="true"] {
          overflow-x: hidden !important;
          overflow-y: auto !important;
        }
        /* Prevent horizontal overflow */
        div, section, article, main {
          overflow-x: hidden;
          max-width: 100%;
        }
      `;
      document.head.appendChild(style);
    }

    // Handle notifications (only on mobile)
    if (Platform.OS !== 'web') {
      // Handle notifications received while app is foregrounded
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('📱 ===== NOTIFICATION RECEIVED =====');
        console.log('📱 Title:', notification.request.content.title);
        console.log('📱 Body:', notification.request.content.body);
        console.log('📱 Data:', notification.request.content.data);
        console.log('📱 ==================================');
      });

      // Handle notification taps
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('📱 ===== NOTIFICATION TAPPED =====');
        console.log('📱 Title:', response.notification.request.content.title);
        console.log('📱 Body:', response.notification.request.content.body);
        console.log('📱 Data:', response.notification.request.content.data);
        console.log('📱 ================================');
        
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        if (navigationRef.current) {
          if (data.action === 'view_projects') {
            navigationRef.current.navigate('ProjectsList');
          } else if (data.action === 'view_project' && data.projectId) {
            navigationRef.current.navigate('ProjectDetail', { projectId: data.projectId });
          } else if (data.action === 'verify_payments') {
            navigationRef.current.navigate('VerifyPayments');
          } else if (data.action === 'view_reports') {
            navigationRef.current.navigate('ReportsList');
          } else if (data.action === 'logout' && data.type === 'ACCOUNT_DEACTIVATED') {
            // Handle account deactivation notification - user will see deactivated screen
            console.log('Account deactivated notification received');
          } else if (data.action === 'login' && data.type === 'ACCOUNT_ACTIVATED') {
            // Handle account activation notification
            console.log('Account activated notification received');
          }
        }
      });

      return () => {
        unsubscribe();
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }

    return () => { unsubscribe(); };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <AppContent />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
