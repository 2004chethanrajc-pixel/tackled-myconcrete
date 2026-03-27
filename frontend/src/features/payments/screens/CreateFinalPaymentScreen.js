import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme } from '../../../context/ThemeContext';
import { typography } from '../../../theme/typography';
import { useCreatePayment } from '../hooks';
import { paymentsApi } from '../api';
import { quotationsApi } from '../../quotations/api';

const CreateFinalPaymentScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { project } = route.params;
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [upiId, setUpiId] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [extraChargesTotal, setExtraChargesTotal] = useState(0);
  const [extraChargesPaid, setExtraChargesPaid] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

  const { createPayment, loading } = useCreatePayment();

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoadingData(true);

      // Fetch quotation to get total cost
      const quotationResponse = await quotationsApi.getQuotationByProject(project.id);
      const quotation = quotationResponse.data.quotation;
      const quotationTotal = parseFloat(quotation.total_cost) || 0;
      setTotalCost(quotationTotal);

      // Fetch payments to calculate total paid and extra charges
      const paymentsResponse = await paymentsApi.getPaymentsByProject(project.id);
      const payments = paymentsResponse.data.payments;
      
      // Sum completed regular payments (advance, milestone, final - excluding extra)
      const regularPaid = payments
        .filter(p => p.status === 'completed' && p.type !== 'extra')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      // Sum all verified extra charges (completed status)
      const extraTotal = payments
        .filter(p => p.status === 'completed' && p.type === 'extra')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      // Extra charges are considered "paid" when they have status 'completed'
      // So extraTotal represents both verified AND paid extra charges
      const extraPaid = extraTotal;
      
      setTotalPaid(regularPaid);
      setExtraChargesTotal(extraTotal);
      setExtraChargesPaid(extraPaid);
      
      // Calculate remaining: (Original Cost + Extra Charges) - (Regular Paid + Extra Paid)
      // Since extra charges when paid are marked as completed, they're already in the total
      const totalWithExtra = quotationTotal + extraTotal;
      const allPaid = regularPaid + extraPaid;
      const remaining = totalWithExtra - allPaid;
      
      setRemainingAmount(remaining);
    } catch (err) {
      console.error('Error loading payment data:', err);
      Alert.alert('Error', 'Failed to load payment data');
      navigation.goBack();
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const errors = {};

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

    if (remainingAmount <= 0) {
      Alert.alert('Error', 'No remaining amount to pay');
      return;
    }

    try {
      const paymentData = {
        projectId: project.id,
        amount: remainingAmount,
        type: 'final',
        paymentMethod: paymentMethod,
        upiId: paymentMethod === 'bank' ? upiId : undefined,
      };

      await createPayment(paymentData);

      Alert.alert(
        'Success',
        'Final payment created successfully. Waiting for finance verification.',
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

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pay Final Amount</Text>
        <Text style={styles.headerSubtitle}>Project: {project.name}</Text>
      </View>

      <View style={styles.form}>
        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Original Project Cost:</Text>
            <Text style={styles.summaryValue}>₹{(totalCost || 0).toFixed(2)}</Text>
          </View>
          
          {extraChargesTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Extra Charges (Verified):</Text>
              <Text style={[styles.summaryValue, styles.extraChargesText]}>+ ₹{(extraChargesTotal || 0).toFixed(2)}</Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalCostRow]}>
            <Text style={styles.summaryLabelBold}>Total Project Cost:</Text>
            <Text style={styles.summaryValueBold}>₹{((totalCost || 0) + (extraChargesTotal || 0)).toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Regular Payments:</Text>
            <Text style={styles.summaryValue}>₹{(totalPaid || 0).toFixed(2)}</Text>
          </View>
          
          {extraChargesPaid > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Extra Charges Paid:</Text>
              <Text style={[styles.summaryValue, styles.paidText]}>₹{(extraChargesPaid || 0).toFixed(2)}</Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalPaidRow]}>
            <Text style={styles.summaryLabelBold}>Total Already Paid:</Text>
            <Text style={styles.summaryValueBold}>₹{((totalPaid || 0) + (extraChargesPaid || 0)).toFixed(2)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Final Payment Amount:</Text>
            <Text style={styles.summaryTotalValue}>₹{(remainingAmount || 0).toFixed(2)}</Text>
          </View>
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
              blurOnSubmit={false}
              returnKeyType="done"
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
            <Text style={styles.submitButtonText}>Submit Final Payment</Text>
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
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  extraChargesText: {
    color: colors.warning || '#FF9800',
  },
  paidText: {
    color: colors.success || '#4CAF50',
  },
  totalCostRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalPaidRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryLabelBold: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
  },
  summaryValueBold: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
  },
  summaryTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryTotalLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  summaryTotalValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
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
});

export default CreateFinalPaymentScreen;
