import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const PrimaryButton = ({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false,
  variant = 'contained', // 'contained', 'outlined', 'text'
  color = 'primary', // 'primary', 'success', 'danger', 'warning'
  size = 'medium', // 'small', 'medium', 'large'
  fullWidth = false,
  icon = null,
  style = {},
  textStyle = {},
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    // Color variants
    const colorMap = {
      primary: theme.colors.primary,
      success: theme.colors.success,
      danger: theme.colors.error,
      warning: theme.colors.warning,
    };
    
    const buttonColor = colorMap[color] || theme.colors.primary;
    
    // Variant styles
    if (variant === 'contained') {
      baseStyle.push({ backgroundColor: buttonColor, ...theme.shadows.sm });
    } else if (variant === 'outlined') {
      baseStyle.push({ 
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: buttonColor,
      });
    } else if (variant === 'text') {
      baseStyle.push(styles.text);
    }
    
    // Size styles
    if (size === 'small') {
      baseStyle.push(styles.small);
    } else if (size === 'large') {
      baseStyle.push(styles.large);
    }
    
    // Full width
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }
    
    // Disabled
    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }
    
    return [...baseStyle, style];
  };
  
  const getTextColor = () => {
    const colorMap = {
      primary: theme.colors.primary,
      success: theme.colors.success,
      danger: theme.colors.error,
      warning: theme.colors.warning,
    };
    
    const buttonColor = colorMap[color] || theme.colors.primary;
    
    if (variant === 'contained') {
      return theme.colors.textWhite;
    }
    return buttonColor;
  };
  
  const getIconColor = () => {
    return getTextColor();
  };
  
  const getTextStyle = () => {
    const baseStyle = [
      styles.buttonText,
      { color: getTextColor() }
    ];
    
    if (size === 'small') {
      baseStyle.push(styles.textSmall);
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.textDisabled);
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
          color={getIconColor()} 
        />
      ) : (
        <>
          {icon && (
            typeof icon === 'string' ? (
              <FontAwesome5 
                name={icon} 
                size={size === 'small' ? 14 : 16} 
                color={getIconColor()} 
              />
            ) : icon
          )}
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
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 14,
  },
  textDisabled: {
    opacity: 0.6,
  },
});

export default PrimaryButton;
