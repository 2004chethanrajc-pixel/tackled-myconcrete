import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../theme/theme';

const DangerButton = ({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false,
  variant = 'contained', // 'contained', 'outlined'
  size = 'medium',
  fullWidth = false,
  icon = null,
  style = {},
  textStyle = {},
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (variant === 'contained') {
      baseStyle.push(styles.contained);
    } else if (variant === 'outlined') {
      baseStyle.push(styles.outlined);
    }
    
    if (size === 'small') {
      baseStyle.push(styles.small);
    } else if (size === 'large') {
      baseStyle.push(styles.large);
    }
    
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }
    
    return [...baseStyle, style];
  };
  
  const getTextStyle = () => {
    const baseStyle = [styles.textBase];
    
    if (variant === 'contained') {
      baseStyle.push(styles.textContained);
    } else {
      baseStyle.push(styles.textOutlined);
    }
    
    if (size === 'small') {
      baseStyle.push(styles.textSmall);
    }
    
    return [...baseStyle, textStyle];
  };
  
  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'contained' ? theme.colors.textWhite : theme.colors.error} 
        />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.sm,
    minHeight: 48,
    gap: 8,
  },
  contained: {
    backgroundColor: theme.colors.error,
    ...theme.shadows.sm,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  textContained: {
    color: theme.colors.textWhite,
  },
  textOutlined: {
    color: theme.colors.error,
  },
  textSmall: {
    fontSize: 14,
  },
});

export default DangerButton;
