import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

const BottomNavigation = ({ navigation, activeRoute, scrollY }) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const getNavigationItems = () => {
    switch (user?.role) {
      case 'customer':
        return [
          { icon: 'home', label: 'Home', route: 'CustomerHomeMain' },
          { icon: 'clipboard-list', label: 'Projects', route: 'ProjectsList' },
          { icon: 'box', label: 'Orders', route: 'OrdersList' },
          { icon: 'file-alt', label: 'Reports', route: 'ReportsList' },
          { icon: 'user', label: 'Profile', route: 'Profile' },
        ];
      case 'site_incharge':
        return [
          { icon: 'home', label: 'Home', route: 'SiteHomeMain' },
                    { icon: 'clipboard-list', label: 'Projects', route: 'ProjectsList' },
          { icon: 'user', label: 'Profile', route: 'Profile' },
        ];
      case 'project_manager':
        return [
          { icon: 'home', label: 'Home', route: 'PMHomeMain' },
          { icon: 'clipboard-list', label: 'Projects', route: 'ProjectsList' },
          { icon: 'box', label: 'Orders', route: 'OrdersList' },
          { icon: 'file-alt', label: 'Reports', route: 'ReportsList' },
          { icon: 'user', label: 'Profile', route: 'Profile' },
        ];
      case 'admin':
        return [
          { icon: 'home', label: 'Home', route: 'AdminHomeMain' },
          { icon: 'clipboard-list', label: 'Projects', route: 'ProjectsList' },
          { icon: 'box', label: 'Orders', route: 'OrdersList' },
          { icon: 'users', label: 'Users', route: 'UsersList', params: { activeOnly: true } },
          { icon: 'user', label: 'Profile', route: 'Profile' },
        ];
      case 'finance':
        return [
          { icon: 'home', label: 'Home', route: 'FinanceHomeMain' },
          { icon: 'credit-card', label: 'Payments', route: 'VerifyPayments' },
          { icon: 'box', label: 'Orders', route: 'OrdersList' },
          { icon: 'clipboard-list', label: 'Projects', route: 'ProjectsList' },
          { icon: 'user', label: 'Profile', route: 'Profile' },
        ];
      case 'super_admin':
        return [
          { icon: 'home', label: 'Home', route: 'SuperAdminHomeMain' },
          { icon: 'box', label: 'Orders', route: 'OrdersList' },
          { icon: 'user-shield', label: 'Users', route: 'UsersList', params: { activeOnly: true } },
          { icon: 'user', label: 'Profile', route: 'Profile' },
        ];
      default:
        return [
          { icon: 'home', label: 'Home', route: 'CustomerHomeMain' },
          // { icon: 'plus-circle', label: 'Create', route: 'CreateProject' },
          { icon: 'clipboard-list', label: 'Projects', route: 'ProjectsList' },
          { icon: 'file-alt', label: 'Reports', route: 'ReportsList' },
          { icon: 'user', label: 'Profile', route: 'Profile' },
        ];
    }
  };

  const items = getNavigationItems();

  const capitalizeFirstLetter = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handlePress = (route, params) => {
    if (params) {
      navigation.navigate(route, params);
    } else {
      navigation.navigate(route);
    }
  };

  // On web, the permanent sidebar handles navigation — no bottom bar needed
  if (Platform.OS === 'web') return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {items.map((item, index) => {
        const uniqueKey = `${item.route}-${index}`;
        const isActive = activeRoute === item.route && items.filter(i => i.route === item.route).length === 1 
          ? true 
          : activeRoute === item.route && items.findIndex(i => i.route === item.route) === index;
        
        return (
          <TouchableOpacity
            key={uniqueKey}
            style={styles.navItem}
            onPress={() => handlePress(item.route, item.params)}
            activeOpacity={0.7}
          >
            <FontAwesome5
              name={item.icon}
              size={18}
              color={isActive ? colors.primary : colors.textSecondary}
              light
            />
            <Text style={[
              styles.navLabel,
              { color: isActive ? colors.primary : colors.textSecondary }
            ]}>
              {capitalizeFirstLetter(item.label)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    ...theme.shadows.lg,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xxs,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0,
    marginTop: 2,
  },
});

export default BottomNavigation;
