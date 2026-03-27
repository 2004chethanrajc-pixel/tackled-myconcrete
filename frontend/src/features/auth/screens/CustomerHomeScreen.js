import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  Platform,
  ImageBackground,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../hooks/useAuth';
import { useProjects } from '../../projects/hooks';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { theme, formatCurrency } from '../../../theme/theme';
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  Card,
  EmptyState,
  LoadingState,
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

const CustomerHomeScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { projects, loading, error, refetch } = useProjects();
  const [refreshing, setRefreshing] = useState(false);
  const [projectsWithExtraCharges, setProjectsWithExtraCharges] = useState([]);
  const lastExtraChargesCheck = React.useRef(0);
  const { scrollY, onScroll } = useScrollPosition();

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => 
      !['CLOSED', 'COMPLETED'].includes(p.status)
    ).length;
    const completedProjects = projects.filter(p => 
      p.status === 'COMPLETED' || p.status === 'CLOSED'
    ).length;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
    };
  }, [projects]);

  // Check for pending extra charges
  React.useEffect(() => {
    if (projects.length > 0 && !loading && !refreshing) {
      const timeoutId = setTimeout(() => {
        checkForExtraCharges();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [projects.length, loading, refreshing]);

  // Auto-refresh when screen comes into focus
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [lastFocusTime, setLastFocusTime] = React.useState(0);
  
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      
      if (isInitialLoad) {
        setIsInitialLoad(false);
        setLastFocusTime(now);
        return;
      }
      
      if (now - lastFocusTime < 2000) {
        return;
      }
      
      setLastFocusTime(now);
      refetch();
    }, [refetch, isInitialLoad, lastFocusTime])
  );

  // Handle refresh parameter from navigation
  React.useEffect(() => {
    if (route.params?.refresh) {
      onRefresh();
      navigation.setParams({ refresh: false });
    }
  }, [route.params?.refresh]);

  const checkForExtraCharges = React.useCallback(async () => {
    if (loading || projects.length === 0) return;
    
    const now = Date.now();
    if (now - lastExtraChargesCheck.current < 5000) {
      return;
    }
    lastExtraChargesCheck.current = now;
    
    try {
      // Import payments API
      const paymentsModule = await import('../../payments/api');
      const { paymentsApi } = paymentsModule;
      
      const projectsWithCharges = [];

      for (const project of projects) {
        try {
          const response = await paymentsApi.getPaymentsByProject(project.id);
          const payments = response.data.payments || [];
          
          const hasPendingExtra = payments.some(p => p.type === 'extra' && p.status === 'pending');
          
          if (hasPendingExtra) {
            projectsWithCharges.push(project.id);
          }
        } catch (err) {
          console.warn(`Failed to check payments for project ${project.id}:`, err);
        }
      }
      
      setProjectsWithExtraCharges(projectsWithCharges);
    } catch (err) {
      console.error('Error checking extra charges:', err);
      setProjectsWithExtraCharges([]);
    }
  }, [projects, loading]);

  const onRefresh = React.useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

  const getStatusColor = (status) => {
    const statusMap = {
      'CREATED': '#6B7280',
      'PM_ASSIGNED': '#F59E0B',
      'VISIT_DONE': '#F59E0B',
      'REPORT_SUBMITTED': '#F59E0B',
      'QUOTATION_GENERATED': '#3B82F6',
      'CUSTOMER_APPROVED': '#3B82F6',
      'ADVANCE_PENDING': '#F59E0B',
      'ADVANCE_PAID': '#10B981',
      'WORK_STARTED': '#10B981',
      'COMPLETED': '#10B981',
      'CLOSED': '#10B981',
    };
    return statusMap[status] || '#6B7280';
  };

  const getStatusBgColor = (status) => {
    const color = getStatusColor(status);
    return `${color}15`;
  };

  // Stat Cards with new layout
  const TotalProjectsCard = ({ value, onPress }) => (
    <TouchableOpacity style={styles.totalCard} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={['#4361EE', '#3A0CA3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.totalCardGradient}
      >
        <View style={styles.totalCardContent}>
          <View style={styles.totalCardLeft}>
            <Text style={styles.totalCardLabel}>Total Projects</Text>
            <Text style={styles.totalCardValue}>{value}</Text>
            <Text style={styles.totalCardSubtext}>All projects in your account</Text>
          </View>
          <View style={styles.totalCardIcon}>
            <FontAwesome5 name="clipboard-list" size={40} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const ActiveProjectsCard = ({ value, onPress }) => (
    <TouchableOpacity style={styles.smallCard} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.smallCardGradient}
      >
        <View style={styles.smallCardContent}>
          <View style={styles.smallCardIcon}>
            <FontAwesome5 name="play-circle" size={24} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={styles.smallCardLabel}>Active Projects</Text>
          <Text style={styles.smallCardValue}>{value}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const CompletedProjectsCard = ({ value, onPress }) => (
    <TouchableOpacity style={styles.smallCard} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.smallCardGradient}
      >
        <View style={styles.smallCardContent}>
          <View style={styles.smallCardIcon}>
            <FontAwesome5 name="check-circle" size={24} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={styles.smallCardLabel}>Completed</Text>
          <Text style={styles.smallCardValue}>{value}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ title, icon, onPress }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.quickActionGradient}
      >
        <View style={styles.quickActionContent}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F615' }]}>
            <FontAwesome5 name={icon} size={16} color="#3B82F6" />
          </View>
          <Text style={styles.quickActionTitle}>{title}</Text>
        </View>
        <MaterialIcons name="arrow-forward-ios" size={14} color="#9CA3AF" />
      </LinearGradient>
    </TouchableOpacity>
  );

  const ProjectCard = ({ project, hasExtraCharge, getStatusColor, getStatusBgColor, navigation }) => {
    const handleExtraChargePayment = async () => {
      try {
        // Import payments API
        const paymentsModule = await import('../../payments/api');
        const { paymentsApi } = paymentsModule;
        
        const response = await paymentsApi.getPaymentsByProject(project.id);
        const payments = response.data.payments || [];
        
        const extraCharge = payments.find(p => p.type === 'extra' && p.status === 'pending');
        if (extraCharge) {
          navigation.navigate('PayExtraCharge', { project, extraCharge });
        } else {
          Alert.alert('Info', 'No pending extra charges found for this project');
        }
      } catch (err) {
        console.error('Error loading extra charge details:', err);
        Alert.alert('Error', 'Failed to load extra charge details. Please try again.');
      }
    };

    const statusColor = getStatusColor(project.status);
    const statusBgColor = getStatusBgColor(project.status);

    return (
      <Animated.View
        style={[
          styles.projectCardWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('ProjectDetail', { project })}
          activeOpacity={0.7}
        >
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

            {/* Extra Charge Alert */}
            {hasExtraCharge && (
              <View style={styles.alertBanner}>
                <View style={styles.alertIcon}>
                  <FontAwesome5 name="exclamation-triangle" size={12} color="#F59E0B" />
                </View>
                <Text style={styles.alertText}>Extra Charge Pending Payment</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.projectActions}>
              {project.status === 'QUOTATION_GENERATED' && (
                <TouchableOpacity
                  style={styles.actionButtonPrimary}
                  onPress={() => navigation.navigate('ViewQuotation', { projectId: project.id })}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.actionButtonGradient}
                  >
                    <MaterialIcons name="description" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>View & Approve Quotation</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {project.status === 'CUSTOMER_APPROVED' && (
                <TouchableOpacity
                  style={styles.actionButtonSuccess}
                  onPress={() => navigation.navigate('CreatePayment', { project })}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.actionButtonGradient}
                  >
                    <MaterialIcons name="payment" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Pay Advance Amount</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {project.status === 'COMPLETED' && (
                <>
                  <TouchableOpacity
                    style={styles.actionButtonSuccess}
                    onPress={() => navigation.navigate('CreateFinalPayment', { project })}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.actionButtonGradient}
                    >
                      <MaterialIcons name="payment" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Pay Final Amount</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButtonSecondary}
                    onPress={() => navigation.navigate('Signature', { project })}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#F3F4F6', '#E5E7EB']}
                      style={styles.actionButtonGradientSecondary}
                    >
                      <FontAwesome5 name="file-signature" size={14} color="#3B82F6" />
                      <Text style={styles.actionButtonTextSecondary}>Add Digital Signature</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {hasExtraCharge && (
                <TouchableOpacity
                  style={styles.actionButtonWarning}
                  onPress={handleExtraChargePayment}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.actionButtonGradient}
                  >
                    <MaterialIcons name="warning" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Pay Extra Charge</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Status Info */}
            {(project.status === 'ADVANCE_PENDING' || project.status === 'ADVANCE_PAID') && (
              <View style={[styles.statusInfo, { backgroundColor: '#3B82F615' }]}>
                <MaterialIcons 
                  name={project.status === 'ADVANCE_PENDING' ? 'hourglass-empty' : 'check-circle'} 
                  size={16} 
                  color="#3B82F6" 
                />
                <Text style={[styles.statusInfoText, { color: '#3B82F6' }]}>
                  {project.status === 'ADVANCE_PENDING' 
                    ? 'Advance Payment Pending Verification' 
                    : 'Advance Payment Verified - Work Will Start Soon'}
                </Text>
              </View>
            )}

            {project.status === 'WORK_STARTED' && (
              <View style={[styles.statusInfo, { backgroundColor: '#10B98115' }]}>
                <MaterialIcons name="construction" size={16} color="#10B981" />
                <Text style={[styles.statusInfoText, { color: '#10B981' }]}>Work in Progress</Text>
              </View>
            )}

            {project.status === 'FINAL_PAID' && (
              <View style={[styles.statusInfo, { backgroundColor: '#3B82F615' }]}>
                <MaterialIcons name="check-circle" size={16} color="#3B82F6" />
                <Text style={[styles.statusInfoText, { color: '#3B82F6' }]}>
                  Final Payment Completed - Project Will Be Closed Soon
                </Text>
              </View>
            )}

            {project.status === 'CLOSED' && (
              <View style={[styles.statusInfo, { backgroundColor: '#10B98115' }]}>
                <MaterialIcons name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.statusInfoText, { color: '#10B981' }]}>
                  Project Completed & Closed
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Hero Section - Modern with gradient overlay */}
        <ImageBackground
          source={require('../../../assets/customer-background.png')}
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
              <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Customer'}</Text>
              <View style={styles.userRoleBadge}>
                <MaterialIcons name="person" size={14} color="#FFFFFF" />
                <Text style={styles.userRole}>Customer</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Content */}
        <View style={styles.content}>
          {/* Stats Section - New Layout */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProjectsList')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsContainer}>
              {/* Total Projects - Full Width */}
              <TotalProjectsCard
                value={stats.totalProjects}
                onPress={() => navigation.navigate('ProjectsList')}
              />

              {/* Active and Completed - Side by Side */}
              <View style={styles.smallCardsRow}>
                <ActiveProjectsCard
                  value={stats.activeProjects}
                  onPress={() => navigation.navigate('ProjectsList', { filter: 'active' })}
                />
                <CompletedProjectsCard
                  value={stats.completedProjects}
                  onPress={() => navigation.navigate('ProjectsList', { filter: 'completed' })}
                />
              </View>
            </View>

            <View style={styles.quickActionsGrid}>
              <QuickActionCard
                title="View Quotation"
                icon="rupee-sign"
                onPress={() => navigation.navigate('QuotationsList')}
              />
              <QuickActionCard
                title="View Reports"
                icon="file-alt"
                onPress={() => navigation.navigate('ReportsList')}
              />
              <QuickActionCard
                title="My Orders"
                icon="box"
                onPress={() => navigation.navigate('OrdersList')}
              />
            </View>
          </View>

          {/* My Projects Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Projects</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProjectsList')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {/* Project Filters */}
            <View style={styles.projectFilters}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'active' })}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.filterButtonGradient}
                >
                  <FontAwesome5 name="play-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.filterButtonText}>Active ({stats.activeProjects})</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'completed' })}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.filterButtonGradient}
                >
                  <FontAwesome5 name="check-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.filterButtonText}>Completed ({stats.completedProjects})</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {projects.length === 0 ? (
              <View style={styles.emptyProjectsCard}>
                <MaterialIcons name="folder-open" size={48} color="#9CA3AF" />
                <Text style={styles.emptyProjectsTitle}>No Projects Yet</Text>
                <Text style={styles.emptyProjectsText}>Create your first project to get started</Text>
                <TouchableOpacity
                  style={styles.createProjectButton}
                  onPress={() => navigation.navigate('CreateProject')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.createProjectButtonGradient}
                  >
                    <MaterialIcons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.createProjectButtonText}>Create Project</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.projectsList}>
                {projects.slice(0, 3).map((project) => {
                  const hasExtraCharge = projectsWithExtraCharges.includes(project.id);
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      hasExtraCharge={hasExtraCharge}
                      getStatusColor={getStatusColor}
                      getStatusBgColor={getStatusBgColor}
                      navigation={navigation}
                    />
                  );
                })}
                
                {projects.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewMoreCard}
                    onPress={() => navigation.navigate('ProjectsList')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewMoreText}>+{projects.length - 3} more projects</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Projects List */}
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
          ) : null}
        </View>
      </Animated.ScrollView>

      <BottomNavigation navigation={navigation} activeRoute="CustomerHomeMain" scrollY={scrollY} />
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 16,
  },
  totalCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalCardGradient: {
    padding: 20,
  },
  totalCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalCardLeft: {
    flex: 1,
  },
  totalCardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  totalCardValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  totalCardSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  totalCardIcon: {
    opacity: 0.8,
  },
  smallCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  smallCardGradient: {
    padding: 16,
  },
  smallCardContent: {
    alignItems: 'flex-start',
  },
  smallCardIcon: {
    marginBottom: 12,
  },
  smallCardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  smallCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickActionsGrid: {
    gap: 8,
  },
  quickActionCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: colors.surface,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
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
    marginBottom: 12,
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  alertIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    flex: 1,
  },
  projectActions: {
    gap: 8,
  },
  actionButtonPrimary: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonSuccess: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonWarning: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonSecondary: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonGradientSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  statusInfoText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  // My Projects Preview Styles
  emptyProjectsCard: {
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
  emptyProjectsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyProjectsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  createProjectButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  createProjectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  createProjectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  projectsList: {
    gap: 12,
  },
  projectPreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  projectPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectPreviewInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectPreviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  projectPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectPreviewLocation: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  projectPreviewStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  projectPreviewStatusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  projectPreviewAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  projectPreviewAlertText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '500',
  },
  viewMoreCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  // Project Filters Styles
  projectFilters: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CustomerHomeScreen;