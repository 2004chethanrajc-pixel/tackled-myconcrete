import React from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';

const PageContainer = ({ 
  children, 
  scrollable = true,
  padding = true,
  backgroundColor = null,
  style = {},
}) => {
  const { colors } = useTheme();
  const resolvedBackgroundColor = backgroundColor || colors.background;

  const containerStyle = [
    styles.container,
    { backgroundColor: resolvedBackgroundColor },
    !padding && styles.noPadding,
    style,
  ];
  
  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: resolvedBackgroundColor }]}>
        <ScrollView 
          style={containerStyle}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: resolvedBackgroundColor }]}>
      <View style={containerStyle}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  noPadding: {
    padding: 0,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
});

export default PageContainer;
