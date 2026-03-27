import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuditLogs } from '../hooks';
import { theme } from '../../../theme/theme';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { Card, EmptyState } from '../../../components/common';
import { useTheme } from '../../../context/ThemeContext';

const AuditLogsScreen = ({ navigation, route }) => {
  const { role } = route.params || {};
  const [currentPage, setCurrentPage] = useState(1);
  const [allLogs, setAllLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showLoginLogs, setShowLoginLogs] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  const { logs, pagination, loading, error, refetch } = useAuditLogs(50, currentPage, !showLoginLogs);

  // Update allLogs when new data comes in
  React.useEffect(() => {
    if (logs && logs.length > 0) {
      if (currentPage === 1) {
        // First page or refresh - replace all logs
        setAllLogs(logs);
      } else {
        // Subsequent pages - append to existing logs
        setAllLogs(prevLogs => [...prevLogs, ...logs]);
      }
    }
  }, [logs, currentPage]);

  // Filter by role if provided
  const filteredLogs = role
    ? allLogs.filter((log) => log.performed_by_role === role)
    : allLogs;

  const getActionColor = (action) => {
    if (action.includes('CREATE') || action.includes('ACTIVATE')) return colors.success;
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) return colors.error;
    if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('ASSIGN')) return colors.warning;
    if (action.includes('LOGIN')) return colors.info;
    if (action.includes('SCHEDULE') || action.includes('VISIT')) return colors.primary;
    if (action.includes('SHARED') || action.includes('EXPORT')) return '#8B5CF6';
    return colors.textSecondary;
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return 'plus-circle';
    if (action.includes('DELETE')) return 'trash';
    if (action.includes('DEACTIVATE')) return 'user-slash';
    if (action.includes('ACTIVATE')) return 'user-check';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'edit';
    if (action.includes('LOGIN')) return 'sign-in-alt';
    if (action.includes('ASSIGN')) return 'user-plus';
    if (action.includes('SCHEDULE')) return 'calendar-plus';
    if (action.includes('VISIT')) return 'map-marker-alt';
    if (action.includes('SHARED') || action.includes('EXPORT')) return 'share-alt';
    return 'info-circle';
  };

  const formatActionText = (action) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setAllLogs([]);
    try {
      await refetch();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh audit logs');
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (pagination && pagination.hasNextPage && !loadingMore && !loading) {
      setLoadingMore(true);
      setCurrentPage(prevPage => prevPage + 1);
    }
  }, [pagination, loadingMore, loading]);

  // Reset loadingMore when new data arrives
  React.useEffect(() => {
    if (!loading) {
      setLoadingMore(false);
    }
  }, [loading]);

  const renderLogItem = ({ item }) => (
    <Card variant="elevated" style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.actionContainer}>
          <View style={[styles.actionIcon, { backgroundColor: `${getActionColor(item.action)}20` }]}>
            <FontAwesome5 
              name={getActionIcon(item.action)} 
              size={16} 
              color={getActionColor(item.action)} 
            />
          </View>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>{formatActionText(item.action)}</Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.description, { color: colors.textPrimary }]}>{item.description}</Text>
      
      <View style={[styles.userInfo, { borderTopColor: colors.divider }]}>
        <View style={styles.userDetails}>
          <FontAwesome5 name="user" size={12} color={colors.textSecondary} />
          <Text style={[styles.userName, { color: colors.textSecondary }]}>{item.performed_by_name || 'System'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: `${getActionColor(item.action)}15` }]}>
            <Text style={[styles.roleText, { color: getActionColor(item.action) }]}>
              {item.performed_by_role?.replace('_', ' ').toUpperCase() || 'SYSTEM'}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderLoadMoreButton = () => {
    if (!pagination || !pagination.hasNextPage) return null;

    return (
      <TouchableOpacity 
        style={styles.loadMoreButton} 
        onPress={loadMore}
        disabled={loadingMore}
      >
        {loadingMore ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <FontAwesome5 name="chevron-down" size={16} color={colors.primary} />
            <Text style={styles.loadMoreText}>Load More Logs</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      {renderLoadMoreButton()}
      {pagination && (
        <Text style={styles.paginationInfo}>
          Showing {filteredLogs.length} of {pagination.totalRecords} logs
          {pagination.totalPages > 1 && ` (Page ${pagination.currentPage} of ${pagination.totalPages})`}
        </Text>
      )}
    </View>
  );

  if (loading && currentPage === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading audit logs...</Text>
        </View>
      </View>
    );
  }

  if (error && currentPage === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} />
        <View style={styles.centerContainer}>
          <EmptyState
            icon="exclamation-triangle"
            title="Error Loading Logs"
            message={error}
          />
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader navigation={navigation} />
      
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {role ? `${role.replace('_', ' ').toUpperCase()} Activities` : 'All System Activities'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} found
            {!showLoginLogs && ' (Login logs hidden)'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.toggleButton, showLoginLogs && styles.toggleButtonActive]} 
            onPress={() => {
              setShowLoginLogs(!showLoginLogs);
              setCurrentPage(1);
              setAllLogs([]);
            }}
          >
            <FontAwesome5 
              name={showLoginLogs ? "eye-slash" : "eye"} 
              size={14} 
              color={showLoginLogs ? colors.textWhite : colors.primary} 
            />
            <Text style={[styles.toggleButtonText, showLoginLogs && styles.toggleButtonTextActive]}>
              {showLoginLogs ? 'Hide' : 'Show'} Logins
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <FontAwesome5 name="sync-alt" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {filteredLogs.length === 0 ? (
        <EmptyState
          icon="clipboard-list"
          title="No Audit Logs"
          message={role ? `No activities found for ${role.replace('_', ' ')} role` : "No system activities recorded yet"}
        />
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            />
          }
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BottomNavigation navigation={navigation} activeRoute="AuditLogs" />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h6,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    ...theme.typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  toggleButtonTextActive: {
    color: colors.textWhite,
  },
  refreshButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  logCard: {
    marginBottom: theme.spacing.md,
  },
  logHeader: {
    marginBottom: theme.spacing.sm,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  actionInfo: {
    flex: 1,
  },
  actionText: {
    ...theme.typography.body2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timeText: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  description: {
    ...theme.typography.body1,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  userInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: theme.spacing.sm,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  userName: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  roleText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  loadMoreText: {
    ...theme.typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  paginationInfo: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.body1,
    color: colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  retryButtonText: {
    ...theme.typography.body2,
    color: colors.textWhite,
    fontWeight: '600',
  },
});

export default AuditLogsScreen;
