import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../hooks/useAuth';
import { authApi } from '../api';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { makeCall, sendEmail } from '../../../utils/contactUtils';
import { useTheme } from '../../../context/ThemeContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // Fetch fresh profile data on mount to get new fields
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data?.user) {
          updateUser(response.data.user);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              await logout();
              // Navigation will be handled by auth context
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      project_manager: 'Project Manager',
      finance: 'Finance Manager',
      site_incharge: 'Site Incharge',
      customer: 'Customer',
    };
    return roleNames[role] || role;
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      super_admin: 'crown',
      admin: 'shield-alt',
      project_manager: 'user-tie',
      finance: 'chart-line',
      site_incharge: 'hard-hat',
      customer: 'user',
    };
    return roleIcons[role] || 'user';
  };

  const getRoleColor = (role) => {
    const roleColors = {
      super_admin: '#8B5CF6',
      admin: '#3B82F6',
      project_manager: '#F59E0B',
      finance: '#10B981',
      site_incharge: '#EF4444',
      customer: '#4B5563', // Darker grey for customer
    };
    return roleColors[role] || '#3B82F6';
  };

  const ProfileHeader = () => {
    const roleColor = getRoleColor(user?.role);
    const roleIcon = getRoleIcon(user?.role);

    return (
      <LinearGradient
        colors={[roleColor, `${roleColor}CC`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <FontAwesome5 name="user-circle" size={60} color="#FFFFFF" />
            </View>
            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <FontAwesome5 name={roleIcon} size={12} color="#FFFFFF" />
              <Text style={styles.roleBadgeText}>{getRoleDisplayName(user?.role)}</Text>
            </View>
          </View>
          
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </LinearGradient>
    );
  };

  const InfoCard = ({ title, items }) => (
    <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.infoCardTitle, { color: colors.textPrimary }]}>{title}</Text>
      {items.map((item, index) => {
        const isEmail = item.label.toLowerCase().includes('email');
        const isPhone = item.label.toLowerCase().includes('phone');
        const hasAction = (isEmail || isPhone) && item.value && item.value !== 'Not provided';
        return (
          <View key={index} style={[styles.infoRow, { borderBottomColor: colors.divider }]}>
            <View style={styles.infoRowLeft}>
              <View style={[styles.infoIcon, { backgroundColor: `${item.color}15` }]}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.infoTextContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                {hasAction ? (
                  <TouchableOpacity onPress={() => isEmail ? sendEmail(item.value) : makeCall(item.value)}>
                    <Text style={[styles.infoValue, styles.linkValue]}>{item.value}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{item.value}</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return 'Not provided';
    }
  };

  const personalInfoItems = [
    {
      icon: 'email',
      label: 'Email Address',
      value: user?.email,
      color: '#3B82F6',
    },
    {
      icon: 'phone',
      label: 'Phone Number',
      value: user?.phone || 'Not provided',
      color: '#10B981',
    },
    {
      icon: 'calendar-today',
      label: 'Date of Joining',
      value: formatDate(user?.date_of_joining),
      color: '#8B5CF6',
    },
    {
      icon: 'cake',
      label: 'Date of Birth',
      value: formatDate(user?.date_of_birth),
      color: '#EC4899',
    },
    {
      icon: 'location-on',
      label: 'City',
      value: user?.city || 'Not provided',
      color: '#F59E0B',
    },
    {
      icon: 'home',
      label: 'Current Address',
      value: user?.current_address || 'Not provided',
      color: '#3B82F6',
    },
    {
      icon: 'apartment',
      label: 'Permanent Address',
      value: user?.permanent_address || 'Not provided',
      color: '#10B981',
    },
    {
      icon: 'verified',
      label: 'Account Status',
      value: user?.is_active ? 'Active' : 'Inactive',
      color: user?.is_active ? '#10B981' : '#EF4444',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader navigation={navigation} />
      
      {loadingProfile ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header with Gradient */}
        <ProfileHeader />

        {/* Personal Information Card */}
        <InfoCard title="Personal Information" items={personalInfoItems} />

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <MaterialIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>
              {loggingOut ? 'Logging out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 Construction Management</Text>
        </View>
      </ScrollView>
      )}
      
      <BottomNavigation navigation={navigation} activeRoute="Profile" />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937', // Dark grey background
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#2D3748', // Darker grey for card
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#4A5568',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  infoTextContent: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: '#CBD5E0',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    flexShrink: 1,
  },
  linkValue: {
    color: '#93C5FD',
    textDecorationLine: 'underline',
  },
  logoutContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#A0AEC0', // Medium grey
    fontWeight: '500',
    marginBottom: 2,
  },
  copyrightText: {
    fontSize: 10,
    color: '#718096', // Darker grey
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#CBD5E0',
    fontWeight: '500',
  },
});

export default ProfileScreen;
