import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Animated,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useProjects } from '../hooks';
import { useAuth } from '../../../hooks/useAuth';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { projectsApi } from '../api';
import { visitsApi } from '../../visits/api';
import { theme } from '../../../theme/theme';
import { useTheme } from '../../../context/ThemeContext';
import {
  PrimaryButton,
  DangerButton,
  ProjectCard,
  LoadingState,
  EmptyState,
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';

const { width } = Dimensions.get('window');

const ProjectsListScreen = ({ navigation, route }) => {
  const { projects, loading, error, refetch } = useProjects();
  const { user } = useAuth();
  const { scrollY, onScroll } = useScrollPosition();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [deleting, setDeleting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Get filter from route params (from home screen)
  useEffect(() => {
    if (route.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route.params?.filter]);

  // Fetch visits for site_incharge users
  useEffect(() => {
    if (user?.role === 'site_incharge' && projects.length > 0) {
      fetchSiteVisits();
    }
  }, [user?.role, projects]);

  const fetchSiteVisits = async () => {
    if (user?.role !== 'site_incharge') return;
    
    try {
      setLoadingVisits(true);
      const allVisits = [];
      
      // Get all projects assigned to this site incharge
      for (const project of projects) {
        if (project.site_id === user.id) {
          try {
            const visitsResponse = await visitsApi.getVisitsByProject(project.id);
            if (visitsResponse.success) {
              const projectVisits = visitsResponse.data.visits
                .filter((visit) => visit.site_id === user.id)
                .map(visit => ({
                  ...visit,
                  project_id: project.id,
                  project_name: project.name
                }));
              allVisits.push(...projectVisits);
            }
          } catch (err) {
            console.error(`Error fetching visits for project ${project.id}:`, err);
          }
        }
      }
      
      console.log('Fetched visits for site incharge:', allVisits);
      setVisits(allVisits);
    } catch (error) {
      console.error('Error fetching site visits:', error);
    } finally {
      setLoadingVisits(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let result = [...projects];

    // Apply status filter
    if (selectedFilter === 'completed') {
      if (user?.role === 'site_incharge') {
        // For site incharge, show only completed projects assigned to them
        result = result.filter(p => 
          p.site_id === user.id && ['COMPLETED', 'CLOSED'].includes(p.status)
        );
      } else {
        // For other roles, show all completed projects
        result = result.filter(p => ['COMPLETED', 'CLOSED'].includes(p.status));
      }
    } else if (selectedFilter === 'active') {
      if (user?.role === 'site_incharge') {
        // For site incharge, show only active projects assigned to them
        result = result.filter(p => 
          p.site_id === user.id && !['COMPLETED', 'CLOSED'].includes(p.status)
        );
      } else {
        // For other roles, show all active projects
        result = result.filter(p => !['COMPLETED', 'CLOSED'].includes(p.status));
      }
    } else if (selectedFilter === 'pending_visits' && user?.role === 'site_incharge') {
      // Filter projects that have ANY scheduled visits for this site incharge
      const projectsWithScheduledVisits = visits
        .filter(visit => visit.status === 'scheduled')
        .map(visit => visit.project_id);
      
      result = result.filter(p => 
        p.site_id === user.id && projectsWithScheduledVisits.includes(p.id)
      );
    } else if (selectedFilter === 'today_visits' && user?.role === 'site_incharge') {
      // Filter projects that have visits scheduled for TODAY only
      const today = new Date().toDateString();
      
      const projectsWithTodayVisits = visits
        .filter(visit => {
          const visitDate = new Date(visit.visit_date).toDateString();
          return visit.status === 'scheduled' && visitDate === today;
        })
        .map(visit => visit.project_id);
      
      result = result.filter(p => 
        p.site_id === user.id && projectsWithTodayVisits.includes(p.id)
      );
    } else if (selectedFilter === 'ongoing_work' && user?.role === 'site_incharge') {
      // Filter projects assigned to this site incharge with WORK_STARTED status
      result = result.filter(p => 
        p.site_id === user.id && p.status === 'WORK_STARTED'
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((project) => 
        project.name.toLowerCase().includes(query) ||
        (project.location && project.location.toLowerCase().includes(query)) ||
        project.id.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      
      if (sortBy === 'newest') return dateB - dateA;
      if (sortBy === 'oldest') return dateA - dateB;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

    setFilteredProjects(result);
  }, [projects, selectedFilter, searchQuery, sortBy, visits, user?.id]);

  const handleDeleteProject = (project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(project.id);
              await projectsApi.deleteProject(project.id);
              Alert.alert('Success', 'Project deleted successfully');
              await refetch();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete project');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    const statusColors = {
      CREATED: '#6B7280',
      PM_ASSIGNED: '#3B82F6',
      VISIT_DONE: '#8B5CF6',
      REPORT_SUBMITTED: '#F59E0B',
      QUOTATION_GENERATED: '#F59E0B',
      CUSTOMER_APPROVED: '#10B981',
      ADVANCE_PENDING: '#F59E0B',
      ADVANCE_PAID: '#10B981',
      WORK_STARTED: '#3B82F6',
      COMPLETED: '#10B981',
      CLOSED: '#6B7280',
    };
    return statusColors[status] || '#6B7280';
  };

  const getCardBackgroundColor = (status) => {
    const color = getStatusColor(status);
    return `${color}29`; // Very light tint (about 2% opacity) - increased transparency
  };

  const getStatusBadgeStyle = (status) => ({
    backgroundColor: `${getStatusColor(status)}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  });

  const getStatusTextStyle = (status) => ({
    color: getStatusColor(status),
    fontSize: 12,
    fontWeight: '600',
  });

  const FilterChip = ({ label, value, icon }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedFilter === value && styles.filterChipActive,
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <FontAwesome5 
        name={icon} 
        size={12} 
        color={selectedFilter === value ? '#FFFFFF' : '#6B7280'} 
        style={styles.filterChipIcon}
      />
      <Text style={[
        styles.filterChipText,
        selectedFilter === value && styles.filterChipTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ProjectCardNew = ({ item }) => (
    <TouchableOpacity
      style={[styles.projectCard, { backgroundColor: getCardBackgroundColor(item.status) }]}
      onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id, project: item })}
      activeOpacity={0.7}
    >
      <View style={styles.projectCardHeader}>
        <View style={styles.projectTitleContainer}>
          <View style={[styles.projectIconContainer, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
            <FontAwesome5 name="hard-hat" size={18} color={getStatusColor(item.status)} />
          </View>
          <View style={styles.projectTitleContent}>
            <Text style={[styles.projectName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            <View style={styles.projectLocationContainer}>
              <MaterialIcons name="location-on" size={12} color="#9CA3AF" />
              <Text style={[styles.projectLocation, { color: colors.textSecondary }]} numberOfLines={1}>{item.location || 'No location'}</Text>
            </View>
          </View>
        </View>
        <View style={getStatusBadgeStyle(item.status)}>
          <Text style={getStatusTextStyle(item.status)}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.projectCardBody}>
        <View style={styles.projectMetaItem}>
          <FontAwesome5 name="calendar-alt" size={12} color="#9CA3AF" />
          <Text style={[styles.projectMetaText, { color: colors.textSecondary }]}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            }) : 'No date'}
          </Text>
        </View>
        <View style={styles.projectMetaItem}>
          <FontAwesome5 name="user-tie" size={12} color="#9CA3AF" />
          <Text style={[styles.projectMetaText, { color: colors.textSecondary }]}>
            {item.pm_name || 'Unassigned'}
          </Text>
        </View>
      </View>

      {isAdmin && (
        <View style={[styles.projectCardFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteProject(item)}
            disabled={deleting === item.id}
          >
            {deleting === item.id ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <FontAwesome5 name="trash" size={12} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.modalBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Sort & Filter</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>Sort By</Text>
          <View style={styles.sortOptions}>
            {[
              { label: 'Newest First', value: 'newest' },
              { label: 'Oldest First', value: 'oldest' },
              { label: 'Name (A-Z)', value: 'name-asc' },
              { label: 'Name (Z-A)', value: 'name-desc' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  { backgroundColor: colors.sectionBg, borderColor: colors.border },
                  sortBy === option.value && styles.sortOptionActive
                ]}
                onPress={() => setSortBy(option.value)}
              >
                <Text style={[
                  styles.sortOptionText,
                  { color: colors.textSecondary },
                  sortBy === option.value && styles.sortOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={18} color="#2563EB" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} title="Projects" />
        <LoadingState message="Loading projects..." />
        <BottomNavigation navigation={navigation} activeRoute="ProjectsList" scrollY={scrollY} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} title="Projects" />
        <View style={styles.errorContainer}>
          <View style={[styles.errorCard, { backgroundColor: colors.cardBg }]}>
            <FontAwesome5 name="exclamation-triangle" size={48} color="#EF4444" />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
            <PrimaryButton title="Retry" onPress={refetch} style={styles.retryButton} />
          </View>
        </View>
        <BottomNavigation navigation={navigation} activeRoute="ProjectsList" scrollY={scrollY} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppHeader navigation={navigation} title="Projects" />

      <View style={styles.content}>
        {/* Search and Filter Bar */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search projects..."
                placeholderTextColor={colors.placeholderText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="options-outline" size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterChipsContainer}>
          <FilterChip label="All" value="all" icon="clipboard-list" />
          <FilterChip label="Active" value="active" icon="play-circle" />
          <FilterChip label="Completed" value="completed" icon="check-circle" />
          {user?.role === 'site_incharge' && (
            <>
              <FilterChip label="Pending" value="pending_visits" icon="calendar-check" />
              <FilterChip label="Today" value="today_visits" icon="clock" />
              <FilterChip label="Ongoing" value="ongoing_work" icon="hard-hat" />
            </>
          )}
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} found
          </Text>
        </View>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon="clipboard-list"
            title={searchQuery ? 'No Results Found' : 'No Projects Yet'}
            message={searchQuery 
              ? `No projects match "${searchQuery}"` 
              : 'Get started by creating your first project'
            }
            actionLabel={!searchQuery && isAdmin ? 'Create Project' : undefined}
            onAction={!searchQuery && isAdmin ? () => navigation.navigate('CreateProject') : undefined}
          />
        ) : (
          <Animated.FlatList
            data={filteredProjects}
            renderItem={({ item }) => <ProjectCardNew item={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          />
        )}
      </View>

      <FilterModal />
      <BottomNavigation navigation={navigation} activeRoute="ProjectsList" scrollY={scrollY} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 0 : 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  projectCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  projectIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectTitleContent: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  projectLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  projectCardBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  projectMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  projectCardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
    paddingTop: 12,
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    minWidth: 120,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sortOptions: {
    gap: 8,
    marginBottom: 24,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sortOptionTextActive: {
    color: '#2563EB',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 'auto',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectsListScreen;