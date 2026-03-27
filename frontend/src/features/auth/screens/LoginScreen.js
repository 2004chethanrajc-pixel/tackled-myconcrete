import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useLogin } from '../hooks';
import { typography } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => getStyles(themeColors), [themeColors]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [sessionConflictVisible, setSessionConflictVisible] = useState(false);
  const { handleLogin, loading, error } = useLogin();

  // Floating animation values
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (animValue, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, { toValue: -20, duration, useNativeDriver: true }),
          Animated.timing(animValue, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(float1, 4000);
    animate(float2, 5000);
    animate(float3, 6000);
  }, []);

  const onLoginPress = async () => {
    const result = await handleLogin(identifier, password);
    if (result.sessionConflict) {
      setSessionConflictVisible(true);
    } else if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  const onForceLogin = async () => {
    setSessionConflictVisible(false);
    const result = await handleLogin(identifier, password, true);
    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background Floating Circles */}
      <Animated.View style={[styles.circleLarge, { top: -100, left: -80, transform: [{ translateY: float1 }] }]} />
      <Animated.View style={[styles.circleLarge, { bottom: -120, right: -100, transform: [{ translateY: float2 }] }]} />
      <Animated.View style={[styles.circleSmallRed, { bottom: 10, left: 0, transform: [{ translateY: float1 }] }]} />
      <Animated.View style={[styles.circleSmallRed, { top: height * 0.2, right: -30, transform: [{ translateY: float3 }] }]} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={[styles.form, { backgroundColor: themeColors.surface }]}>
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.textPrimary }]}
            placeholder="Email or Phone Number"
            placeholderTextColor={themeColors.textSecondary}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.textPrimary }]}
            placeholder="Password"
            placeholderTextColor={themeColors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onLoginPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={themeColors.surface} />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Session Conflict Modal */}
      <Modal visible={sessionConflictVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>Active Session Detected</Text>
            <Text style={styles.modalMessage}>
              Your account is already logged in on another device. You must logout from all devices before logging in here.
            </Text>
            <TouchableOpacity
              style={styles.forceLoginButton}
              onPress={onForceLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={themeColors.textWhite} />
              ) : (
                <Text style={styles.forceLoginText}>Logout All Devices & Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSessionConflictVisible(false)}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },

  /* Floating Circles */
  circleLarge: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(19, 60, 143, 0.75)', // dark blue transparent
  },

  circleSmallRed: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(173, 1, 1, 0.76)', // red transparent
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },

  logo: {
    width: 150,
    height: 150,
  },

  form: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 24,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  buttonDisabled: {
    backgroundColor: colors.disabled,
  },

  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },

  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 8,
  },

  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },

  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Session conflict modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalIconContainer: {
    marginBottom: 12,
  },
  modalIcon: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  forceLoginButton: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  forceLoginText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LoginScreen;
