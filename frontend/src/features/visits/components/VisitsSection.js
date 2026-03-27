import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../../theme/theme';
import { useProjectVisits, useRejectVisit } from '../hooks';
import { Card, StatusChip, PrimaryButton, DangerButton, SecondaryButton } from '../../../components/common';
import { makeCall } from '../../../utils/contactUtils';
import { useTheme } from '../../../context/ThemeContext';

const VisitsSection = ({ projectId, userRole, userId, customerId, onRefresh }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDescription, setRejectionDescription] = useState('');
  const [errors, setErrors] = useState({});

  const { fetchVisits } = useProjectVisits(projectId);
  const { rejectVisit, loading: rejecting } = useRejectVisit();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    loadVisits();
  }, [projectId]);

  const loadVisits = async () => {
    try {
      setLoading(true);
      const fetchedVisits = await fetchVisits();
      setVisits(fetchedVisits || []);
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVisits();
    if (onRefresh) {
      await onRefresh();
    }
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

    console.log('=== VisitsSection - Rejecting Visit ===');
    console.log('Visit ID:', selectedVisit.id);
    console.log('Rejection Reason:', rejectionReason.trim());
    console.log('Rejection Description:', rejectionDescription.trim());
    console.log('Data object:', {
      rejectionReason: rejectionReason.trim(),
      rejectionDescription: rejectionDescription.trim(),
    });

    try {
      await rejectVisit(selectedVisit.id, {
        rejectionReason: rejectionReason.trim(),
        rejectionDescription: rejectionDescription.trim(),
      });

      Alert.alert('Success', 'Visit rejected successfully');
      setShowRejectModal(false);
      await loadVisits();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('=== VisitsSection - Reject Error ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      Alert.alert('Error', error.message || 'Failed to reject visit');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'scheduled':
        return 'warning';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return 'calendar-check';
      case 'completed':
        return 'check-circle';
      case 'rejected':
        return 'times-circle';
      default:
        return 'calendar';
    }
  };

  const canRejectVisit = (visit) => {
    if (visit.status !== 'scheduled') return false;
    
    if (userRole === 'site_incharge' && visit.site_id === userId) return true;
    if (userRole === 'customer' && customerId === userId) return true;
    if (userRole === 'admin' || userRole === 'super_admin') return true;
    
    return false;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  if (loading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading visits...</Text>
        </View>
      </Card>
    );
  }

  if (visits.length === 0) {
    return (
      <Card style={styles.container}>
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="calendar-times" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No visits scheduled yet</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="calendar-alt" size={20} color={colors.primary} />
        <Text style={styles.headerTitle}>Scheduled Visits</Text>
        
      </View>

      <ScrollView
        style={styles.visitsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {visits.map((visit) => (
          <Card key={visit.id} style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <StatusChip 
                label={visit.status.toUpperCase()} 
                variant={getStatusVariant(visit.status)}
                icon={getStatusIcon(visit.status)}
              />
            </View>

            <View style={styles.visitDetails}>
              <View style={styles.detailRow}>
                <FontAwesome5 name="calendar" size={16} color={colors.primary} />
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{formatDate(visit.visit_date)}</Text>
              </View>

              <View style={styles.detailRow}>
                <FontAwesome5 name="clock" size={16} color={colors.primary} />
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>{formatTime(visit.visit_time)}</Text>
              </View>

              {visit.customer_name && (
                <View style={styles.detailRow}>
                  <FontAwesome5 name="user" size={16} color={colors.primary} />
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{visit.customer_name}</Text>
                </View>
              )}

              {visit.customer_phone ? (
                <TouchableOpacity style={styles.detailRow} onPress={() => makeCall(visit.customer_phone)}>
                  <FontAwesome5 name="phone" size={16} color={colors.primary} />
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={[styles.detailValue, styles.linkText]}>{visit.customer_phone}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {visit.status === 'rejected' && (
              <View style={styles.rejectionInfo}>
                <Text style={styles.rejectionTitle}>❌ Rejection Details</Text>
                <Text style={styles.rejectionReason}>
                  Reason: {visit.rejection_reason || 'Not specified'}
                </Text>
                {visit.rejection_description && (
                  <Text style={styles.rejectionDescription}>
                    Description: {visit.rejection_description}
                  </Text>
                )}
                {visit.rejected_by_name && (
                  <Text style={styles.rejectedBy}>
                    Rejected by: {visit.rejected_by_name}
                  </Text>
                )}
                {visit.rejected_at && (
                  <Text style={styles.rejectedBy}>
                    Date: {new Date(visit.rejected_at).toLocaleString()}
                  </Text>
                )}
              </View>
            )}

            {canRejectVisit(visit) && (
              <DangerButton
                title="Reject Visit"
                onPress={() => handleRejectPress(visit)}
                icon="times-circle"
                style={{ marginTop: theme.spacing.md }}
              />
            )}
          </Card>
        ))}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Visit</Text>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                disabled={rejecting}
              >
                <FontAwesome5 name="times" size={24} color={colors.textSecondary} />
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
                  onChangeText={setRejectionReason}
                  placeholder="e.g., Not available (min 3 characters)"
                  placeholderTextColor={colors.textSecondary}
                  editable={!rejecting}
                />
                {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.textArea, errors.description && styles.inputError]}
                  value={rejectionDescription}
                  onChangeText={setRejectionDescription}
                  placeholder="Please provide detailed explanation (minimum 10 characters)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!rejecting}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setShowRejectModal(false)}
                disabled={rejecting}
                style={{ flex: 1 }}
              />

              <DangerButton
                title="Reject"
                onPress={handleRejectSubmit}
                disabled={rejecting}
                loading={rejecting}
                icon="times-circle"
                style={{ flex: 1, marginLeft: theme.spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h4,
    color: colors.textPrimary,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body2,
    color: colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body1,
    color: colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  visitCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  visitHeader: {
    marginBottom: theme.spacing.md,
  },
  visitDetails: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailLabel: {
    ...theme.typography.body2,
    color: colors.textSecondary,
    fontWeight: '600',
    minWidth: 70,
  },
  detailValue: {
    ...theme.typography.body2,
    color: colors.textPrimary,
    flex: 1,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  rejectionInfo: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: colors.errorLighter,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  rejectionTitle: {
    ...theme.typography.body1,
    fontWeight: '700',
    color: colors.error,
    marginBottom: theme.spacing.sm,
  },
  rejectionReason: {
    ...theme.typography.body2,
    color: colors.error,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  rejectionDescription: {
    ...theme.typography.body2,
    color: colors.error,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  rejectedBy: {
    ...theme.typography.caption,
    color: colors.error,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '100%',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...theme.typography.h4,
    color: colors.textPrimary,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  modalInfo: {
    ...theme.typography.body2,
    color: colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.body2,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    ...theme.inputs.default,
    ...theme.typography.body2,
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  textArea: {
    ...theme.inputs.default,
    ...theme.typography.body2,
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    ...theme.inputs.error,
  },
  errorText: {
    ...theme.typography.caption,
    color: colors.error,
    marginTop: theme.spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default VisitsSection;
