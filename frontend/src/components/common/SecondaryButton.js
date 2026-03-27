import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../../theme/theme';

const SecondaryButton = ({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false,
  variant = 'outlined', // 'contained', 'outlined', 'text'
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
    } else if (variant === 'text') {
      baseStyle.push(styles.text);
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
          color={variant === 'contained' ? theme.colors.textWhite : theme.colors.textSecondary} 
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
    backgroundColor: theme.colors.textSecondary,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  text: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
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
    color: theme.colors.textSecondary,
  },
  textSmall: {
    fontSize: 14,
  },
});

export default SecondaryButton;
