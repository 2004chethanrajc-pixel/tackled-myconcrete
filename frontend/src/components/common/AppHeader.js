import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';

const AppHeader = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.headerLogo}
        resizeMode="contain"
      />
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => navigation.openDrawer()}
        >
          <FontAwesome5 name="bars" size={24} color={colors.iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 27,
    paddingBottom: 10,
    borderBottomWidth: 1,
    ...theme.shadows.sm,
  },
  headerLogo: {
    width: 50,
    height: 40,
  },
  hamburger: {
    padding: 8,
  },
});

export default AppHeader;
