// Modern Design System for React Native Mobile App
// High-end UX with Material Design principles

export const theme = {
  // Brand Colors
  colors: {
    // Primary Brand Color
    primary: '#0057b3',
    primaryLight: 'rgba(0, 87, 179, 0.1)',
    primaryDark: '#003d7d',
    
    // Secondary/Destructive Color
    secondary: '#d23229',
    secondaryLight: 'rgba(210, 50, 41, 0.1)',
    secondaryDark: '#93231c',
    
    // Background Colors
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceLight: '#FAFBFC',
    surfaceElevated: '#FFFFFF',
    
    // Text Colors
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textLight: '#999999',
    textWhite: '#FFFFFF',
    textDisabled: '#BDBDBD',
    
    // Status Colors
    success: '#4CAF50',
    successLight: 'rgba(76, 175, 80, 0.1)',
    successDark: '#388E3C',
    warning: '#FF9800',
    warningLight: 'rgba(255, 152, 0, 0.1)',
    error: '#d23229',
    errorLight: 'rgba(210, 50, 41, 0.1)',
    errorLighter: 'rgba(210, 50, 41, 0.05)',
    info: '#2196F3',
    infoLight: 'rgba(33, 150, 243, 0.1)',
    
    // UI Colors
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    borderDark: '#BDBDBD',
    disabled: '#BDBDBD',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    
    // Card Colors (for dashboard)
    cardBlue: '#0057b3',
    cardGreen: '#4CAF50',
    cardOrange: '#FF9800',
    cardRed: '#d23229',
    cardPurple: '#9C27B0',
    cardTeal: '#009688',
    cardIndigo: '#3F51B5',
    cardPink: '#E91E63',
  },
  
  // Spacing (8px scale) - Modern spacing system
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    xxxl: 48,
  },
  
  // Typography - Modern type scale
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 36,
      letterSpacing: -0.5,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
      letterSpacing: 0,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
      letterSpacing: 0,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: 0,
    },
    h6: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      letterSpacing: 0,
    },
    body1: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      letterSpacing: 0.15,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0.4,
    },
    overline: {
      fontSize: 10,
      fontWeight: '500',
      lineHeight: 16,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: 0.5,
    },
  },
  
  // Border Radius - Modern rounded corners
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 999,
  },
  
  // Shadows - Elevation system
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 12,
    },
  },
  
  // Button Styles - Modern button system
  buttons: {
    primary: {
      contained: {
        backgroundColor: '#0057b3',
        color: '#FFFFFF', 
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minHeight: 48,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#0057b3',
        borderWidth: 1.5,
        color: '#0057b3',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minHeight: 48,
      },
      text: {
        backgroundColor: 'transparent',
        color: '#0057b3',
        paddingVertical: 8,
        paddingHorizontal: 16,
      },
    },
    secondary: {
      contained: {
        backgroundColor: '#666666',
        color: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minHeight: 48,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#666666',
        borderWidth: 1.5,
        color: '#666666',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minHeight: 48,
      },
    },
    danger: {
      contained: {
        backgroundColor: '#d23229',
        color: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minHeight: 48,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: '#d23229',
        borderWidth: 1.5,
        color: '#d23229',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minHeight: 48,
      },
    },
    success: {
      contained: {
        backgroundColor: '#4CAF50',
        color: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        minHeight: 48,
      },
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
  },
  
  // Input Styles
  inputs: {
    default: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      backgroundColor: '#FFFFFF',
      minHeight: 48,
    },
    focused: {
      borderColor: '#0057b3',
      borderWidth: 2,
    },
    error: {
      borderColor: '#d23229',
    },
  },
  
  // Card Styles
  cards: {
    default: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    elevated: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    flat: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
  },
  
  // Chip/Badge Styles
  chips: {
    default: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      fontSize: 12,
      fontWeight: '600',
    },
    small: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      fontSize: 10,
      fontWeight: '600',
    },
  },
};

// Helper functions
export const withOpacity = (color, opacity) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getStatusColor = (status) => {
  const statusColors = {
    // Project statuses
    CREATED: theme.colors.info,
    PM_ASSIGNED: theme.colors.primary,
    SITE_ASSIGNED: theme.colors.primary,
    VISIT_SCHEDULED: theme.colors.warning,
    VISIT_DONE: theme.colors.success,
    REPORT_SUBMITTED: theme.colors.info,
    CUSTOMER_APPROVED: theme.colors.success,
    ADVANCE_PAID: theme.colors.success,
    WORK_STARTED: theme.colors.primary,
    COMPLETED: theme.colors.success,
    FINAL_PAID: theme.colors.success,
    CLOSED: theme.colors.textSecondary,
    
    // Payment statuses
    pending: theme.colors.warning,
    completed: theme.colors.success,
    verified: theme.colors.success,
    
    // Visit statuses
    scheduled: theme.colors.warning,
    rejected: theme.colors.error,
    
    // Default
    default: theme.colors.textSecondary,
  };
  
  return statusColors[status] || statusColors.default;
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
};

export default theme;
