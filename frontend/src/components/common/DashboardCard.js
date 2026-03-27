import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const DashboardCard = ({ title, count, icon, onPress, color = theme.colors.primary, bgColor }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: bgColor || theme.colors.primary,
        }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <FontAwesome5 name={icon} size={24} color={color} />
        </View>
      )}
      {count !== undefined && <Text style={styles.count}>{count}</Text>}
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  count: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
    color: theme.colors.textWhite,
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.textWhite,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DashboardCard;
