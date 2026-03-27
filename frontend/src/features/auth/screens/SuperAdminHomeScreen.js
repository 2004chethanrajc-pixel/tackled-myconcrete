import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  ImageBackground,
  Animated,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { useUsers } from '../../users/hooks';
import { useProjects } from '../../projects/hooks';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { theme } from '../../../theme/theme';
import {
  PrimaryButton,
  DangerButton,
  Card,
  LoadingState,
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { useTheme } from '../../../context/ThemeContext';

let sharedStyles;

const SuperAdminHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { users, loading: usersLoading, refetch: refetchUsers } = useUsers();
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { scrollY, onScroll } = useScrollPosition();
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  sharedStyles = styles;

  const adminCount = users.filter((u) => u.role === 'admin' && u.is_active).length;
  const superAdminCount = users.filter((u) => u.role === 'super_admin' && u.is_active).length;
  const projectManagerCount = users.filter((u) => u.role === 'project_manager' && u.is_active).length;
  const siteInchargeCount = users.filter((u) => u.role === 'site_incharge' && u.is_active).length;
  const financeCount = users.filter((u) => u.role === 'finance' && u.is_active).length;
  const customerCount = users.filter((u) => u.role === 'customer' && u.is_active).length;
  const deactivatedCount = users.filter((u) => !u.is_active).length;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchUsers(),
        refetchProjects()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (usersLoading || projectsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} />
        <LoadingState message="Loading dashboard..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader navigation={navigation} />

      <Animated.ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Pull to refresh"
            titleColor={colors.textSecondary}
          />
        }
      >
        <ImageBackground
          source={require('../../../assets/super-background.png')}
          style={styles.heroContainer}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <View style={styles.welcomeBubble}>
                <Text style={styles.welcomeText}>Welcome, How Are You?</Text>
              </View>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userRole}>Super Administrator</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Management</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Active users by role • Deactivated users managed separately</Text>
            
            <View style={styles.actionButtonsGrid}>
              <PrimaryButton
                title="Add New Admin"
                onPress={() => navigation.navigate('CreateUser', { role: 'admin' })}
                icon={<FontAwesome5 name="plus-circle" size={18} color={theme.colors.textWhite} />}
                fullWidth
                style={styles.actionButtonSpacing}
              />
              
              <DangerButton
                title="Add Super Admin"
                onPress={() => navigation.navigate('CreateUser', { role: 'super_admin' })}
                icon={<FontAwesome5 name="plus-circle" size={18} color={theme.colors.textWhite} />}
                fullWidth
              />
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                title="Super Admins"
                value={superAdminCount}
                icon="user-cog"
                color={theme.colors.error}
                onPress={() => navigation.navigate('UsersList', { role: 'super_admin', activeOnly: true })}
              />
              <StatCard
                title="Admins"
                value={adminCount}
                icon="user-shield"
                color={theme.colors.primary}
                onPress={() => navigation.navigate('UsersList', { role: 'admin', activeOnly: true })}
              />
              <StatCard
                title="Project Managers"
                value={projectManagerCount}
                icon="user-tie"
                color={theme.colors.info}
                onPress={() => navigation.navigate('UsersList', { role: 'project_manager', activeOnly: true })}
              />
              <StatCard
                title="Site Incharge"
                value={siteInchargeCount}
                icon="hard-hat"
                color={theme.colors.warning}
                onPress={() => navigation.navigate('UsersList', { role: 'site_incharge', activeOnly: true })}
              />
              <StatCard
                title="Finance"
                value={financeCount}
                icon="rupee-sign"
                color={theme.colors.success}
                onPress={() => navigation.navigate('UsersList', { role: 'finance', activeOnly: true })}
              />
              <StatCard
                title="Customers"
                value={customerCount}
                icon="user-friends"
                color={theme.colors.cardPurple}
                onPress={() => navigation.navigate('UsersList', { role: 'customer', activeOnly: true })}
              />
              <StatCard
                title="Deactivated Users"
                value={deactivatedCount}
                icon="user-slash"
                color={theme.colors.textSecondary}
                onPress={() => navigation.navigate('UsersList', { inactiveOnly: true })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>System Activity Logs</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AuditLogs')}
              >
                <FontAwesome5 name="external-link-alt" size={14} color={theme.colors.primary} />
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {/* Prominent All Logs Button */}
            <TouchableOpacity 
              style={styles.allLogsButton}
              onPress={() => navigation.navigate('AuditLogs')}
              activeOpacity={0.8}
            >
              <View style={styles.allLogsContent}>
                <View style={styles.allLogsIconContainer}>
                  <FontAwesome5 name="clipboard-list" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.allLogsInfo}>
                  <Text style={styles.allLogsTitle}>Complete System Audit Logs</Text>
                  <Text style={styles.allLogsSubtitle}>
                    View all system activities, user actions, and security events
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.activitiesGrid}>
              <ActivityCard
                title="Admin Activities"
                icon="user-shield"
                onPress={() => navigation.navigate('AuditLogs', { role: 'admin' })}
              />
              <ActivityCard
                title="PM Activities"
                icon="user-tie"
                onPress={() => navigation.navigate('AuditLogs', { role: 'project_manager' })}
              />
              <ActivityCard
                title="Site Incharge Activities"
                icon="hard-hat"
                onPress={() => navigation.navigate('AuditLogs', { role: 'site_incharge' })}
              />
              <ActivityCard
                title="Finance Activities"
                icon="rupee-sign"
                onPress={() => navigation.navigate('AuditLogs', { role: 'finance' })}
              />
              <ActivityCard
                title="Customer Activities"
                icon="user-friends"
                onPress={() => navigation.navigate('AuditLogs', { role: 'customer' })}
              />
            </View>
          </View>
          <View style={[styles.section, { marginBottom: 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Orders</Text>
            <TouchableOpacity 
              style={styles.allLogsButton}
              onPress={() => navigation.navigate('OrdersList')}
              activeOpacity={0.8}
            >
              <View style={styles.allLogsContent}>
                <View style={[styles.allLogsIconContainer, { backgroundColor: '#EA580C' }]}>
                  <FontAwesome5 name="box" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.allLogsInfo}>
                  <Text style={styles.allLogsTitle}>Manage Orders</Text>
                  <Text style={styles.allLogsSubtitle}>
                    View and manage concrete & brick orders
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
      
      <BottomNavigation navigation={navigation} activeRoute="SuperAdminHomeMain" scrollY={scrollY} />
    </View>
  );
};

