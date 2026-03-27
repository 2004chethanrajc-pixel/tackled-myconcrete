import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import StatusChip from './StatusChip';
import Card from './Card';
import { useTheme } from '../../context/ThemeContext';

const ProjectCard = ({ 
  project,
  onPress,
  showActions = false,
  actions = null,
  style = {},
}) => {
  const { colors } = useTheme();

  return (
    <Card variant="elevated" style={[styles.card, style]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{project.name}</Text>
            
            {project.location && (
              <View style={styles.meta}>
                <FontAwesome5 name="map-marker-alt" size={12} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{project.location}</Text>
              </View>
            )}
            
            {project.customer_name && (
              <View style={styles.meta}>
                <FontAwesome5 name="user" size={12} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{project.customer_name}</Text>
              </View>
            )}
            
            {project.pm_name && (
              <View style={styles.meta}>
                <FontAwesome5 name="user-tie" size={12} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>PM: {project.pm_name}</Text>
              </View>
            )}
          </View>
          
          {project.status && (
            <StatusChip
              status={project.status}
              size="small"
            />
          )}
        </View>
      </TouchableOpacity>
      
      {showActions && actions && (
        <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
          {actions}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  name: {
    ...theme.typography.h6,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xxs,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  actions: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});

export default ProjectCard;
