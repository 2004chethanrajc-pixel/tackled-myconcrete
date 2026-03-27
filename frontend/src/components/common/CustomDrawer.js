import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { typography } from '../../theme/typography';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

const CustomDrawer = (props) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const getHomeScreenName = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'SuperAdminHomeMain';
      case 'admin':
        return 'AdminHomeMain';
      case 'project_manager':
        return 'PMHomeMain';
      case 'finance':
        return 'FinanceHomeMain';
      case 'site_incharge':
        return 'SiteHomeMain';
      case 'customer':
        return 'CustomerHomeMain';
      default:
        return 'CustomerHomeMain';
    }
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'super_admin':
        return ['#1E3A5F', '#2B4C7C'];
      case 'admin':
        return ['#1E4A6F', '#2E5F8E'];
      case 'project_manager':
        return ['#245B7A', '#2F6F9A'];
      case 'finance':
        return ['#1F4E7A', '#2D6496'];
      case 'site_incharge':
        return ['#24547A', '#316B9A'];
      case 'customer':
        return ['#23557A', '#2E6D9E'];
      default:
        return ['#1A3A5A', '#234F77'];
    }
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'crown';
      case 'admin':
        return 'shield-alt';
      case 'project_manager':
        return 'clipboard-list';
      case 'finance':
        return 'chart-line';
      case 'site_incharge':
        return 'hard-hat';
      case 'customer':
        return 'user-tie';
      default:
        return 'user';
    }
  };

  const handleNavigation = (screen) => {
    props.navigation.navigate(screen);
    props.navigation.closeDrawer();
  };

  const handleLogout = () => {
    props.navigation.closeDrawer();
    logout();
  };

  const MenuItem = ({ icon, label, onPress, isDanger = false, iconFamily = 'FontAwesome5' }) => {
    const IconComponent = iconFamily === 'MaterialIcons' ? MaterialIcons :
      iconFamily === 'Ionicons' ? Ionicons : FontAwesome5;

    return (
      <TouchableOpacity
        style={[
          styles.menuItem,
          isDanger && styles.dangerMenuItem,
          !isDanger && { backgroundColor: colors.surface, borderBottomColor: colors.divider },
        ]}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <View style={[styles.menuIconContainer, isDanger ? styles.dangerIconContainer : styles.navyIconContainer]}>
          <IconComponent name={icon} size={20} color={isDanger ? '#FF3B30' : '#1E4A7A'} />
        </View>
        <Text
          style={[
            styles.menuLabel,
            isDanger && styles.dangerMenuLabel,
            !isDanger && { color: colors.textPrimary },
          ]}
        >
          {label}
        </Text>
        {!isDanger && (
          <MaterialIcons name="arrow-forward-ios" size={12} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  const MenuSection = ({ title, children }) => (
    <View style={styles.menuSection}>
      <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View
        style={[
          styles.menuSectionContent,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.divider },
        ]}
      >
        {children}
      </View>
    </View>
  );

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Lighter Navy Blue Gradient */}
      <LinearGradient
        colors={getRoleBadgeColor()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <FontAwesome5 name={getRoleIcon()} size={32} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
            </View>
          </View>

          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <FontAwesome5 name={getRoleIcon()} size={10} color="#FFFFFF" />
            <Text style={styles.roleText}>
              {user?.role?.replace('_', ' ').toUpperCase() || 'USER'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Menu Items with Scroll */}
      <ScrollView
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        <MenuSection title="MAIN">
          <MenuItem
            icon="home"
            label="Dashboard"
            onPress={() => handleNavigation(getHomeScreenName())}
          />
          <MenuItem
            icon="user-circle"
            label="Profile"
            onPress={() => handleNavigation('Profile')}
          />
        </MenuSection>

        {/* Site Incharge specific menu items */}
        {user?.role === 'site_incharge' && (
          <MenuSection title="SITE MANAGEMENT">
            <MenuItem
              icon="calendar-check"
              label="View Site Visits"
              onPress={() => {
                props.navigation.navigate('ProjectsList', { filter: 'pending_visits' });
                props.navigation.closeDrawer();
              }}
            />
            <MenuItem
              icon="file-alt"
              label="View All Reports"
              onPress={() => handleNavigation('ReportsList')}
            />
          </MenuSection>
        )}

        {/* Super Admin specific menu items */}
        {user?.role === 'super_admin' && (
          <MenuSection title="ADMIN">
            <MenuItem
              icon="history"
              label="Audit Logs"
              onPress={() => handleNavigation('AuditLogs')}
            />
          </MenuSection>
        )}

        {/* Finance specific menu items */}
        {user?.role === 'finance' && (
          <MenuSection title="FINANCE">
            <MenuItem
              icon="check-circle"
              label="Verify Payments"
              onPress={() => handleNavigation('VerifyPayments')}
            />
            <MenuItem
              icon="box"
              label="Orders"
              onPress={() => handleNavigation('OrdersList')}
            />
          </MenuSection>
        )}

        {/* Orders for admin/super_admin/customer */}
        {['admin', 'super_admin', 'customer'].includes(user?.role) && (
          <MenuSection title="ORDERS">
            <MenuItem
              icon="box"
              label="Orders"
              onPress={() => handleNavigation('OrdersList')}
            />
          </MenuSection>
        )}

        <MenuSection title="DOCUMENTS">
          {/* Hide View Reports for Site Incharge */}
          {user?.role !== 'site_incharge' && (
            <MenuItem
              icon="file-alt"
              label="View Reports"
              onPress={() => handleNavigation('ReportsList')}
            />
          )}

          {user?.role !== 'site_incharge' && (
            <MenuItem
              icon="rupee-sign"
              label="View Quotations"
              onPress={() => handleNavigation('QuotationsList')}
            />
          )}
        </MenuSection>

        {/* Dark Mode Toggle — All Users */}
        <View style={styles.darkModeSection}>
          <TouchableOpacity
            style={styles.darkModeToggle}
            onPress={toggleDarkMode}
            activeOpacity={0.7}
          >
            <View style={styles.darkModeLeft}>
              <View style={styles.darkModeIconContainer}>
                <Ionicons
                  name={isDarkMode ? 'moon' : 'sunny'}
                  size={20}
                  color={isDarkMode ? '#A78BFA' : '#F59E0B'}
                />
              </View>
              <View>
                <Text style={[styles.darkModeLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
                <Text style={[styles.darkModeSubLabel, { color: colors.textSecondary }]}>
                  {isDarkMode ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <View style={[styles.toggleTrack, isDarkMode && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, isDarkMode && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <MenuItem
            icon="sign-out-alt"
            label="Logout"
            onPress={handleLogout}
            isDanger={true}
          />
        </View>
      </ScrollView>

      {/* Footer */}
        <View style={styles.footer}>
        <LinearGradient
          colors={isDarkMode ? ['#1F2937', '#111827'] : ['#F0F4F8', '#E4E9F2']}
          style={styles.footerGradient}
        >
          <Text style={styles.version}>Powered by Tackle-D</Text>
          <View style={styles.versionBadge}>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: DRAWER_WIDTH,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  headerContent: {
    marginBottom: 0,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  roleText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: 16,
  },
  menuSection: {
    marginBottom: 16,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 20,
    letterSpacing: 0.5,
  },
  menuSectionContent: {
    backgroundColor: colors.surfaceSecondary,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  dangerMenuItem: {
    backgroundColor: isDarkMode ? 'rgba(210, 50, 41, 0.15)' : '#FEF2F2',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  navyIconContainer: {
    backgroundColor: colors.primaryLight,
  },
  dangerIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dangerMenuLabel: {
    color: '#FF3B30',
  },
  logoutSection: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  darkModeSection: {
    marginTop: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  darkModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  darkModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  darkModeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkModeLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  darkModeSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDarkMode ? '#374151' : '#CBD5E1',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleTrackActive: {
    backgroundColor: '#6366F1',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    overflow: 'hidden',
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  footerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  version: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  versionBadge: {
    backgroundColor: isDarkMode ? '#374151' : '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  versionNumber: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default CustomDrawer;
