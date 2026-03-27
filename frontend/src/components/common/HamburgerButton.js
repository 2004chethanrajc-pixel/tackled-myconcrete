import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const HamburgerButton = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.toggleDrawer()}
    >
      <FontAwesome5 name="bars" size={20} color={colors.iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
    padding: 6,
  },
});

export default HamburgerButton;
