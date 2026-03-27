import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
// import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { useCreatePayment } from '../hooks';
import { quotationsApi } from '../../quotations/api';

const CreatePaymentScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { project } = route.params;
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [upiId, setUpiId] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [loadingQuotation, setLoadingQuotation] = useState(true);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const safeAmount = Number(advanceAmount) || 0;

  const { createPayment, loading } = useCreatePayment();

  // Fetch quotation to get advance amount
  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoadingQuotation(true);
        setFetchError(null);
        const response = await quotationsApi.getQuotationsByProject(project.id);
        
        if (response.success && response.data.quotations && response.data.quotations.length > 0) {
          const quotation = response.data.quotations[0];
          const advance = quotation.advance_amount || 0;
          setAdvanceAmount(advance);
          setAmount(advance.toString());
        } else {
          setFetchError('No quotation found for this project. Please contact your project manager.');
        }
      } catch (err) {
        console.error('Error fetching quotation:', err);
        setFetchError(`Failed to load quotation: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoadingQuotation(false);
      }
    };

    fetchQuotation();
  }, [project.id]);

  const validateForm = () => {
    const errors = {};

    // Validate amount - must match advance amount from quotation
    if (!amount) {
      errors.amount = 'Amount is required';
    } else {
      const amountNum = parseFloat(amount);
      const advanceNum = safeAmount;
      
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.amount = 'Amount must be a positive number';
      } else if (Math.abs(amountNum - advanceNum) > 0.01) {
        errors.amount = `Advance amount must be exactly ₹${advanceNum.toFixed(2)} as per quotation`;
      }
    }

    // Validate payment method
    if (!paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    // Validate UPI ID if bank payment
    if (paymentMethod === 'bank' && !upiId) {
      errors.upiId = 'UPI ID is required for bank payments';
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
      const paymentData = {
        projectId: project.id,
        amount: safeAmount,
        type: 'advance',
        paymentMethod: paymentMethod,
        upiId: paymentMethod === 'bank' ? upiId : undefined,
      };

      await createPayment(paymentData);

      Alert.alert(
        'Success',
        `Advance payment of ₹${safeAmount.toFixed(2)} created successfully. Waiting for finance verification.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back and trigger refresh
              navigation.navigate('CustomerHomeMain', { refresh: true });
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create payment');
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Make Advance Payment</Text>
        <Text style={styles.headerSubtitle}>Project: {project?.name || 'Loading...'}</Text>
      </View>

      {loadingQuotation ? (
        <View style={styles.fullLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading quotation details...</Text>
        </View>
      ) : fetchError ? (
        <View style={styles.fullLoadingContainer}>
          <Text style={[styles.loadingText, { color: colors.danger, textAlign: 'center', marginBottom: 16 }]}>{fetchError}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <View style={styles.form}>
        {/* Amount - Auto-filled from quotation */}
        {/* Amount - Auto-filled from quotation */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Advance Amount *</Text>
          <View style={styles.amountDisplayContainer}>
            <Text style={styles.amountDisplayText}>₹{safeAmount.toFixed(2)}</Text>
            <Text style={styles.amountNote}>(Auto-filled from quotation)</Text>
          </View>
          <Text style={styles.helperText}>
            This is the advance amount specified in the quotation. It cannot be modified.
          </Text>
          {validationErrors.amount && (
            <Text style={styles.errorText}>{validationErrors.amount}</Text>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Method *</Text>
          <View style={[styles.pickerContainer, validationErrors.paymentMethod && styles.inputError]}>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value);
                if (validationErrors.paymentMethod) {
                  setValidationErrors({ ...validationErrors, paymentMethod: null });
                }
                // Clear UPI ID if switching to cash
                if (value === 'cash') {
                  setUpiId('');
                  if (validationErrors.upiId) {
                    setValidationErrors({ ...validationErrors, upiId: null });
                  }
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="Cash" value="cash" />
              <Picker.Item label="Bank Transfer" value="bank" />
            </Picker>
          </View>
          {validationErrors.paymentMethod && (
            <Text style={styles.errorText}>{validationErrors.paymentMethod}</Text>
          )}
        </View>

        {/* UPI ID (only for bank) */}
        {paymentMethod === 'bank' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>UPI ID *</Text>
            <TextInput
              style={[styles.input, validationErrors.upiId && styles.inputError]}
              value={upiId}
              onChangeText={(text) => {
                setUpiId(text);
                if (validationErrors.upiId) {
                  setValidationErrors({ ...validationErrors, upiId: null });
                }
              }}
              placeholder="Enter UPI ID (e.g., user@upi)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            {validationErrors.upiId && (
              <Text style={styles.errorText}>{validationErrors.upiId}</Text>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitButtonText}>Pay ₹{safeAmount.toFixed(2)}</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      )}
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    ...typography.body,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    ...typography.body,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  amountDisplayContainer: {
    backgroundColor: colors.success + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  amountDisplayText: {
    ...typography.h3,
    color: colors.success,
    textAlign: 'center',
    fontWeight: '700',
  },
  amountNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  readOnlyInput: {
    backgroundColor: colors.background,
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default CreatePaymentScreen;
