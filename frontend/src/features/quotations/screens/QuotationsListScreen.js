import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown,
  Layout 
} from 'react-native-reanimated';
import { theme, formatCurrency } from '../../../theme/theme';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import {
  Card,
  StatusChip,
  LoadingState,
  EmptyState,
} from '../../../components/common';
import { quotationsApi } from '../api';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';

const { width } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const QuotationsListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { scrollY, onScroll } = useScrollPosition();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuotations();
    setRefreshing(false);
  };

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      
      const { projectsApi } = await import('../../projects/api');
      
      const projectsResponse = await projectsApi.getAllProjects();
      const projects = projectsResponse.data.projects;
      
      const allQuotations = [];
      for (const project of projects) {
        try {
          const quotationResponse = await quotationsApi.getQuotationsByProject(project.id);
          const projectQuotations = quotationResponse.data.quotations || [];
          
          const quotationsWithProjectName = projectQuotations.map(q => ({
            ...q,
            // Only add missing fields, don't override project_status from quotation response
            customer_name: project.customer_name || 'Customer',
          }));
          
          allQuotations.push(...quotationsWithProjectName);
        } catch (err) {
          console.log(`No quotations for project ${project.id}`);
        }
      }
      
      allQuotations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setQuotations(allQuotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      Alert.alert('Error', 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: 'clock-outline',
      approved: 'check-circle',
      rejected: 'close-circle',
      generated: 'file-document-outline',
    };
    return icons[status?.toLowerCase()] || 'file-document-outline';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      approved: '#10B981',
      rejected: '#EF4444',
      generated: '#3B82F6',
    };
    return colors[status?.toLowerCase()] || '#6B7280';
  };

  const getStatusGradient = (status) => {
    const gradients = {
      pending: ['#F59E0B', '#FBBF24'],
      approved: ['#10B981', '#34D399'],
      rejected: ['#EF4444', '#F87171'],
      generated: ['#3B82F6', '#60A5FA'],
    };
    return gradients[status?.toLowerCase()] || ['#6B7280', '#9CA3AF'];
  };

  const getProjectStatusColor = (status) => {
    const colors = {
      'pending': '#F59E0B',
      'in_progress': '#3B82F6', 
      'completed': '#10B981',
      'on_hold': '#F59E0B',
      'cancelled': '#EF4444',
      'closed': '#6B7280',
    };
    return colors[status?.toLowerCase()] || '#6B7280';
  };

  const getProjectStatusText = (status) => {
    const statusTexts = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed', 
      'on_hold': 'On Hold',
      'cancelled': 'Cancelled',
      'closed': 'Closed',
    };
    return statusTexts[status?.toLowerCase()] || status || 'Unknown';
  };

  const QuotationCard = ({ item, index }) => {
    const statusGradient = getStatusGradient(item.status);
    const statusIcon = getStatusIcon(item.status);
    
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-IN', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    };

    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(400)}
        layout={Layout.springify()}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('ViewQuotation', { 
            projectId: item.project_id,
            quotationId: item.id 
          })}
          activeOpacity={0.7}
          style={styles.cardTouchable}
        >
          <LinearGradient
            colors={[colors.cardBg, colors.surfaceSecondary]}
            style={styles.quotationCard}
          >
            {/* Status Badge */}
            <LinearGradient
              colors={statusGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadge}
            >
              <MaterialCommunityIcons name={statusIcon} size={12} color="#FFF" />
              <Text style={styles.statusBadgeText}>
                {item.status || 'Pending'}
              </Text>
            </LinearGradient>

            {/* Project Info */}
            <View style={styles.cardHeader}>
              <View style={styles.projectIconContainer}>
                <LinearGradient
                  colors={['#3B82F6', '#1E3A8A']}
                  style={styles.projectIcon}
                >
                  <MaterialCommunityIcons name="office-building" size={24} color="#FFF" />
                </LinearGradient>
              </View>
              
              <View style={styles.projectInfo}>
                <Text style={[styles.projectName, { color: colors.textPrimary }]}>{item.project_name}</Text>
                <View style={styles.locationContainer}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#94A3B8" />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>{item.project_location}</Text>
                </View>
                {/* Project Status */}
                {item.project_status && (
                  <View style={styles.projectStatusContainer}>
                    <View style={[
                      styles.projectStatusBadge, 
                      { backgroundColor: getProjectStatusColor(item.project_status) }
                    ]}>
                      <Text style={styles.projectStatusText}>
                        {getProjectStatusText(item.project_status)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Amount and Date */}
            <View style={[styles.detailsContainer, { backgroundColor: colors.sectionBg }]}>
              <View style={styles.amountContainer}>
                <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Total Amount</Text>
                <View style={styles.amountRow}>
                  <MaterialCommunityIcons name="currency-inr" size={20} color="#3B82F6" />
                  <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
                    {formatCurrency(item.total_cost).replace('₹', '')}
                  </Text>
                </View>
              </View>

              <View style={[styles.dateContainer, { backgroundColor: colors.cardBg }]}>
                <MaterialCommunityIcons name="calendar" size={14} color="#94A3B8" />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => navigation.navigate('ViewQuotation', { 
                projectId: item.project_id,
                quotationId: item.id 
              })}
            >
              <LinearGradient
                colors={['#3B82F6', '#1E3A8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewButtonGradient}
              >
                <Text style={styles.viewButtonText}>View Details</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Decorative Elements */}
            <View style={styles.cardDecoration1} />
            <View style={styles.cardDecoration2} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <AppHeader navigation={navigation} />
        <LoadingState message="Loading quotations..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader navigation={navigation} />

      {/* Header Gradient - Lighter Navy Blue */}
      <LinearGradient
        colors={['#3B82F6', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Quotations</Text>
            <Text style={styles.headerSubtitle}>
              {quotations.length} {quotations.length === 1 ? 'quotation' : 'quotations'} total
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {quotations.length === 0 ? (
          <View style={styles.emptyStateWrapper}>
            <EmptyState
              icon="rupee-sign"
              title="No Quotations"
              message="No quotations have been generated yet"
            />
          </View>
        ) : (
          <AnimatedFlatList
            data={quotations}
            renderItem={({ item, index }) => (
              <QuotationCard item={item} index={index} />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          />
        )}
      </View>

      <BottomNavigation navigation={navigation} activeRoute="QuotationsList" scrollY={scrollY} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTouchable: {
    marginBottom: 16,
  },
  quotationCard: {
    borderRadius: 24,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    zIndex: 2,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectIconContainer: {
    marginRight: 12,
  },
  projectIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
  },
  projectStatusContainer: {
    marginTop: 6,
  },
  projectStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  projectStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  viewButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  cardDecoration1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    zIndex: 1,
  },
  cardDecoration2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(30, 58, 138, 0.03)',
    zIndex: 1,
  },
});

export default QuotationsListScreen;