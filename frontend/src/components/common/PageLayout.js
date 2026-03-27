import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppHeader from './AppHeader';
import BottomNavigation from './BottomNavigation';
import { useTheme } from '../../context/ThemeContext';

const PageLayout = ({ children, navigation, activeRoute }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader navigation={navigation} />
      <View style={styles.content}>
        {children}
      </View>
      <BottomNavigation navigation={navigation} activeRoute={activeRoute} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default PageLayout;
