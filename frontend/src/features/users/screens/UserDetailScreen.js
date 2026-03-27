import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../../theme/theme';
import { EmptyState } from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { makeCall, sendEmail } from '../../../utils/contactUtils';
import { useTheme } from '../../../context/ThemeContext';

const UserDetailScreen = ({ route, navigation }) => {
  const { user } = route.params || {};
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // Handle case where user is not provided
  if (!user) {
    return (
      <View style={styles.container}>
        <AppHeader navigation={navigation} />
        <EmptyState
          icon="user-times"
          title="User Not Found"
          message="Unable to load user details. Please try again."
        />
        <BottomNavigation navigation={navigation} activeRoute="UsersList" />
      </View>
    );
  }

  const DetailRow = ({ label, value, valueColor, onPress }) => (
    <TouchableOpacity style={[styles.detailRow, { borderBottomColor: colors.border }]} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.textPrimary }, valueColor && { color: valueColor }, onPress && styles.linkValue]}>
          {value || 'N/A'}
        </Text>
        {onPress ? <FontAwesome5 name={label === 'Phone' ? 'phone' : 'envelope'} size={13} color={theme.colors.primary} style={{ marginLeft: 6 }} /> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader navigation={navigation} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, borderBottomColor: colors.border }]}>User Information</Text>
          
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Email" value={user.email} onPress={user.email ? () => sendEmail(user.email) : null} />
          <DetailRow label="Phone" value={user.phone} onPress={user.phone ? () => makeCall(user.phone) : null} />
          <DetailRow 
            label="Role" 
            value={user.role ? user.role.replace('_', ' ').toUpperCase() : 'N/A'} 
          />
          <DetailRow 
            label="Status" 
            value={user.is_active ? 'Active' : 'Inactive'}
            valueColor={user.is_active ? theme.colors.success : theme.colors.error}
          />
          <DetailRow 
            label="Created At" 
            value={user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'} 
          />
          <DetailRow label="User ID" value={user.id ? user.id.toString() : 'N/A'} />
        </View>
      </ScrollView>
      
      <BottomNavigation navigation={navigation} activeRoute="UsersList" />
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
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardTitle: {
    ...theme.typography.h4,
    color: colors.textPrimary,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    ...theme.typography.body2,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    ...theme.typography.body2,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  valueRow: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  linkValue: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default UserDetailScreen;
