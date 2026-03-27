import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  ImageBackground, 
  Animated, 
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { useProjects } from '../../projects/hooks';
import { useUsers } from '../../users/hooks';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { theme } from '../../../theme/theme';
import { 
  PrimaryButton, 
  Card, 
  LoadingState 
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { paymentsApi } from '../../payments/api';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');
let sharedStyles;

const AdminHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  sharedStyles = styles;
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { users, loading: usersLoading, refetch: refetchUsers } = useUsers();
  const { scrollY, onScroll } = useScrollPosition();
  const [refreshing, setRefreshing] = useState(false);

  // Super admin state
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactionStats, setTransactionStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    advancePayments: 0,
    finalPayments: 0,
    extraCharges: 0
  });
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  // Calculate statistics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => 
    !['CLOSED', 'COMPLETED'].includes(p.status)
  ).length;
  const completedProjects = projects.filter(p => 
    p.status === 'COMPLETED' || p.status === 'CLOSED'
  ).length;
  const totalUsers = users.filter(u => u.is_active).length;
  const allUsersCount = users.filter(u => u.is_active).length;

  // Load transactions for super admin
  useEffect(() => {
    if (isSuperAdmin && projects.length > 0) {
      loadAllTransactions();
    }
  }, [isSuperAdmin, projects]);

  const loadAllTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const allPayments = [];
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let advancePayments = 0;
      let finalPayments = 0;
      let extraCharges = 0;

      for (const project of projects) {
        try {
          const response = await paymentsApi.getPaymentsByProject(project.id);
          const payments = response.data.payments;
          
          payments.forEach(payment => {
            const paymentWithProject = {
              ...payment,
              projectName: project.name,
              projectLocation: project.location,
              customerName: project.customer_name,
              projectStatus: project.status
            };
            allPayments.push(paymentWithProject);

            // Calculate statistics
            totalAmount += payment.amount || 0;
            if (payment.status === 'paid') {
              paidAmount += payment.amount || 0;
            } else if (payment.status === 'pending') {
              pendingAmount += payment.amount || 0;
            }

            // Count by payment type
            if (payment.payment_type === 'advance') {
              advancePayments++;
            } else if (payment.payment_type === 'final') {
              finalPayments++;
            } else if (payment.payment_type === 'extra_charge') {
              extraCharges++;
            }
          });
        } catch (err) {
          console.log(`Error loading payments for project ${project.id}:`, err);
        }
      }

      setAllTransactions(allPayments);
      setTransactionStats({
        totalAmount,
        paidAmount,
        pendingAmount,
        advancePayments,
        finalPayments,
        extraCharges
      });
    } catch (error) {
      console.error('Error loading all transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProjects(),
        refetchUsers()
      ]);
      // Reload transactions if super admin
      if (isSuperAdmin && projects.length > 0) {
        await loadAllTransactions();
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (projectsLoading || usersLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} />
        <LoadingState message="Loading dashboard..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            colors={['#2563EB']}
            tintColor={'#2563EB'}
            title="Pull to refresh"
            titleColor={'#6B7280'}
          />
        }
      >
        {/* Hero Section - Original style with overlay */}
        <ImageBackground
          source={require('../../../assets/admin-background.png')}
          style={styles.heroContainer}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <View style={styles.welcomeBubble}>
                <Text style={styles.welcomeText}>Welcome, How Are You?</Text>
              </View>
              <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
              <Text style={styles.userRole}>Administrator</Text>
            </View>
          </View>
        </ImageBackground>

        {/* Create Project Button - Dark Navy Blue */}
        <View style={styles.createButtonWrapper}>
          <PrimaryButton
            title="Create New Project"
            onPress={() => navigation.navigate('CreateProject')}
            icon={<FontAwesome5 name="plus" size={16} color="#FFFFFF" />}
            style={styles.createButton}
            textStyle={styles.createButtonText}
            fullWidth
          />
        </View>

        {/* Super Admin Dashboard Section */}
        {isSuperAdmin && (
          <View style={styles.sectionModern}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleModern, { color: colors.textPrimary }]}>Super Admin Dashboard</Text>
              <View style={styles.superAdminBadge}>
                <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
                <Text style={styles.superAdminBadgeText}>Super Admin</Text>
              </View>
            </View>
            
            {/* Payment Details Button */}
            <TouchableOpacity 
              style={styles.paymentDetailsButton}
              onPress={() => navigation.navigate('VerifyPayments')}
              activeOpacity={0.8}
            >
              <View style={styles.paymentDetailsContent}>
                <View style={styles.paymentDetailsIconContainer}>
                  <FontAwesome5 name="money-bill-wave" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.paymentDetailsInfo}>
                  <Text style={styles.paymentDetailsTitle}>Payment Details</Text>
                  <Text style={styles.paymentDetailsSubtitle}>
                    View all transactions and payment analytics
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Transaction Statistics */}
            <View style={styles.superAdminStatsGrid}>
              <SuperAdminStatCard
                title="Total Amount"
                value={`₹${transactionStats.totalAmount.toLocaleString()}`}
                subtitle={`${allTransactions.length} transactions`}
                icon="exchange-alt"
                color="#7C3AED"
              />
              <SuperAdminStatCard
                title="Paid Amount"
                value={`₹${transactionStats.paidAmount.toLocaleString()}`}
                subtitle={`${allTransactions.filter(t => t.status === 'paid').length} paid`}
                icon="check-circle"
                color="#10B981"
              />
              <SuperAdminStatCard
                title="Pending Amount"
                value={`₹${transactionStats.pendingAmount.toLocaleString()}`}
                subtitle={`${allTransactions.filter(t => t.status === 'pending').length} pending`}
                icon="clock"
                color="#F59E0B"
              />
            </View>

            {/* Payment Type Graph */}
            <View style={styles.graphSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitleModern, { color: colors.textPrimary }]}>Payment Type Distribution</Text>
              </View>
              <View style={styles.graphCard}>
                <View style={styles.graphHeader}>
                  <FontAwesome5 name="chart-pie" size={20} color="#3B82F6" />
                  <Text style={styles.graphTitle}>Payment Types</Text>
                </View>
                <View style={styles.graphContainer}>
                  {[
                    { type: 'Advance', count: transactionStats.advancePayments, color: '#3B82F6' },
                    { type: 'Final', count: transactionStats.finalPayments, color: '#10B981' },
                    { type: 'Extra Charges', count: transactionStats.extraCharges, color: '#F59E0B' }
                  ].map((item, index) => (
                    <View key={index} style={styles.graphItem}>
                      <View style={styles.graphItemHeader}>
                        <View style={styles.graphItemColorDot}>
                          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                        </View>
                        <Text style={styles.graphItemLabel}>{item.type}</Text>
                        <Text style={styles.graphItemCount}>{item.count}</Text>
                      </View>
                      <View style={styles.graphBarContainer}>
                        <View 
                          style={[
                            styles.graphBar, 
                            { 
                              width: `${(item.count / (transactionStats.advancePayments + transactionStats.finalPayments + transactionStats.extraCharges)) * 100}%`,
                              backgroundColor: item.color
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Project Status Graph */}
            <View style={styles.graphSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitleModern, { color: colors.textPrimary }]}>Project Status Overview</Text>
              </View>
              <View style={styles.graphCard}>
                <View style={styles.graphHeader}>
                  <FontAwesome5 name="chart-bar" size={20} color="#3B82F6" />
                  <Text style={styles.graphTitle}>Projects by Status</Text>
                </View>
                <View style={styles.graphContainer}>
                  {[
                    { status: 'Active', count: activeProjects, color: '#3B82F6' },
                    { status: 'Completed', count: completedProjects, color: '#10B981' },
                    { status: 'In Progress', count: totalProjects - activeProjects - completedProjects, color: '#F59E0B' }
                  ].map((item, index) => (
                    <View key={index} style={styles.graphItem}>
                      <View style={styles.graphItemHeader}>
                        <View style={styles.graphItemColorDot}>
                          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                        </View>
                        <Text style={styles.graphItemLabel}>{item.status}</Text>
                        <Text style={styles.graphItemCount}>{item.count}</Text>
                      </View>
                      <View style={styles.graphBarContainer}>
                        <View 
                          style={[
                            styles.graphBar, 
                            { 
                              width: `${(item.count / totalProjects) * 100}%`,
                              backgroundColor: item.color
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Projects Overview Section */}
        <View style={styles.sectionModern}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitleModern, { color: colors.textPrimary }]}>Project Management</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProjectsList')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {/* Total Projects Card - Full Width Top (Blue) */}
          <TouchableOpacity 
            style={[styles.activeProjectCard, { backgroundColor: '#2563EB' }]}
            onPress={() => navigation.navigate('ProjectsList', { filter: 'all' })}
            activeOpacity={0.9}
          >
            <View style={styles.activeProjectContent}>
              <View>
                <Text style={styles.activeProjectLabel}>Total Projects</Text>
                <Text style={styles.activeProjectCount}>{totalProjects}</Text>
                <Text style={styles.activeProjectSubtext}>All projects in system</Text>
              </View>
              <View style={styles.activeProjectIcon}>
                <FontAwesome5 name="clipboard-list" size={40} color="rgba(255,255,255,0.3)" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Active and Completed Cards - Side by Side */}
          <View style={styles.projectRow}>
            <TouchableOpacity 
              style={[styles.projectSmallCard, { backgroundColor: '#F59E0B' }]} // Orange for Active
              onPress={() => navigation.navigate('ProjectsList', { filter: 'active' })}
              activeOpacity={0.9}
            >
              <FontAwesome5 name="play-circle" size={24} color="rgba(255,255,255,0.3)" style={styles.smallCardIcon} />
              <Text style={styles.smallCardLabel}>Active Projects</Text>
              <Text style={styles.smallCardCount}>{activeProjects}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.projectSmallCard, { backgroundColor: '#10B981' }]} // Green for Completed
              onPress={() => navigation.navigate('ProjectsList', { filter: 'completed' })}
              activeOpacity={0.9}
            >
              <FontAwesome5 name="check-circle" size={24} color="rgba(255,255,255,0.3)" style={styles.smallCardIcon} />
              <Text style={styles.smallCardLabel}>Completed</Text>
              <Text style={styles.smallCardCount}>{completedProjects}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Management Section */}
        <View style={styles.sectionModern}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitleModern, { color: colors.textPrimary }]}>User Management</Text>
            <TouchableOpacity onPress={() => navigation.navigate('UsersList', { activeOnly: true })}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* All Users Card */}
          <TouchableOpacity 
            style={styles.allUsersCard}
            onPress={() => navigation.navigate('UsersList', { activeOnly: true })}
            activeOpacity={0.7}
          >
            <View style={styles.allUsersContent}>
              <View style={styles.allUsersIconContainer}>
                <FontAwesome5 name="users" size={24} color="#2563EB" />
              </View>
              <View style={styles.allUsersInfo}>
                <Text style={styles.allUsersTitle}>All Active Users</Text>
                <Text style={styles.allUsersCount}>{allUsersCount} total members</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* User Role Cards Grid */}
          <View style={styles.userRoleGrid}>
            <UserRoleCard
              title="Super Admins"
              icon="user-cog"
              count={users.filter(u => u.role === 'super_admin' && u.is_active).length}
              onPress={() => navigation.navigate('UsersList', { role: 'super_admin', activeOnly: true })}
              color="#EF4444"
            />
            <UserRoleCard
              title="Admins"
              icon="user-shield"
              count={users.filter(u => u.role === 'admin' && u.is_active).length}
              onPress={() => navigation.navigate('UsersList', { role: 'admin', activeOnly: true })}
              color="#2563EB"
            />
            <UserRoleCard
              title="Project Managers"
              icon="user-tie"
              count={users.filter(u => u.role === 'project_manager' && u.is_active).length}
              onPress={() => navigation.navigate('UsersList', { role: 'project_manager', activeOnly: true })}
              color="#3B82F6"
            />
            <UserRoleCard
              title="Site Incharge"
              icon="hard-hat"
              count={users.filter(u => u.role === 'site_incharge' && u.is_active).length}
              onPress={() => navigation.navigate('UsersList', { role: 'site_incharge', activeOnly: true })}
              color="#F59E0B"
            />
            <UserRoleCard
              title="Finance"
              icon="rupee-sign"
              count={users.filter(u => u.role === 'finance' && u.is_active).length}
              onPress={() => navigation.navigate('UsersList', { role: 'finance', activeOnly: true })}
              color="#10B981"
            />
            <UserRoleCard
              title="Customers"
              icon="user-friends"
              count={users.filter(u => u.role === 'customer' && u.is_active).length}
              onPress={() => navigation.navigate('UsersList', { role: 'customer', activeOnly: true })}
              color="#8B5CF6"
            />
            <UserRoleCard
              title="Deactivated Users"
              icon="user-slash"
              count={users.filter(u => !u.is_active).length}
              onPress={() => navigation.navigate('UsersList', { inactiveOnly: true })}
              color="#6B7280"
            />
          </View>
        </View>

        {/* Reports Section */}
        <View style={[styles.sectionModern, styles.lastSection]}>
          <Text style={[styles.sectionTitleModern, { color: colors.textPrimary }]}>Reports & Analytics</Text>
          
          <TouchableOpacity 
            style={styles.reportCardModern}
            onPress={() => navigation.navigate('ReportsList')}
            activeOpacity={0.7}
          >
            <View style={styles.reportCardLeft}>
              <View style={[styles.reportIconModern, { backgroundColor: '#EEF2FF' }]}>
                <FontAwesome5 name="chart-bar" size={22} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.reportTitleModern}>View Reports</Text>
                <Text style={styles.reportSubtitleModern}>Access all project reports</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.reportCardModern, { marginTop: 10 }]}
            onPress={() => navigation.navigate('OrdersList')}
            activeOpacity={0.7}
          >
            <View style={styles.reportCardLeft}>
              <View style={[styles.reportIconModern, { backgroundColor: '#FFF7ED' }]}>
                <FontAwesome5 name="box" size={22} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.reportTitleModern}>Orders</Text>
                <Text style={styles.reportSubtitleModern}>Manage concrete & brick orders</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reportCardModern, { marginTop: 10 }]}
            onPress={() => navigation.navigate('AuditLogs')}
            activeOpacity={0.7}
          >
            <View style={styles.reportCardLeft}>
              <View style={[styles.reportIconModern, { backgroundColor: '#EDE9FE' }]}>
                <FontAwesome5 name="clipboard-list" size={22} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.reportTitleModern}>Audit Logs</Text>
                <Text style={styles.reportSubtitleModern}>View system activity & share logs</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
      
      <BottomNavigation navigation={navigation} activeRoute="AdminHomeMain" scrollY={scrollY} />
    </View>
  );
};

