import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
 StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { 
  FadeInDown,
} from 'react-native-reanimated';
import { reportsApi } from '../api';
import { theme } from '../../../theme/theme';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import {
  Card,
  StatusChip,
  LoadingState,
  EmptyState,
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';

const { width } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const ReportsListScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { scrollY, onScroll } = useScrollPosition();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  useFocusEffect(
    React.useCallback(() => {
      fetchReports();
    }, [])
  );

  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log('=== REPORTS LIST DEBUG ===');
      console.log('User role:', user?.role);
      console.log('User ID:', user?.id);
      
      const response = await reportsApi.getAllReports();
      console.log('Reports API response:', response);
      
      setReports(response.data.reports || []);
      console.log('Reports loaded:', response.data.reports?.length || 0);
    } catch (error) {
      console.error('Error fetching reports:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleViewReport = (report) => {
    navigation.navigate('ViewReport', {
      reportId: report.id,
      projectId: report.project_id,
    });
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'on_hold': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return 'check-circle';
      case 'rejected': return 'close-circle';
      case 'pending': return 'clock-outline';
      case 'completed': return 'check-circle';
      case 'in_progress': return 'progress-clock';
      case 'on_hold': return 'pause-circle-outline';
      default: return 'file-document-outline';
    }
  };

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

  const ReportCard = ({ item, index }) => {
    const statusColor = getStatusColor(item.project_status);
    const statusIcon = getStatusIcon(item.project_status);

    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 100).duration(400)}
        style={styles.cardWrapper}
      >
        <TouchableOpacity
          onPress={() => handleViewReport(item)}
          activeOpacity={0.7}
          style={[styles.cardTouchable, { backgroundColor: colors.cardBg }]}
        >
          <LinearGradient
            colors={[colors.cardBg, colors.surfaceSecondary]}
            style={styles.reportCard}
          >
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <MaterialCommunityIcons name={statusIcon} size={12} color={statusColor} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {item.project_status || 'Pending'}
              </Text>
            </View>

            {/* Header with Project Name */}
            <View style={styles.cardHeader}>
              <View style={styles.projectIconContainer}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.projectIcon}
                >
                  <MaterialCommunityIcons name="file-document" size={22} color="#FFF" />
                </LinearGradient>
              </View>
              
              <View style={styles.projectInfo}>
                <Text style={[styles.projectName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.project_name}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="calendar" size={14} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
            </View>

            {/* Additional Info Chips */}
            <View style={styles.chipsContainer}>
              {item.pm_name && (
                <View style={[styles.chip, { backgroundColor: colors.sectionBg }]}>
                  <MaterialCommunityIcons name="account-tie" size={12} color="#3B82F6" />
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>{item.pm_name}</Text>
                </View>
              )}
              
              {item.total_floors && (
                <View style={[styles.chip, { backgroundColor: colors.sectionBg }]}>
                  <MaterialCommunityIcons name="layers" size={12} color="#3B82F6" />
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>{item.total_floors} floors</Text>
                </View>
              )}

              {item.images?.length > 0 && (
                <View style={[styles.chip, { backgroundColor: colors.sectionBg }]}>
                  <MaterialCommunityIcons name="image" size={12} color="#3B82F6" />
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>{item.images.length} images</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AppHeader navigation={navigation} />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader navigation={navigation} />

      {/* Simple Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {user?.role === 'site_incharge' ? 'My Reports' : 'Reports'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {reports.length} {reports.length === 1 ? 'report' : 'reports'} 
            {user?.role === 'site_incharge' ? ' created by you' : ' available'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {reports.length === 0 ? (
          <EmptyState
            icon="file-document-outline"
            title="No Reports"
            message={
              user?.role === 'site_incharge' 
                ? "You haven't submitted any reports yet" 
                : "No reports have been submitted yet"
            }
          />
        ) : (
          <AnimatedFlatList
            data={reports}
            renderItem={({ item, index }) => (
              <ReportCard item={item} index={index} />
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

      <BottomNavigation navigation={navigation} activeRoute="ReportsList" scrollY={scrollY} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  cardTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportCard: {
    padding: 16,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 70,
  },
  projectIconContainer: {
    marginRight: 12,
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  chipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default ReportsListScreen;