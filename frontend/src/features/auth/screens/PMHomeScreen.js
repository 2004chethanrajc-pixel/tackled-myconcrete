import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ImageBackground, Animated, TouchableOpacity, StatusBar } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../hooks/useAuth';
import { useProjects } from '../../projects/hooks';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { theme } from '../../../theme/theme';
import { useTheme } from '../../../context/ThemeContext';
import {
  PrimaryButton,
  SecondaryButton,
  ProjectCard,
  LoadingState,
  EmptyState,
} from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';

let sharedStyles;

const PMHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { projects, loading, error } = useProjects();
  const { scrollY, onScroll } = useScrollPosition();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  sharedStyles = styles;

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => 
    !['CLOSED', 'COMPLETED'].includes(p.status)
  ).length;
  const completedProjects = projects.filter(p => 
    p.status === 'COMPLETED' || p.status === 'CLOSED'
  ).length;
  const pendingReports = projects.filter(p => 
    p.status === 'VISIT_DONE'
  ).length;

  const projectsWithQuotations = projects.filter(p => 
    ['QUOTATION_GENERATED', 'CUSTOMER_APPROVED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'WORK_STARTED', 'COMPLETED', 'CLOSED'].includes(p.status)
  );

  const otherProjects = projects.filter(p => 
    !['QUOTATION_GENERATED', 'CUSTOMER_APPROVED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'WORK_STARTED', 'COMPLETED', 'CLOSED'].includes(p.status)
  );

  if (loading) {
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
      >
        <ImageBackground
          source={require('../../../assets/pm-background.png')}
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
                <FontAwesome5 name="user-tie" size={14} color="#FFFFFF" />
                <Text style={styles.userRole}>Project Manager</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
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
                gradientColors={['#4361EE', '#5B7CFF']}
                onPress={() => navigation.navigate('ProjectsList')}
              />
              <StatCard
                title="Active"
                value={activeProjects}
                icon="sync"
                color="#F59E0B"
                gradientColors={['#F59E0B', '#FBB13C']}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'active' })}
              />
              <StatCard
                title="Completed"
                value={completedProjects}
                icon="check-circle"
                color="#10B981"
                gradientColors={['#10B981', '#34D399']}
                onPress={() => navigation.navigate('ProjectsList', { filter: 'completed' })}
              />
              <StatCard
                title="Pending Reports"
                value={pendingReports}
                icon="file-alt"
                color="#EF4444"
                gradientColors={['#EF4444', '#F87171']}
                onPress={() => navigation.navigate('ReportsList')}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.section}>
              <EmptyState
                icon="exclamation-triangle"
                title="Error"
                message={error}
              />
            </View>
          ) : (
            <>
              {projectsWithQuotations.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Projects with Quotations</Text>
                    <Text style={[styles.projectCount, { color: colors.textSecondary }]}>{projectsWithQuotations.length} total</Text>
                  </View>
                  {projectsWithQuotations.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id, project })}
                      showActions
                      actions={
                        <PrimaryButton
                          title="View Quotation"
                          onPress={() => navigation.navigate('ViewQuotation', { projectId: project.id })}
                          size="small"
                          fullWidth
                        />
                      }
                    />
                  ))}
                </View>
              )}

              {otherProjects.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Other Projects</Text>
                    <Text style={[styles.projectCount, { color: colors.textSecondary }]}>{otherProjects.length} total</Text>
                  </View>
                  {otherProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id, project })}
                    />
                  ))}
                </View>
              )}

              {projects.length === 0 && (
                <View style={styles.section}>
                  <EmptyState
                    icon="clipboard-list"
                    title="No Projects"
                    message="No projects assigned yet"
                  />
                </View>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>

      <BottomNavigation navigation={navigation} activeRoute="PMHomeMain" scrollY={scrollY} />
    </View>
  );
};

const StatCard = ({ title, value, icon, color, gradientColors, onPress }) => {
  return (
    <TouchableOpacity
      style={sharedStyles.statCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
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
            <FontAwesome5 name={icon} size={22} color="#FFFFFF" />
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
});

export default PMHomeScreen;
