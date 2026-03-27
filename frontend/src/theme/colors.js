// Legacy colors file - now imports from centralized theme
// This file is kept for backward compatibility
import { theme } from './theme';

export const colors = {
  // Primary Colors - Using Brand Colors
  primary: theme.colors.primary,
  primaryDark: theme.colors.primaryDark,
  primaryLight: theme.colors.primaryLight,
  
  // Accent Colors
  accent: theme.colors.success,
  accentOrange: theme.colors.warning,
  accentRed: theme.colors.error,
  accentPurple: '#8E24AA',
  accentPink: '#D81B60',
  
  // Background Colors
  background: theme.colors.background,
  surface: theme.colors.surface,
  surfaceDark: '#263238',
  cardBg: '#ECEFF1',
  
  // Text Colors
  text: theme.colors.textPrimary,
  textLight: theme.colors.textSecondary,
  textWhite: theme.colors.textWhite,
  textSecondary: theme.colors.textLight,
  
  // Status Colors
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.error,
  dangerLight: theme.colors.errorLight,
  info: theme.colors.info,
  
  // UI Colors
  border: theme.colors.border,
  disabled: theme.colors.disabled,
  shadow: theme.colors.shadow,
  
  // Gradient Colors
  gradientStart: theme.colors.primary,
  gradientEnd: theme.colors.success,
  
  // Sidebar Colors
  sidebarBg: '#263238',
  sidebarText: '#ECEFF1',
  sidebarActive: theme.colors.primary,
  
  // Card Colors - Using Brand Colors
  cardBlue: theme.colors.cardBlue,
  cardGreen: theme.colors.cardGreen,
  cardOrange: theme.colors.cardOrange,
  cardRed: theme.colors.cardRed,
  cardYellow: '#F57F17',
  cardPurple: theme.colors.cardPurple,
  cardTeal: theme.colors.cardTeal,
  cardIndigo: theme.colors.primary,
   
  // Dashboard Colors - Using Brand Colors
  dashboardNavy: theme.colors.primary,
  dashboardGold: theme.colors.warning,
};
