import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { typography } from '../../../theme/typography';
import apiClient from '../../../services/apiClient';
import { useTheme } from '../../../context/ThemeContext';

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => getStyles(themeColors), [themeColors]);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password
  const [loading, setLoading] = useState(false);
  const [isEmail, setIsEmail] = useState(true);

  const handleRequestOTP = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter your email or phone number');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/auth/forgot-password', { identifier });
      
      if (response.data.success) {
        setIsEmail(response.data.data.isEmail);
        setStep(2);
        
        const medium = response.data.data.isEmail ? 'email' : 'phone';
        Alert.alert(
          'OTP Sent',
          `A 6-digit OTP has been sent to your ${medium}. Please check and enter the OTP below.\n\nThe OTP will expire in 15 minutes.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'OTP must be 6 digits');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/auth/verify-otp', { identifier, otp });
      
      if (response.data.success) {
        setStep(3);
        Alert.alert('Success', 'OTP verified successfully. Please set your new password.');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Invalid OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/auth/reset-password', {
        identifier,
        otp,
        newPassword
      });
      
      if (response.data.success) {
        Alert.alert(
          'Success',
          'Password reset successful! You can now login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Forgot Password</Text>
      <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
        Enter your email or phone number and we'll send you an OTP to reset your password
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: themeColors.textPrimary }]}>Email or Phone Number</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.textPrimary }]}
          placeholder="Enter your email or phone"
          placeholderTextColor={themeColors.textSecondary}
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="default"
          autoCapitalize="none"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRequestOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={themeColors.surface} />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Enter OTP</Text>
      <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
        We've sent a 6-digit OTP to your {isEmail ? 'email' : 'phone'}: {identifier}
      </Text>
      <Text style={[styles.subtitleSmall, { color: themeColors.textSecondary }]}>
        Please check your {isEmail ? 'email inbox' : 'phone messages'} (and spam folder)
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: themeColors.textPrimary }]}>OTP Code</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.textPrimary }]}
          placeholder="Enter 6-digit OTP"
          placeholderTextColor={themeColors.textSecondary}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={themeColors.surface} />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep(1)}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Change {isEmail ? 'Email' : 'Phone'}</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Set New Password</Text>
      <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
        Please enter your new password
      </Text>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: themeColors.textPrimary }]}>New Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.textPrimary }]}
          placeholder="Enter new password"
          placeholderTextColor={themeColors.textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: themeColors.textPrimary }]}>Confirm Password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.textPrimary }]}
          placeholder="Confirm new password"
          placeholderTextColor={themeColors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={themeColors.surface} />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  subtitleSmall: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    ...typography.body,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    ...typography.body,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.primary,
    ...typography.body,
  },
});

export default ForgotPasswordScreen;
