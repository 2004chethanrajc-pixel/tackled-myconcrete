import { Linking, Alert } from 'react-native';

export const makeCall = (phone) => {
  if (!phone) return;
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return;
  Linking.openURL(`tel:${cleaned}`).catch(() =>
    Alert.alert('Error', 'Unable to make call')
  );
};

export const sendEmail = (email) => {
  if (!email) return;
  Linking.openURL(`mailto:${email}`).catch(() =>
    Alert.alert('Error', 'Unable to open email app')
  );
};
