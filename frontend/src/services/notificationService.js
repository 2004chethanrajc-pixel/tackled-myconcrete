import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from './apiClient';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return null;
  }
  
  // Push notifications work on physical devices and emulators
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }
  
  try {
    // Get push token - Need to provide projectId explicitly
    const projectId = process.env.EXPO_PROJECT_ID || '5e070519-46e5-43db-96b3-cdf3b616564b';
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId
    })).data;
      
      console.log('✅ Push token obtained:', token);
      
      // Register token with backend
      await apiClient.post('/push-tokens/register', {
        pushToken: token,
        deviceType: Platform.OS,
      });
      
      console.log('✅ Push token registered with backend');
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    console.error('Error details:', error.message);
    return null;
  }
  
  // Android specific channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }
  
  return token;
}

export async function unregisterPushToken(token) {
  try {
    await apiClient.post('/push-tokens/unregister', {
      pushToken: token,
    });
    console.log('Push token unregistered');
  } catch (error) {
    console.error('Error unregistering push token:', error);
  }
}

export async function getNotifications(limit = 50, offset = 0) {
  try {
    const response = await apiClient.get(`/push-tokens/notifications?limit=${limit}&offset=${offset}`);
    return response.data.data.notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationRead(notificationId) {
  try {
    await apiClient.patch(`/push-tokens/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsRead() {
  try {
    await apiClient.patch('/push-tokens/notifications/read-all');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}
