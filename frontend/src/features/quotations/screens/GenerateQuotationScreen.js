import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { typography } from '../../../theme/typography';
import { useGenerateQuotation } from '../hooks';
import { useTheme } from '../../../context/ThemeContext';

const GenerateQuotationScreen = ({ route, navigation }) => {
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => getStyles(themeColors), [themeColors]);
  const { project } = route.params;
  const [materialCost, setMaterialCost] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const { generateQuotation, loading } = useGenerateQuotation();

  // Auto-calculate total cost
  useEffect(() => {
    const material = parseFloat(materialCost) || 0;
    const labour = parseFloat(labourCost) || 0;
    const transport = parseFloat(transportCost) || 0;
    const other = parseFloat(otherCost) || 0;

    const calculated = material + labour + transport + other;
    setTotalCost(calculated > 0 ? calculated.toFixed(2) : '');
  }, [materialCost, labourCost, transportCost, otherCost]);

  const validateForm = () => {
    const errors = {};

    // Validate material cost
    if (materialCost === '' || materialCost === null || materialCost === undefined) {
      errors.materialCost = 'Material cost is required';
    } else {
      const cost = parseFloat(materialCost);
      if (isNaN(cost) || cost < 0) {
        errors.materialCost = 'Material cost cannot be negative';
      }
    }

    // Validate labour cost
    if (labourCost === '' || labourCost === null || labourCost === undefined) {
      errors.labourCost = 'Labour cost is required';
    } else {
      const cost = parseFloat(labourCost);
      if (isNaN(cost) || cost < 0) {
        errors.labourCost = 'Labour cost cannot be negative';
      }
    }

    // Validate transport cost
    if (transportCost === '' || transportCost === null || transportCost === undefined) {
      errors.transportCost = 'Transport cost is required';
    } else {
      const cost = parseFloat(transportCost);
      if (isNaN(cost) || cost < 0) {
        errors.transportCost = 'Transport cost cannot be negative';
      }
    }

    // Validate other cost
    if (otherCost === '' || otherCost === null || otherCost === undefined) {
      errors.otherCost = 'Other cost is required (enter 0 if none)';
    } else {
      const cost = parseFloat(otherCost);
      if (isNaN(cost) || cost < 0) {
        errors.otherCost = 'Other cost cannot be negative';
      }
    }

    // Validate total cost
    if (!totalCost) {
      errors.totalCost = 'Total cost is required';
    } else {
      const total = parseFloat(totalCost);
      if (isNaN(total) || total < 0) {
        errors.totalCost = 'Total cost cannot be negative';
      }
    }

    // Validate advance amount
    if (advanceAmount) {
      const advance = parseFloat(advanceAmount);
      const total = parseFloat(totalCost);
      if (isNaN(advance) || advance < 0) {
        errors.advanceAmount = 'Advance amount cannot be negative';
      } else if (advance > total) {
        errors.advanceAmount = 'Advance amount cannot exceed total cost';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    try {
      const quotationData = {
        projectId: project.id,
        materialCost: parseFloat(materialCost) || 0,
        labourCost: parseFloat(labourCost) || 0,
        transportCost: parseFloat(transportCost) || 0,
        otherCost: parseFloat(otherCost) || 0,
        totalCost: parseFloat(totalCost) || 0,
        advanceAmount: advanceAmount ? parseFloat(advanceAmount) : 0,
      };

      console.log('Submitting quotation data:', quotationData);

      await generateQuotation(quotationData);

      Alert.alert(
        'Success',
        'Quotation generated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Quotation generation error:', err);
      Alert.alert('Error', err.message || 'Failed to generate quotation');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.background === '#121212' ? 'light-content' : 'dark-content'} backgroundColor="#0A84FF" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Gradient */}
          <LinearGradient
            colors={['#0A84FF', '#0066CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Generate Quotation</Text>
              <View style={styles.projectInfoBadge}>
                <MaterialIcons name="folder" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.headerSubtitle}>{project.name}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: themeColors.border }]}>
              <MaterialIcons name="receipt" size={22} color="#0A84FF" />
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Cost Breakdown</Text>
            </View>

            {/* Material Cost */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                Material Cost <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }, validationErrors.materialCost && styles.inputContainerError]}>
                <MaterialIcons name="inventory" size={20} color="#0A84FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary }]}
                  value={materialCost}
                  onChangeText={(text) => {
                    setMaterialCost(text);
                    if (validationErrors.materialCost) {
                      setValidationErrors({ ...validationErrors, materialCost: null });
                    }
                  }}
                  placeholder="Enter material cost"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="decimal-pad"
                />
              </View>
              {validationErrors.materialCost && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.materialCost}</Text>
                </View>
              )}
            </View>

            {/* Labour Cost */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                Labour Cost <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }, validationErrors.labourCost && styles.inputContainerError]}>
                <MaterialIcons name="engineering" size={20} color="#0A84FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary }]}
                  value={labourCost}
                  onChangeText={(text) => {
                    setLabourCost(text);
                    if (validationErrors.labourCost) {
                      setValidationErrors({ ...validationErrors, labourCost: null });
                    }
                  }}
                  placeholder="Enter labour cost"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="decimal-pad"
                />
              </View>
              {validationErrors.labourCost && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.labourCost}</Text>
                </View>
              )}
            </View>

            {/* Transport Cost */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                Transport Cost <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }, validationErrors.transportCost && styles.inputContainerError]}>
                <MaterialIcons name="local-shipping" size={20} color="#0A84FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary }]}
                  value={transportCost}
                  onChangeText={(text) => {
                    setTransportCost(text);
                    if (validationErrors.transportCost) {
                      setValidationErrors({ ...validationErrors, transportCost: null });
                    }
                  }}
                  placeholder="Enter transport cost"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="decimal-pad"
                />
              </View>
              {validationErrors.transportCost && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.transportCost}</Text>
                </View>
              )}
            </View>

            {/* Other Cost */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                Other Cost <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }, validationErrors.otherCost && styles.inputContainerError]}>
                <MaterialIcons name="more-horiz" size={20} color="#0A84FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary }]}
                  value={otherCost}
                  onChangeText={(text) => {
                    setOtherCost(text);
                    if (validationErrors.otherCost) {
                      setValidationErrors({ ...validationErrors, otherCost: null });
                    }
                  }}
                  placeholder="Enter other cost (or 0)"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="decimal-pad"
                />
              </View>
              {validationErrors.otherCost && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.otherCost}</Text>
                </View>
              )}
              <Text style={styles.helperText}>
                Enter 0 if there are no other costs
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Total Cost (Auto-calculated) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                Total Cost <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.totalCostContainer}>
                <View style={[styles.totalCostDisplay, { backgroundColor: themeColors.background }, validationErrors.totalCost && styles.inputContainerError]}>
                  <MaterialIcons name="calculate" size={20} color="#0A84FF" style={styles.inputIcon} />
                  <Text style={styles.totalCostText}>
                    {totalCost ? `₹${totalCost}` : '₹0.00'}
                  </Text>
                </View>
                <View style={styles.autoCalculatedBadge}>
                  <MaterialIcons name="autorenew" size={14} color="#0A84FF" />
                  <Text style={styles.autoCalculatedLabel}>Auto-calculated</Text>
                </View>
              </View>
              {validationErrors.totalCost && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.totalCost}</Text>
                </View>
              )}
            </View>

            {/* Advance Amount */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Advance Amount <Text style={styles.optionalTag}>(Optional)</Text></Text>
              <View style={[styles.inputContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }, validationErrors.advanceAmount && styles.inputContainerError]}>
                <MaterialIcons name="payment" size={20} color="#0A84FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary }]}
                  value={advanceAmount}
                  onChangeText={(text) => {
                    setAdvanceAmount(text);
                    if (validationErrors.advanceAmount) {
                      setValidationErrors({ ...validationErrors, advanceAmount: null });
                    }
                  }}
                  placeholder="Enter advance amount"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="decimal-pad"
                />
              </View>
              {validationErrors.advanceAmount && (
                <View style={styles.errorWrapper}>
                  <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{validationErrors.advanceAmount}</Text>
                </View>
              )}
              <Text style={styles.helperText}>
                Amount customer should pay in advance (leave empty if no advance required)
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#0A84FF', '#0066CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradient, loading && styles.submitButtonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Generate Quotation</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={20} color="#8E8E93" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  projectInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  optionalTag: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
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
  errorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 8,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  totalCostContainer: {
    marginTop: 4,
  },
  totalCostDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#0A84FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  totalCostText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0A84FF',
    paddingVertical: 16,
  },
  autoCalculatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  autoCalculatedLabel: {
    fontSize: 12,
    color: '#0A84FF',
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8FAFD',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
});

export default GenerateQuotationScreen;
