import React, { useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { theme } from '../../../theme/theme';

const DeactivatedAccountScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome5 name="user-slash" size={80} color={colors.textSecondary} />
        </View>
        
        <Text style={styles.title}>Account Deactivated</Text>
        
        <Text style={styles.message}>
          Your account has been deactivated by the administrators.
        </Text>
        
        <Text style={styles.contactMessage}>
          Please contact the MyConcrete team for activating your account back.
        </Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome5 name="sign-out-alt" size={16} color={colors.textWhite} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    fontWeight: '700',
  },
  message: {
    ...theme.typography.body1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 24,
  },
  contactMessage: {
    ...theme.typography.body1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  logoutButtonText: {
    ...theme.typography.button,
    color: colors.textWhite,
  },
});

export default DeactivatedAccountScreen;