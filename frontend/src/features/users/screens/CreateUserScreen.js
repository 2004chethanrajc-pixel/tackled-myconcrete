import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';
import apiClient from '../../../services/apiClient';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { useAuth } from '../../../hooks/useAuth';
import { SimpleDatePicker } from '../../../components/common/SimpleDateTimePicker';
import { useTheme } from '../../../context/ThemeContext';

const CreateUserScreen = ({ route, navigation }) => {
  const { role } = route.params || {};
  const { user: currentUser } = useAuth();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { colors: themeColors } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: role || (currentUser?.role === 'super_admin' ? 'admin' : 'customer'),
    date_of_joining: '',
    date_of_birth: '',
    city: '',
    current_address: '',
    permanent_address: '',
  });
  const [loading, setLoading] = useState(false);

  const getRoleDisplayName = (role) => {
    const roleNames = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      customer: 'Customer',
      project_manager: 'Project Manager',
      site_incharge: 'Site Incharge',
      finance: 'Finance',
    };
    return roleNames[role] || role;
  };

  // Get available roles based on current user's role
  const getAvailableRoles = () => {
    if (currentUser?.role === 'super_admin') {
      // Super Admin can create Admin and Super Admin users
      return [
        { label: 'Admin', value: 'admin' },
        { label: 'Super Admin', value: 'super_admin' },
      ];
    } else {
      // Other roles can create all roles except super_admin
      return [
        { label: 'Customer', value: 'customer' },
        { label: 'Project Manager', value: 'project_manager' },
        { label: 'Site Incharge', value: 'site_incharge' },
        { label: 'Finance', value: 'finance' },
        { label: 'Admin', value: 'admin' },
      ];
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCreateUser = async () => {
    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/[^0-9]/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        date_of_joining: formData.date_of_joining || null,
        date_of_birth: formData.date_of_birth || null,
        city: formData.city || null,
        current_address: formData.current_address || null,
        permanent_address: formData.permanent_address || null,
      };

      console.log('=== MOBILE APP DEBUG ===');
      console.log('Creating user with data:', JSON.stringify(userData, null, 2));
      console.log('Role being sent:', formData.role);

      const response = await apiClient.post('/users', userData);

      console.log('✅ User creation successful:', response.data);
      Alert.alert('Success', `${getRoleDisplayName(formData.role)} created successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('❌ Create user error:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to create user';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join('\n');
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Create User</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Create {role ? getRoleDisplayName(role) : 'User'}</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Enter user details below</Text>

          {/* Required Fields */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, borderBottomColor: themeColors.border }]}>Required Information</Text>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <FontAwesome5 name="user" size={16} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name *"
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
              autoCapitalize="words"
              editable={!loading}
              placeholderTextColor={themeColors.placeholderText}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <FontAwesome5 name="envelope" size={16} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email *"
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              placeholderTextColor={themeColors.placeholderText}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <FontAwesome5 name="phone" size={16} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Phone Number *"
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.phone}
              onChangeText={(value) => handleChange('phone', value)}
              keyboardType="phone-pad"
              editable={!loading}
              placeholderTextColor={themeColors.placeholderText}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <FontAwesome5 name="lock" size={16} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Password (min 6 characters) *"
              style={[styles.input, { color: themeColors.textPrimary }]}
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => handleChange('password', value)}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              placeholderTextColor={themeColors.placeholderText}
            />
          </View>

          {!role && (
            <View style={styles.pickerContainer}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Role *</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
                <Picker
                  selectedValue={formData.role}
                  onValueChange={(value) => handleChange('role', value)}
                  style={[styles.picker, { color: themeColors.textPrimary }]}
                  enabled={!loading}
                  dropdownIconColor={colors.primary}
                >
                  {getAvailableRoles().map((roleOption) => (
                    <Picker.Item 
                      key={roleOption.value}
                      label={roleOption.label} 
                      value={roleOption.value} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {/* Optional Fields */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, borderBottomColor: themeColors.border }]}>Additional Information (Optional)</Text>
          </View>

          <SimpleDatePicker
            label="Date of Joining"
            value={formData.date_of_joining}
            onChange={(val) => handleChange('date_of_joining', val)}
            yearRange={{ start: 2000, end: new Date().getFullYear() + 1 }}
          />

          <SimpleDatePicker
            label="Date of Birth"
            value={formData.date_of_birth}
            onChange={(val) => handleChange('date_of_birth', val)}
            yearRange={{ start: 1950, end: new Date().getFullYear() }}
          />

          <View style={[styles.inputContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <FontAwesome5 name="city" size={16} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder="City"
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.city}
              onChangeText={(value) => handleChange('city', value)}
              editable={!loading}
              placeholderTextColor={themeColors.placeholderText}
            />
          </View>

          <View style={[styles.textAreaContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <View style={styles.textAreaIconContainer}>
              <FontAwesome5 name="home" size={16} color={themeColors.textSecondary} />
            </View>
            <TextInput
              placeholder="Current Address"
              style={[styles.textArea, { color: themeColors.textPrimary }]}
              value={formData.current_address}
              onChangeText={(value) => handleChange('current_address', value)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
              placeholderTextColor={themeColors.placeholderText}
            />
          </View>

          <View style={[styles.textAreaContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <View style={styles.textAreaIconContainer}>
              <FontAwesome5 name="building" size={16} color={themeColors.textSecondary} />
            </View>
            <TextInput
              placeholder="Permanent Address"
              style={[styles.textArea, { color: themeColors.textPrimary }]}
              value={formData.permanent_address}
              onChangeText={(value) => handleChange('permanent_address', value)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!loading}
              placeholderTextColor={themeColors.placeholderText}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <FontAwesome5 name="user-plus" size={18} color={colors.surface} />
                <Text style={styles.buttonText}>Create User</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: themeColors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
    width: 20,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  textAreaContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
  },
  textAreaIconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 8,
  },
  textArea: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingTop: 0,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    height: 56,
    justifyContent: 'center',
  },
  picker: {
    height: 56,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled || '#A0AEC0',
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateUserScreen;