import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useAuth';
import { useCreateProject } from '../hooks';
import { usersApi } from '../../users/api';
import { projectsApi } from '../api';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { useTheme } from '../../../context/ThemeContext';

const CreateProjectScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [pmId, setPmId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [floors, setFloors] = useState([]);
  const [newFloorName, setNewFloorName] = useState('');

  const { createProject, loading: creatingProject, error } = useCreateProject();

  const { scrollY, onScroll } = useScrollPosition();

  const isCustomer = user?.role === 'customer';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isCustomer) {
      setCustomerId(user.id);
    } else {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await usersApi.getAllUsers();
      
      if (response.success) {
        const customerUsers = response.data.users.filter(
          (user) => user.role === 'customer' && user.is_active
        );
        const pmUsers = response.data.users.filter(
          (user) => user.role === 'project_manager' && user.is_active
        );
        setCustomers(customerUsers);
        setProjectManagers(pmUsers);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Project name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Project name must be at least 2 characters';
    } else if (name.trim().length > 150) {
      errors.name = 'Project name cannot exceed 150 characters';
    }

    if (!location.trim()) {
      errors.location = 'Location is required';
    }

    if (!isCustomer && !customerId) {
      errors.customerId = 'Please select a customer';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const projectData = {
        name: name.trim(),
        location: location.trim(),
        customerId,
      };

      // Include pmId in project creation if selected (new optimized approach)
      if (pmId && isAdmin) {
        projectData.pmId = pmId;
      }

      const createdProject = await createProject(projectData);
      
      // Add floors if any were specified
      if (floors.length > 0 && createdProject?.id) {
        for (const floorName of floors) {
          try {
            await projectsApi.addFloor(createdProject.id, floorName);
          } catch (e) {
            console.error('Failed to add floor:', floorName, e);
          }
        }
      }

      // If PM was included in creation, notification is already sent
      if (pmId && isAdmin) {
        Alert.alert('Success', 'Project created and Project Manager assigned successfully! Notifications sent.', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Success', 'Project created successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (err) {
      // Special handling for network errors that might indicate server restart
      if (err.message.includes('Network connection lost')) {
        Alert.alert(
          'Connection Lost', 
          'The connection was lost during project creation. The project may have been created successfully. Please check your projects list.',
          [
            {
              text: 'Check Projects',
              onPress: () => navigation.navigate('ProjectsList'),
            },
            {
              text: 'Try Again',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to create project');
      }
    }
  };

  if (loadingUsers) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.background === '#121212' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
        <AppHeader navigation={navigation} />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
        <BottomNavigation navigation={navigation} activeRoute="CreateProject" scrollY={scrollY} />
      </View>
    );
  }

  const loading = creatingProject;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#121212' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <AppHeader navigation={navigation} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
      >
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
            {/* Project Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Project name <Text style={styles.requiredStar}>*</Text></Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }, validationErrors.name && styles.inputContainerError]}>
                <MaterialIcons name="assignment" size={20} color="#0A84FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (validationErrors.name) {
                      setValidationErrors({ ...validationErrors, name: null });
                    }
                  }}
                  placeholder="e.g., Downtown Commercial Complex"
                  placeholderTextColor="#C6C6C8"
                />
              </View>
              {validationErrors.name && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.name}</Text>
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Location <Text style={styles.requiredStar}>*</Text></Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }, validationErrors.location && styles.inputContainerError]}>
                <MaterialIcons name="location-on" size={20} color="#0A84FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.textPrimary }]}
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    if (validationErrors.location) {
                      setValidationErrors({ ...validationErrors, location: null });
                    }
                  }}
                  placeholder="e.g., 123 Business Ave, New York, NY"
                  placeholderTextColor="#C6C6C8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              {validationErrors.location && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.location}</Text>
                </View>
              )}
            </View>

            {/* Customer Dropdown - Only show for non-customers */}
            {!isCustomer && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Customer <Text style={styles.requiredStar}>*</Text></Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }, validationErrors.customerId && styles.inputContainerError]}>
                  <MaterialIcons name="person" size={20} color="#0A84FF" style={styles.inputIcon} />
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={customerId}
                      onValueChange={(value) => {
                        setCustomerId(value);
                        if (validationErrors.customerId) {
                          setValidationErrors({ ...validationErrors, customerId: null });
                        }
                      }}
                      style={styles.picker}
                      dropdownIconColor="#0A84FF"
                    >
                      <Picker.Item label="Select customer" value="" />
                      {customers.map((customer) => (
                        <Picker.Item
                          key={customer.id}
                          label={customer.name}
                          value={customer.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
                {validationErrors.customerId && (
                  <View style={styles.errorWrapper}>
                    <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                    <Text style={styles.errorText}>{validationErrors.customerId}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Project Manager Dropdown - Only show for admins */}
            {isAdmin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Project manager <Text style={styles.optionalText}>(optional)</Text></Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <MaterialIcons name="engineering" size={20} color="#0A84FF" style={styles.inputIcon} />
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={pmId}
                      onValueChange={(value) => setPmId(value)}
                      style={styles.picker}
                      dropdownIconColor="#0A84FF"
                    >
                      <Picker.Item label="Select project manager" value="" />
                      {projectManagers.map((pm) => (
                        <Picker.Item
                          key={pm.id}
                          label={`${pm.name} • ${pm.active_projects || 0} active`}
                          value={pm.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
                <Text style={styles.helperText}>
                  Can be assigned now or later from project details
                </Text>
              </View>
            )}

            {/* Floors Section - Only show for admins */}
            {isAdmin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Floors <Text style={styles.optionalText}>(optional)</Text></Text>
                <View style={styles.floorInputRow}>
                  <TextInput
                    style={[styles.floorInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                    value={newFloorName}
                    onChangeText={setNewFloorName}
                    placeholder="e.g. Ground Floor, 1st Floor"
                    placeholderTextColor="#C6C6C8"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (newFloorName.trim()) {
                        setFloors([...floors, newFloorName.trim()]);
                        setNewFloorName('');
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.addFloorBtn}
                    onPress={() => {
                      if (newFloorName.trim()) {
                        setFloors([...floors, newFloorName.trim()]);
                        setNewFloorName('');
                      }
                    }}
                  >
                    <MaterialIcons name="add" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                {floors.length > 0 ? (
                  <View style={styles.floorList}>
                    {floors.map((f, i) => (
                      <View key={i} style={styles.floorChip}>
                        <Text style={styles.floorChipText}>{f}</Text>
                        <TouchableOpacity onPress={() => setFloors(floors.filter((_, idx) => idx !== i))}>
                          <MaterialIcons name="close" size={16} color="#8B5CF6" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.helperText}>Add floor names to pre-populate the project</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color="#FF3B30" />
                <Text style={styles.errorContainerText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={[styles.gradient, loading && styles.submitButtonDisabled]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create project</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <BottomNavigation navigation={navigation} activeRoute="CreateProject" scrollY={scrollY} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 20,
  },
  formCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  requiredStar: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  optionalText: {
    color: '#8E8E93',
    fontWeight: '400',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputContainerError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '400',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  errorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 6,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  pickerWrapper: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },
  picker: {
    height: 56,
    color: '#1C1C1E',
    marginLeft: -8,
  },
  helperText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
    fontWeight: '400',
  },
  floorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floorInput: {
    flex: 1,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1C1C1E',
    marginRight: 10,
  },
  addFloorBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  floorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F0FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  floorChipText: {
    fontSize: 13,
    color: '#6D28D9',
    fontWeight: '500',
    marginRight: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFD1D1',
    alignItems: 'center',
  },
  errorContainerText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 12,
  },
  actionSection: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  gradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '400',
  },
});

export default CreateProjectScreen;