import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';

const Card = ({ 
  children, 
  variant = 'default', // 'default', 'elevated', 'flat'
  onPress = null,
  style = {},
}) => {
  const { colors } = useTheme();

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.cardBg },
    variant === 'elevated' && styles.elevated,
    variant === 'flat' && [styles.flat, { borderColor: colors.border }],
    style,
  ];
  
  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyle} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  elevated: {
    ...theme.shadows.md,
  },
  flat: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
  },
});

export default Card;
