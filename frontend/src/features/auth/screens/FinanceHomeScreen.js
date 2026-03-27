import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Platform,
  ImageBackground,
  Animated,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../hooks/useAuth';
import { useProjects } from '../../projects/hooks';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { theme } from '../../../theme/theme';
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  Card,
  LoadingState,
  EmptyState,
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { paymentsApi } from '../../payments/api';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

const FinanceHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { projects, loading, error, refetch } = useProjects();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactionStats, setTransactionStats] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    advancePayments: 0,
    finalPayments: 0,
    extraCharges: 0
  });
  const { scrollY, onScroll } = useScrollPosition();

  const isSuperAdmin = user?.role === 'super_admin';
  const totalProjects = projects.length;
  const quotationsGenerated = projects.filter(p => 
    ['QUOTATION_GENERATED', 'CUSTOMER_APPROVED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'WORK_STARTED', 'COMPLETED', 'CLOSED'].includes(p.status)
  ).length;
  const reportSubmitted = projects.filter(p => p.status === 'REPORT_SUBMITTED').length;

  useEffect(() => {
    if (projects.length > 0) {
      checkPendingPayments();
      if (isSuperAdmin) {
        loadAllTransactions();
      }
    }
  }, [projects]);

  const checkPendingPayments = async () => {
    let count = 0;
    for (const project of projects) {
      try {
        const response = await paymentsApi.getPaymentsByProject(project.id);
        const payments = response.data.payments;
        const pending = payments.filter(p => p.status === 'pending');
        count += pending.length;
      } catch (err) {
        // Skip
      }
    }
    setPendingPaymentsCount(count);
  };

  const loadAllTransactions = async () => {
    try {
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
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await checkPendingPayments();
    if (isSuperAdmin) {
      await loadAllTransactions();
    }
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'REPORT_SUBMITTED': '#F59E0B',
      'QUOTATION_GENERATED': '#3B82F6',
      'CUSTOMER_APPROVED': '#3B82F6',
      'ADVANCE_PENDING': '#EF4444',
      'ADVANCE_PAID': '#10B981',
      'WORK_STARTED': '#10B981',
      'COMPLETED': '#EF4444',
      'CLOSED': '#10B981',
    };
    return statusMap[status] || '#6B7280';
  };

  const getStatusBgColor = (status) => {
    const color = getStatusColor(status);
    return `${color}15`;
  };

  const getPaymentTypeColor = (type) => {
    const typeMap = {
      'advance': '#3B82F6',
      'final': '#10B981',
      'extra_charge': '#F59E0B'
    };
    return typeMap[type] || '#6B7280';
  };

  const getPaymentStatusColor = (status) => {
    const statusMap = {
      'paid': '#10B981',
      'pending': '#F59E0B',
      'failed': '#EF4444'
    };
    return statusMap[status] || '#6B7280';
  };

  const reportSubmittedProjects = projects.filter(p => p.status === 'REPORT_SUBMITTED');
  const projectsWithQuotations = projects.filter(p => 
    ['QUOTATION_GENERATED', 'CUSTOMER_APPROVED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'WORK_STARTED', 'COMPLETED', 'CLOSED'].includes(p.status)
  );

  // Stat Card Component - Square cards with decreased transparency
  const StatCard = ({ title, value, icon, color, gradientColors, onPress }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={gradientColors || [color, color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCardGradient}
      >
        <View style={styles.statCardContent}>
          <View style={styles.statLeftContent}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
          </View>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <FontAwesome5 name={icon} size={22} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Super Admin Stat Card - For transaction statistics
  const SuperAdminStatCard = ({ title, value, subtitle, icon, color, gradientColors }) => (
    <View style={styles.superStatCard}>
      <LinearGradient
        colors={gradientColors || [color, color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.superStatCardGradient}
      >
        <View style={styles.superStatCardContent}>
          <View style={styles.superStatLeftContent}>
            <Text style={styles.superStatValue}>{value}</Text>
            <Text style={styles.superStatTitle}>{title}</Text>
            {subtitle && <Text style={styles.superStatSubtitle}>{subtitle}</Text>}
          </View>
          <View style={[styles.superStatIconContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <FontAwesome5 name={icon} size={24} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // Transaction Card Component
  const TransactionCard = ({ transaction }) => {
    const paymentTypeColor = getPaymentTypeColor(transaction.payment_type);
    const paymentStatusColor = getPaymentStatusColor(transaction.status);
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionTypeBadge}>
            <View style={[styles.transactionTypeDot, { backgroundColor: paymentTypeColor }]} />
            <Text style={[styles.transactionTypeText, { color: paymentTypeColor }]}>
              {transaction.payment_type?.replace('_', ' ') || 'Payment'}
            </Text>
          </View>
          <View style={[styles.transactionStatusBadge, { backgroundColor: `${paymentStatusColor}15` }]}>
            <Text style={[styles.transactionStatusText, { color: paymentStatusColor }]}>
              {transaction.status}
            </Text>
          </View>
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.transactionAmountRow}>
            <Text style={styles.transactionAmountLabel}>Amount:</Text>
            <Text style={styles.transactionAmount}>₹{transaction.amount?.toLocaleString() || '0'}</Text>
          </View>
          
          <View style={styles.transactionProjectRow}>
            <MaterialIcons name="folder" size={14} color="#6B7280" />
            <Text style={styles.transactionProjectName} numberOfLines={1}>
              {transaction.projectName || 'Unknown Project'}
            </Text>
          </View>
          
          <View style={styles.transactionCustomerRow}>
            <MaterialIcons name="person" size={14} color="#6B7280" />
            <Text style={styles.transactionCustomerName} numberOfLines={1}>
              {transaction.customerName || 'Unknown Customer'}
            </Text>
          </View>
          
          {transaction.description && (
            <View style={styles.transactionDescriptionRow}>
              <MaterialIcons name="description" size={14} color="#6B7280" />
              <Text style={styles.transactionDescription} numberOfLines={2}>
                {transaction.description}
              </Text>
            </View>
          )}
          
          <View style={styles.transactionDateRow}>
            <MaterialIcons name="calendar-today" size={14} color="#6B7280" />
            <Text style={styles.transactionDate}>
              {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Project Card Component - Static (no animations)
  const ProjectCard = ({ project, getStatusColor, navigation, actionType }) => {
    const statusColor = getStatusColor(project.status);
    const statusBgColor = getStatusBgColor(project.status);

    return (
      <View style={styles.projectCardWrapper}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.projectCard}
        >
          <View style={styles.projectHeader}>
            <View style={styles.projectInfo}>
              <Text style={styles.projectName}>{project.name}</Text>
              <View style={styles.projectMeta}>
                <MaterialIcons name="location-on" size={12} color="#9CA3AF" />
                <Text style={styles.projectLocation}>{project.location}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {project.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.projectActions}>
            {actionType === 'generate' ? (
              <TouchableOpacity
                style={styles.actionButtonPrimary}
                onPress={() => navigation.navigate('GenerateQuotation', { project })}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.actionButtonGradient}
                >
                  <MaterialIcons name="description" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Generate Quotation</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButtonSecondary}
                  onPress={() => navigation.navigate('ViewQuotation', { projectId: project.id })}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.actionButtonGradient}
                  >
                    <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>View Quotation</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {project.status !== 'CLOSED' && (
                  <TouchableOpacity
                    style={styles.actionButtonWarning}
                    onPress={() => navigation.navigate('AddExtraCharge', { project })}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.actionButtonGradient}
                    >
                      <MaterialIcons name="add-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Extra Charge</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} />
        <LoadingState message="Loading projects..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader navigation={navigation} />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Hero Section */}
        <ImageBackground
          source={require('../../../assets/finance-background.png')}
          style={styles.heroContainer}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <View style={styles.welcomeBubble}>
                <Text style={styles.welcomeText}>Welcome Back!</Text>
              </View>
              <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Finance Manager'}</Text>
              <View style={styles.userRoleBadge}>
                <MaterialIcons name="account-balance" size={14} color="#FFFFFF" />
                <Text style={styles.userRole}>Finance Manager</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Content */}
        <View style={styles.content}>
          {/* Super Admin Dashboard Section */}
          {isSuperAdmin && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Super Admin Dashboard</Text>
                <View style={styles.superAdminBadge}>
                  <MaterialIcons name="admin-panel-settings" size={14} color="#FFFFFF" />
                  <Text style={styles.superAdminBadgeText}>Super Admin</Text>
                </View>
              </View>
              
              {/* Transaction Statistics */}
              <View style={styles.superAdminStatsGrid}>
                <SuperAdminStatCard
                  title="Total Transactions"
                  value={allTransactions.length}
                  subtitle={`₹${transactionStats.totalAmount.toLocaleString()}`}
                  icon="exchange-alt"
                  color="#7C3AED"
                  gradientColors={['#7C3AED', '#5B21B6']}
                />
                <SuperAdminStatCard
                  title="Paid Amount"
                  value={`₹${transactionStats.paidAmount.toLocaleString()}`}
                  subtitle={`${allTransactions.filter(t => t.status === 'paid').length} transactions`}
                  icon="check-circle"
                  color="#10B981"
                  gradientColors={['#10B981', '#059669']}
                />
                <SuperAdminStatCard
                  title="Pending Amount"
                  value={`₹${transactionStats.pendingAmount.toLocaleString()}`}
                  subtitle={`${allTransactions.filter(t => t.status === 'pending').length} pending`}
                  icon="clock"
                  color="#F59E0B"
                  gradientColors={['#F59E0B', '#D97706']}
                />
                <SuperAdminStatCard
                  title="Payment Types"
                  value={`${transactionStats.advancePayments + transactionStats.finalPayments + transactionStats.extraCharges}`}
                  subtitle={`Adv: ${transactionStats.advancePayments}, Final: ${transactionStats.finalPayments}, Extra: ${transactionStats.extraCharges}`}
                  icon="money-bill-wave"
                  color="#3B82F6"
                  gradientColors={['#3B82F6', '#2563EB']}
                />
              </View>

              {/* Project Status Graph Section */}
              <View style={styles.graphSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Project Status Overview</Text>
                </View>
                <View style={styles.graphCard}>
                  <View style={styles.graphHeader}>
                    <MaterialIcons name="bar-chart" size={20} color="#3B82F6" />
                    <Text style={styles.graphTitle}>Projects by Status</Text>
                  </View>
                  <View style={styles.graphContainer}>
                    {Object.entries({
                      'Active': projects.filter(p => !['CLOSED', 'COMPLETED'].includes(p.status)).length,
                      'Completed': projects.filter(p => ['COMPLETED', 'CLOSED'].includes(p.status)).length,
                      'With Quotations': projectsWithQuotations.length,
                      'Report Submitted': reportSubmittedProjects.length
                    }).map(([status, count]) => (
                      <View key={status} style={styles.graphBarRow}>
                        <Text style={styles.graphBarLabel}>{status}</Text>
                        <View style={styles.graphBarContainer}>
                          <View 
                            style={[
                              styles.graphBar, 
                              { 
                                width: `${(count / totalProjects) * 100}%`,
                                backgroundColor: status === 'Active' ? '#3B82F6' : 
                                              status === 'Completed' ? '#10B981' : 
                                              status === 'With Quotations' ? '#F59E0B' : '#EF4444'
                              }
                            ]} 
                          />
                        </View>
                        <Text style={styles.graphBarCount}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Recent Transactions Section */}
              {allTransactions.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('VerifyPayments')}>
                      <Text style={styles.seeAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.transactionsScrollView}
                  >
                    {allTransactions.slice(0, 5).map((transaction, index) => (
                      <TransactionCard key={index} transaction={transaction} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Overview Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Financial Overview</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProjectsList')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Projects"
                value={totalProjects}
                icon="clipboard-list"
                color="#4361EE"
                gradientColors={['#4361EE', '#3A0CA3']}
                onPress={() => navigation.navigate('ProjectsList')}
              />
              <StatCard
                title="Verify Payments"
                value={pendingPaymentsCount}
                icon="check-circle"
                color="rgba(245, 159, 11, 0.8)"
                gradientColors={['#F59E0B', '#D97706']}
                onPress={() => navigation.navigate('VerifyPayments')}
              />
              <StatCard
                title="Quotations"
                value={quotationsGenerated}
                icon="rupee-sign"
                color="#10B981"
                gradientColors={['#10B981', '#059669']}
                onPress={() => navigation.navigate('QuotationsList')}
              />
              <StatCard
                title="Generate Quotations"
                value={reportSubmittedProjects.length}
                icon="file-invoice-dollar"
                color="#8B5CF6"
                gradientColors={['#8B5CF6', '#7C3AED']}
                onPress={() => {}} 
              />
              <StatCard
                title="Pending Reports"
                value={reportSubmitted}
                icon="file-alt"
                color="#EF4444"
                gradientColors={['#EF4444', '#DC2626']}
                onPress={() => navigation.navigate('ProjectsList')}
              />
              <StatCard
                title="Orders"
                value=""
                icon="box"
                color="#EA580C"
                gradientColors={['#EA580C', '#C2410C']}
                onPress={() => navigation.navigate('OrdersList')}
              />
            </View>
          </View>

          {/* Error State */}
          {error ? (
            <View style={styles.section}>
              <View style={styles.errorCard}>
                <MaterialIcons name="error-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={refetch}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.retryButtonGradient}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Generate Quotations Section */}
              {reportSubmittedProjects.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Generate Quotations</Text>
                    <Text style={styles.projectCount}>{reportSubmittedProjects.length} pending</Text>
                  </View>
                  <Card style={styles.listContainerCard}>
                    {reportSubmittedProjects.map((project, index) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        getStatusColor={getStatusColor}
                        navigation={navigation}
                        actionType="generate"
                      />
                    ))}
                  </Card>
                </View>
              )}

              {/* Projects with Quotations Section */}
              {projectsWithQuotations.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Projects with Quotations</Text>
                    <Text style={styles.projectCount}>{projectsWithQuotations.length} total</Text>
                  </View>
                  {projectsWithQuotations.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      getStatusColor={getStatusColor}
                      navigation={navigation}
                      actionType="view"
                    />
                  ))}
                </View>
              )}

              {/* Empty State */}
              {reportSubmittedProjects.length === 0 && projectsWithQuotations.length === 0 && (
                <View style={styles.section}>
                  <EmptyState
                    icon="rupee-sign"
                    title="No Projects"
                    message="No projects require your attention"
                  />
                </View>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>
      
      <BottomNavigation navigation={navigation} activeRoute="FinanceHomeMain" scrollY={scrollY} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
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
    height: Platform.OS === 'web' ? 300 : 240,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  welcomeBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  userRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  projectCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
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
  superAdminStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 20,
  },
  superStatCard: {
    width: '50%',
    padding: 4,
  },
  superStatCardGradient: {
    borderRadius: 16,
    padding: 16,
    aspectRatio: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  superStatCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  superStatLeftContent: {
    flex: 1,
  },
  superStatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  superStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  superStatTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: 2,
  },
  superStatSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  graphSection: {
    marginBottom: 20,
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
  graphBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  graphBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    width: 100,
  },
  graphBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  graphBar: {
    height: '100%',
    borderRadius: 4,
  },
  graphBarCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 30,
    textAlign: 'right',
  },
  transactionsScrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  transactionCard: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionDetails: {
    gap: 6,
  },
  transactionAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionAmountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  transactionProjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionProjectName: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  transactionCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionCustomerName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
    flex: 1,
  },
  transactionDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  transactionDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '400',
    flex: 1,
    fontStyle: 'italic',
  },
  transactionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  transactionDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  // Original Finance Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statCard: {
    width: '33.33%',
    padding: 3,
  },
  statCardGradient: {
    borderRadius: 12,
    padding: 10,
    aspectRatio: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statLeftContent: {
    flex: 1,
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    lineHeight: 12,
  },
  listContainerCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  projectCardWrapper: {
    marginBottom: 12,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectLocation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  projectActions: {
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonPrimary: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonSecondary: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonWarning: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FinanceHomeScreen;