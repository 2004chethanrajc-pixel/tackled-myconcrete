import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as designTheme } from '../theme/theme';

const DARK_MODE_KEY = '@dark_mode';

export const lightColors = {
  // UI surfaces
  background: '#F7F9FC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  cardBg: '#FFFFFF',
  inputBg: '#FFFFFF',
  headerBg: '#FFFFFF',
  toolbarBg: '#FFFFFF',
  modalBg: '#FFFFFF',
  sectionBg: '#F8F9FA',

  // Text & borders
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  divider: '#E2E8F0',
  placeholderText: '#9CA3AF',
  iconColor: '#1A1A1A',
  subText: '#6B7280',
};

export const darkColors = {
  // UI surfaces
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceSecondary: '#222222',
  cardBg: '#1A1A1A',
  inputBg: '#1E1E1E',
  headerBg: '#111111',
  toolbarBg: '#111111',
  modalBg: '#1A1A1A',
  sectionBg: '#161616',

  // Text & borders
  textPrimary: '#F0F0F0',
  textSecondary: '#AAAAAA',
  textLight: '#777777',
  border: '#333333',
  divider: '#2A2A2A',
  placeholderText: '#666666',
  iconColor: '#F0F0F0',
  subText: '#AAAAAA',
};

const buildColors = (isDarkMode) => {
  // designTheme contains the full set of brand/status tokens used across the app (primary/success/warning/error/etc).
  // We override only the UI surfaces and text/border tokens per mode.
  const ui = isDarkMode ? darkColors : lightColors;
  const sidebarBg = isDarkMode ? '#111827' : '#F8FAFC';
  const sidebarText = isDarkMode ? '#F8FAFC' : '#1F2937';
  const cardBg = isDarkMode ? '#1A1A1A' : '#FFFFFF';
  return {
    ...designTheme.colors,
    ...ui,
    // Backward-compatible aliases used by older screens/components.
    text: ui.textPrimary,
    textMuted: ui.textSecondary,
    textLight: ui.textLight,
    danger: designTheme.colors.error,
    dangerLight: designTheme.colors.errorLight,
    cardBg,
    surfaceLight: isDarkMode ? '#202020' : designTheme.colors.surfaceLight,
    surfaceElevated: isDarkMode ? '#242424' : designTheme.colors.surfaceElevated,
    sidebarBg,
    sidebarText,
    sidebarActive: designTheme.colors.primary,
    dashboardNavy: designTheme.colors.primary,
    dashboardGold: designTheme.colors.warning,
  };
};

export const ThemeContext = createContext({
  isDarkMode: false,
  // Keep a stable noop so consumers never crash before provider mounts.
  toggleDarkMode: async () => {},
  colors: buildColors(false),
});

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_MODE_KEY).then((val) => {
      if (val !== null) setIsDarkMode(val === 'true');
    });
  }, []);

  const toggleDarkMode = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    await AsyncStorage.setItem(DARK_MODE_KEY, String(next));
  };

  const colors = buildColors(isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
