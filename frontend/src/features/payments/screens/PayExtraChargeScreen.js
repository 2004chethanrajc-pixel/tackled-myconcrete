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
import { paymentsApi } from '../api';

const PayExtraChargeScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { project, extraCharge } = route.params;
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (paymentMethod === 'bank' && !upiId.trim()) {
      Alert.alert('Error', 'Please enter UPI ID for bank payment');
      return;
    }

    try {
      setLoading(true);

      const paymentData = {
        paymentMethod: paymentMethod,
        upiId: paymentMethod === 'bank' ? upiId.trim() : null,
      };

      await paymentsApi.payExtraCharge(extraCharge.id, paymentData);

      Alert.alert(
        'Success',
        'Extra charge payment submitted successfully. Awaiting verification.',
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
      Alert.alert('Error', err.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pay Extra Charge</Text>
        <Text style={styles.headerSubtitle}>Project: {project.name}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Extra Charge Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{extraCharge.description}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount</Text>
          <Text style={[styles.value, styles.amountText]}>₹{extraCharge.amount}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Payment Details</Text>

        {/* Payment Method */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Method *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value)}
              style={styles.picker}
            >
              <Picker.Item label="Cash" value="cash" />
              <Picker.Item label="Bank Transfer / UPI" value="bank" />
            </Picker>
          </View>
        </View>

        {/* UPI ID (only for bank payment) */}
        {paymentMethod === 'bank' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>UPI ID / Transaction Reference *</Text>
            <TextInput
              style={styles.input}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="Enter UPI ID or transaction reference"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              blurOnSubmit={false}
              returnKeyType="done"
            />
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
            <Text style={styles.submitButtonText}>Submit Payment</Text>
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
  card: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
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
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    ...typography.body,
    color: colors.text,
  },
  submitButton: {
    backgroundColor: colors.success,
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

export default PayExtraChargeScreen;
