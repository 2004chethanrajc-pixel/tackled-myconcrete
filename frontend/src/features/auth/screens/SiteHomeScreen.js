import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Platform,
  ImageBackground,
  Linking,
  Animated,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../hooks/useAuth';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { useSiteVisits } from '../../visits/useSiteVisits';
import { useRejectVisit, useCompleteVisit } from '../../visits/hooks';
import { useProjects } from '../../projects/hooks';
import {
  PrimaryButton,
  DangerButton,
  LoadingState,
  EmptyState,
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { useTheme } from '../../../context/ThemeContext';

let sharedStyles;

const SiteHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  sharedStyles = styles;
  const { visits, loading, error, refetch } = useSiteVisits(user?.id);
  const { projects, loading: loadingProjects } = useProjects();
  const { rejectVisit, loading: rejectingVisit } = useRejectVisit();
  const { completeVisit, loading: completingVisit } = useCompleteVisit();
  const { scrollY, onScroll } = useScrollPosition();

  const [refreshing, setRefreshing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDescription, setRejectionDescription] = useState('');
  const [errors, setErrors] = useState({});

  // Calculate stats
  const scheduledVisits = visits.filter(v => v.status === 'scheduled');
  const pendingVisits = [...new Set(scheduledVisits.map(v => v.project_id))].length; // Count unique projects
  
  const todayScheduledVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_date);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString() && v.status === 'scheduled';
  });
  const todayVisits = [...new Set(todayScheduledVisits.map(v => v.project_id))].length; // Count unique projects for today

  // Calculate ongoing work - projects assigned to this site incharge with WORK_STARTED status
  const ongoingWork = projects.filter(p => 
    p.site_id === user?.id && p.status === 'WORK_STARTED'
  ).length;

  // Calculate completed projects - projects assigned to this site incharge with COMPLETED or CLOSED status
  const completedProjects = projects.filter(p => 
    p.site_id === user?.id && (p.status === 'COMPLETED' || p.status === 'CLOSED')
  ).length;

  // Debug logging for stats
  console.log('=== SITE INCHARGE STATS DEBUG ===');
  console.log('User ID:', user?.id);
  console.log('Total projects:', projects.length);
  console.log('Pending visits:', pendingVisits);
  console.log('Today visits:', todayVisits);
  console.log('Ongoing work:', ongoingWork);
  console.log('Completed projects:', completedProjects);
  console.log('Projects assigned to user:', projects.filter(p => p.site_id === user?.id).length);

  // Get unique scheduled visits (one per project) - show the latest visit for each project
  const uniqueScheduledVisits = scheduledVisits.reduce((acc, visit) => {
    const existingVisit = acc.find(v => v.project_id === visit.project_id);
    if (!existingVisit) {
      acc.push(visit);
    } else {
      // Keep the latest visit for the project
      const existingDate = new Date(existingVisit.visit_date);
      const currentDate = new Date(visit.visit_date);
      if (currentDate > existingDate) {
        const index = acc.findIndex(v => v.project_id === visit.project_id);
        acc[index] = visit;
      }
    }
    return acc;
  }, []);

  // Sort visits by date (earliest first)
  const sortedUniqueVisits = uniqueScheduledVisits.sort((a, b) => {
    return new Date(a.visit_date) - new Date(b.visit_date);
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRejectPress = (visit) => {
    setSelectedVisit(visit);
    setRejectionReason('');
    setRejectionDescription('');
    setErrors({});
    setShowRejectModal(true);
  };

  const validateRejectForm = () => {
    const newErrors = {};
    
    if (!rejectionReason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (rejectionReason.trim().length < 3) {
      newErrors.reason = 'Reason must be at least 3 characters';
    }
    
    if (!rejectionDescription.trim()) {
      newErrors.description = 'Description is required';
    } else if (rejectionDescription.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRejectSubmit = async () => {
    if (!validateRejectForm()) {
      return;
    }

    try {
      await rejectVisit(selectedVisit.id, {
        rejectionReason: rejectionReason.trim(),
        rejectionDescription: rejectionDescription.trim(),
      });
      Alert.alert('Success', 'Visit rejected successfully');
      setShowRejectModal(false);
      setSelectedVisit(null);
      refetch();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reject visit');
    }
  };

  const handleCallCustomer = (visit) => {
    if (!visit.customer_phone) {
      Alert.alert('Error', 'Customer phone number not available');
      return;
    }

    const phoneNumber = visit.customer_phone.replace(/\D/g, '');
    
    Alert.alert(
      'Call Customer',
      `Call ${visit.customer_name || 'Customer'}?\n${visit.customer_phone}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
              Alert.alert('Error', 'Unable to open phone dialer');
            });
          },
        },
      ]
    );
  };

  const handleCompleteVisit = (visit) => {
    Alert.alert(
      'Complete Visit',
      'Are you sure you want to mark this visit as completed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeVisit(visit.id);
              Alert.alert('Success', 'Visit marked as completed successfully');
              refetch();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to complete visit');
            }
          },
        },
      ]
    );
  };

  const renderVisitCard = ({ item }) => {
    const visitDate = new Date(item.visit_date);
    const today = new Date();
    const isToday = visitDate.toDateString() === today.toDateString();
    const isTomorrow = visitDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let dateLabel = visitDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    
    if (isToday) {
      dateLabel = 'Today';
    } else if (isTomorrow) {
      dateLabel = 'Tomorrow';
    }

    return (
      <View style={styles.visitCardWrapper}>
        <LinearGradient
          colors={isToday ? ['#FEF3C7', '#FDE68A'] : ['#FFFFFF', '#F8FAFC']}
          style={styles.visitCard}
        >
          <View style={styles.visitHeader}>
            <View style={styles.visitInfo}>
              <Text style={styles.visitProjectName}>{item.project_name}</Text>
              <View style={styles.visitMeta}>
                <FontAwesome5 name="calendar" size={12} color="#9CA3AF" />
                <Text style={[styles.visitMetaText, isToday && { color: '#D97706', fontWeight: '600' }]}>
                  {dateLabel} • {item.visit_time || 'Time not set'}
                </Text>
              </View>
              <View style={styles.visitMeta}>
                <FontAwesome5 name="map-marker-alt" size={12} color="#9CA3AF" />
                <Text style={styles.visitMetaText}>
                  {item.project_location || 'Location not available'}
                </Text>
              </View>
              {item.customer_name && (
                <View style={styles.visitMeta}>
                  <FontAwesome5 name="user" size={12} color="#9CA3AF" />
                  <Text style={styles.visitMetaText}>{item.customer_name}</Text>
                </View>
              )}
              {item.customer_phone && (
                <View style={styles.visitMeta}>
                  <FontAwesome5 name="phone" size={12} color="#9CA3AF" />
                  <Text style={styles.visitMetaText}>{item.customer_phone}</Text>
                </View>
              )}
            </View>

            <View style={[styles.statusBadge, isToday && { backgroundColor: '#FEF3C7' }]}>
              <View style={[styles.statusDot, isToday && { backgroundColor: '#D97706' }]} />
              <Text style={[styles.statusText, isToday && { color: '#D97706' }]}>
                {isToday ? 'Today' : 'Scheduled'}
              </Text>
            </View>
          </View>

          <View style={styles.visitActions}>
            <DangerButton
              title="Reject"
              onPress={() => handleRejectPress(item)}
              icon={<FontAwesome5 name="times-circle" size={16} color="#FFFFFF" />}
              style={styles.rejectButton}
            />
            
            <PrimaryButton
              title="Visit Done"
              onPress={() => handleCompleteVisit(item)}
              loading={completingVisit}
              style={styles.completeButton}
            />
            
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallCustomer(item)}
            >
              <FontAwesome5 name="phone" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} />
        <LoadingState message="Loading visits..." />
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
        {/* Hero Section */}
        <ImageBackground
          source={require('../../../assets/background.png')}
          style={styles.heroContainer}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <View style={styles.welcomeBubble}>
                <Text style={styles.welcomeText}>Welcome, How Are You?</Text>
              </View>
              <Text style={styles.userName}>{user?.name}</Text>
              <View style={styles.userRoleBadge}>
                <FontAwesome5 name="hard-hat" size={14} color="#FFFFFF" />
                <Text style={styles.userRole}>Site Incharge</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.content}>
          {/* Overview Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <StatCard
                title="Pending Visits"
                value={pendingVisits}
                icon="calendar"
                color="#4361EE"
                gradientColors={['#4361EE', '#5B7CFF']}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'pending_visits' })}
              />
              <StatCard
                title="Today"
                value={todayVisits}
                icon="clock"
                color="#F59E0B"
                gradientColors={['#F59E0B', '#FBB13C']}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'today_visits' })}
              />
              <StatCard
                title="Ongoing Work"
                value={ongoingWork}
                icon="hard-hat"
                color="#10B981"
                gradientColors={['#10B981', '#34D399']}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'ongoing_work' })}
              />
              <StatCard
                title="Completed"
                value={completedProjects}
                icon="check-circle"
                color="#8B5CF6"
                gradientColors={['#8B5CF6', '#A78BFA']}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'completed' })}
              />
            </View>
          </View>

          {/* Visits List Section */}
          {error ? (
            <View style={styles.section}>
              <View style={styles.errorCard}>
                <FontAwesome5 name="exclamation-triangle" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </View>
          ) : sortedUniqueVisits.length === 0 ? (
            <View style={styles.section}>
              <EmptyState
                icon="calendar-alt"
                title="No Scheduled Visits"
                message="You have no upcoming site visits"
              />
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scheduled Visits</Text>
                <Text style={styles.projectCount}>{sortedUniqueVisits.length} project{sortedUniqueVisits.length !== 1 ? 's' : ''}</Text>
              </View>
              <FlatList
                data={sortedUniqueVisits}
                renderItem={renderVisitCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Reject Visit Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Visit</Text>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                disabled={rejectingVisit}
              >
                <FontAwesome5 name="times" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalInfo}>
                Please provide a reason and detailed description for rejecting this visit.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Reason *</Text>
                <TextInput
                  style={[styles.input, errors.reason && styles.inputError]}
                  value={rejectionReason}
                  onChangeText={(text) => {
                    setRejectionReason(text);
                    if (errors.reason) {
                      setErrors({ ...errors, reason: null });
                    }
                  }}
                  placeholder="e.g., Not available (min 3 characters)"
                  placeholderTextColor="#9CA3AF"
                  editable={!rejectingVisit}
                />
                {errors.reason && <Text style={styles.errorTextSmall}>{errors.reason}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.textArea, errors.description && styles.inputError]}
                  value={rejectionDescription}
                  onChangeText={(text) => {
                    setRejectionDescription(text);
                    if (errors.description) {
                      setErrors({ ...errors, description: null });
                    }
                  }}
                  placeholder="Please provide detailed explanation (minimum 10 characters)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!rejectingVisit}
                />
                {errors.description && <Text style={styles.errorTextSmall}>{errors.description}</Text>}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F3F4F6' }]}
                onPress={() => setShowRejectModal(false)}
                disabled={rejectingVisit}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <DangerButton
                title="Reject Visit"
                onPress={handleRejectSubmit}
                loading={rejectingVisit}
                icon={<FontAwesome5 name="times-circle" size={16} color="#FFFFFF" />}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavigation navigation={navigation} activeRoute="SiteHomeMain" scrollY={scrollY} />
    </View>
  );
};

const StatCard = ({ title, value, icon, color, gradientColors, onPress }) => {
  return (
    <TouchableOpacity style={sharedStyles.statCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={gradientColors || [color, color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={sharedStyles.statCardGradient}
      >
        <View style={sharedStyles.statCardContent}>
          <View style={sharedStyles.statLeftContent}>
            <Text style={sharedStyles.statValue}>{value}</Text>
            <Text style={sharedStyles.statTitle}>{title}</Text>
          </View>
          <View style={[sharedStyles.statIconContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <FontAwesome5 name={icon} size={18} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
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
  projectCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statCard: {
    width: '50%',
    padding: 4,
  },
  statCardGradient: {
    borderRadius: 12,
    padding: 12,
    height: 80,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  statCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statLeftContent: {
    flex: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
  visitCardWrapper: {
    marginBottom: 12,
  },
  visitCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  visitInfo: {
    flex: 1,
    marginRight: 12,
  },
  visitProjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  visitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  visitMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    backgroundColor: '#EFF6FF',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  visitActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 0,
    paddingHorizontal: 16,
  },
  completeButton: {
    flex: 1,
  },
  callButton: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 20,
    maxHeight: 420,
  },
  modalInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  textArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorTextSmall: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
  },
  modalCancelText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

export default SiteHomeScreen;