const StatCard = ({ title, value, icon, color, onPress }) => {
  const { colors } = useTheme();
  const styles = sharedStyles;
  return (
    <Card variant="elevated" onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <FontAwesome5 name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </Card>
  );
};

const ActivityCard = ({ title, icon, onPress }) => {
  const { colors } = useTheme();
  const styles = sharedStyles;
  return (
    <Card variant="flat" onPress={onPress} style={styles.activityCard}>
      <View style={styles.activityContent}>
        <View style={styles.activityIconContainer}>
          <FontAwesome5 name={icon} size={20} color={theme.colors.primary} />
        </View>
        <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <FontAwesome5 name="chevron-right" size={14} color={colors.textSecondary} />
    </Card>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? 350 : 280,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  welcomeBubble: {
    backgroundColor: colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  welcomeText: {
    ...theme.typography.body1,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  userName: {
    ...theme.typography.h2,
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.xs,
  },
  userRole: {
    ...theme.typography.body1,
    color: theme.colors.textWhite,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h5,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  actionButtonsGrid: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  actionButtonSpacing: {
    marginBottom: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '48%',
    margin: theme.spacing.xs,
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    ...theme.typography.h4,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  statTitle: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  activitiesGrid: {
    gap: theme.spacing.sm,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    ...theme.typography.body1,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  // New styles for enhanced audit logs UI
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryLight,
  },
  viewAllButtonText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  allLogsButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  allLogsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allLogsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  allLogsInfo: {
    flex: 1,
  },
  allLogsTitle: {
    ...theme.typography.h6,
    color: theme.colors.textWhite,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  allLogsSubtitle: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
});

export default SuperAdminHomeScreen;
