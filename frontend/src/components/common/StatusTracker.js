import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '../../theme/typography';
import { useTheme } from '../../context/ThemeContext';

const StatusTracker = ({ currentStatus, onStatusChange, userRole, projectData }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const statusFlow = [
    { key: 'CREATED', label: 'Created', allowedRoles: ['admin', 'super_admin'] },
    { key: 'PM_ASSIGNED', label: 'PM Assigned', allowedRoles: ['admin', 'super_admin'] },
    { key: 'VISIT_DONE', label: 'Visit Done', allowedRoles: ['project_manager'] },
    { key: 'REPORT_SUBMITTED', label: 'Report Submitted', allowedRoles: ['site_incharge'] },
    { key: 'QUOTATION_GENERATED', label: 'Quotation Generated', allowedRoles: ['finance'] },
    { key: 'CUSTOMER_APPROVED', label: 'Customer Approved', allowedRoles: ['customer'] },
    { key: 'ADVANCE_PENDING', label: 'Advance Pending', allowedRoles: ['customer'] },
    { key: 'ADVANCE_PAID', label: 'Advance Paid', allowedRoles: ['finance'] },
    { key: 'WORK_STARTED', label: 'Work Started', allowedRoles: ['site_incharge'] },
    { key: 'COMPLETED', label: 'Completed', allowedRoles: ['site_incharge'] },
    { key: 'CLOSED', label: 'Closed', allowedRoles: ['finance'] },
  ];

  const currentIndex = statusFlow.findIndex(s => s.key === currentStatus);

  const getStatusColor = (status, index) => {
    if (index < currentIndex) return colors.success; // Completed
    if (index === currentIndex) return colors.primary; // Current
    return colors.border; // Upcoming
  };

  const canChangeStatus = (status) => {
    const statusConfig = statusFlow.find(s => s.key === status.key);
    if (!statusConfig) return false;
    
    // Check if user role is allowed
    if (!statusConfig.allowedRoles.includes(userRole)) return false;
    
    // Can only move to next status
    const statusIndex = statusFlow.findIndex(s => s.key === status.key);
    return statusIndex === currentIndex + 1;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Project Status</Text>
      <View style={styles.timeline}>
        {statusFlow.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isNext = index === currentIndex + 1;
          const canChange = canChangeStatus(status);

          return (
            <View key={status.key} style={styles.statusItem}>
              <View style={styles.statusLine}>
                {index > 0 && (
                  <View
                    style={[
                      styles.line,
                      { backgroundColor: isCompleted ? colors.success : colors.border }
                    ]}
                  />
                )}
                <TouchableOpacity
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(status, index) },
                    isCurrent && styles.currentDot,
                  ]}
                  onPress={() => canChange && onStatusChange && onStatusChange(status.key)}
                  disabled={!canChange}
                >
                  {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              </View>
              <View style={styles.statusLabel}>
                <Text
                  style={[
                    styles.statusText,
                    isCurrent && styles.currentText,
                    isCompleted && styles.completedText,
                  ]}
                >
                  {status.label}
                </Text>
                {canChange && (
                  <Text style={styles.actionHint}>Tap to update</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  statusItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statusLine: {
    alignItems: 'center',
    marginRight: 12,
  },
  line: {
    width: 2,
    height: 20,
    position: 'absolute',
    top: -20,
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusLabel: {
    flex: 1,
    justifyContent: 'center',
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  currentText: {
    color: colors.primary,
    fontWeight: '600',
  },
  completedText: {
    color: colors.success,
  },
  actionHint: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
});

export default StatusTracker;