// Super Admin Stat Card Component
const SuperAdminStatCard = ({ title, value, subtitle, icon, color }) => {
  const { colors } = useTheme();
  const styles = sharedStyles;
  return (
    <View style={styles.superAdminStatCard}>
      <View style={[styles.superAdminStatCardInner, { backgroundColor: color }]}>
        <View style={styles.superAdminStatCardContent}>
          <View style={styles.superAdminStatLeftContent}>
            <Text style={styles.superAdminStatValue}>{value}</Text>
            <Text style={styles.superAdminStatTitle}>{title}</Text>
            {subtitle && <Text style={styles.superAdminStatSubtitle}>{subtitle}</Text>}
          </View>
          <View style={styles.superAdminStatIconContainer}>
            <FontAwesome5 name={icon} size={20} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </View>
  );
};

// User Role Card Component (similar to SuperAdminHomeScreen)
const UserRoleCard = ({ title, icon, count, onPress, color }) => {
  const { colors } = useTheme();
  const styles = sharedStyles;
  return (
    <TouchableOpacity style={styles.userRoleCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.userRoleIconContainer, { backgroundColor: `${color}15` }]}>
        <FontAwesome5 name={icon} size={20} color={color} />
      </View>
      <Text style={styles.userRoleCount}>{count}</Text>
      <Text style={styles.userRoleTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

// Role Card Component
const RoleCard = ({ title, icon, count, onPress, color }) => {
  const { colors } = useTheme();
  const styles = sharedStyles;
  return (
    <TouchableOpacity style={styles.roleCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.roleIconContainer, { backgroundColor: `${color}15` }]}>
        <FontAwesome5 name={icon} size={18} color={color} />
      </View>
      <View style={styles.roleInfo}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleCount}>{count} members</Text>
      </View>
      <MaterialIcons name="arrow-forward-ios" size={12} color={colors.textLight} />
    </TouchableOpacity>
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
  // Hero Section - Original style
  heroContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? 300 : 260,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  welcomeBubble: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  // Create Button - Dark Navy Blue
  createButtonWrapper: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  createButton: {
    backgroundColor: '#1E3A8A', // Dark navy blue
    borderWidth: 0,
    borderRadius: 12,
    paddingVertical: 14,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modern Sections
  sectionModern: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  lastSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleModern: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  // Project Cards
  activeProjectCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activeProjectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeProjectLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  activeProjectCount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activeProjectSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  activeProjectIcon: {
    opacity: 0.8,
  },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  projectSmallCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  smallCardIcon: {
    marginBottom: 12,
  },
  smallCardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  smallCardCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // All Users Card
  allUsersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  allUsersContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allUsersIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  allUsersInfo: {
    flex: 1,
  },
  allUsersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  allUsersCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Role Cards
  userTypesGrid: {
    gap: 10,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  roleCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // User Role Cards Grid (similar to SuperAdminHomeScreen)
  userRoleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  userRoleCard: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '48%',
    margin: 6,
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userRoleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userRoleCount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userRoleTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Report Card
  reportCardModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  reportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reportIconModern: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportTitleModern: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reportSubtitleModern: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Super Admin Styles
  superAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  superAdminBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paymentDetailsButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentDetailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDetailsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentDetailsInfo: {
    flex: 1,
  },
  paymentDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  paymentDetailsSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  superAdminStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  superAdminStatCard: {
    width: '33.33%',
    padding: 4,
  },
  superAdminStatCardInner: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  superAdminStatCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  superAdminStatLeftContent: {
    flex: 1,
  },
  superAdminStatIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  superAdminStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  superAdminStatTitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: 2,
  },
  superAdminStatSubtitle: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  graphSection: {
    marginBottom: 16,
  },
  graphCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  graphHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  graphContainer: {
    gap: 12,
  },
  graphItem: {
    gap: 6,
  },
  graphItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  graphItemColorDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  graphItemLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 4,
  },
  graphItemCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  graphBarContainer: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  graphBar: {
    height: '100%',
    borderRadius: 4,
  },
});

export default AdminHomeScreen;
