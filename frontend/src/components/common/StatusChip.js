import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme, getStatusColor } from '../../theme/theme';

const StatusChip = ({ 
  status, 
  label = null,
  size = 'medium', // 'small', 'medium'
  style = {},
}) => {
  const statusColor = getStatusColor(status);
  const displayLabel = label || formatStatus(status);
  
  const chipStyle = [
    styles.chip,
    { backgroundColor: `${statusColor}15` },
    size === 'small' && styles.chipSmall,
    style,
  ];
  
  const textStyle = [
    styles.text,
    { color: statusColor },
    size === 'small' && styles.textSmall,
  ];
  
  return (
    <View style={chipStyle}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={textStyle}>{displayLabel}</Text>
    </View>
  );
};

const formatStatus = (status) => {
  const statusLabels = {
    // Project statuses
    CREATED: 'Created',
    PM_ASSIGNED: 'PM Assigned',
    SITE_ASSIGNED: 'Site Assigned',
    VISIT_SCHEDULED: 'Visit Scheduled',
    VISIT_DONE: 'Visit Done',
    REPORT_SUBMITTED: 'Report Submitted',
    CUSTOMER_APPROVED: 'Approved',
    ADVANCE_PAID: 'Advance Paid',
    WORK_STARTED: 'In Progress',
    COMPLETED: 'Completed',
    FINAL_PAID: 'Final Paid',
    CLOSED: 'Closed',
    
    // Payment statuses
    pending: 'Pending',
    completed: 'Completed',
    verified: 'Verified',
    
    // Visit statuses
    scheduled: 'Scheduled',
    rejected: 'Rejected',
  };
  
  return statusLabels[status] || status;
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    gap: 6,
    alignSelf: 'flex-start',
  },
  chipSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  textSmall: {
    fontSize: 10,
  },
});

export default StatusChip;
