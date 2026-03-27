import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';
import DeactivatedAccountScreen from '../features/auth/screens/DeactivatedAccountScreen';
import { useTheme } from '../context/ThemeContext';

const AppNavigator = () => {
  const { isAuthenticated, isDeactivated, loading } = useAuth();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show deactivated screen if user is authenticated but deactivated
  if (isAuthenticated && isDeactivated) {
    return <DeactivatedAccountScreen />;
  }

  return isAuthenticated ? <DrawerNavigator /> : <AuthNavigator />;
};

const getStyles = (colors) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
