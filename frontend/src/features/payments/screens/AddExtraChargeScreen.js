import React, { useState, useMemo } from 'react';
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
// import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { paymentsApi } from '../api';

const AddExtraChargeScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { project } = route.params;
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    if (!amount) {
      errors.amount = 'Amount is required';
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.amount = 'Amount must be greater than 0';
      }
    }

    if (!description || description.trim() === '') {
      errors.description = 'Description is required';
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
      setLoading(true);

      const chargeData = {
        projectId: project.id,
        amount: parseFloat(amount),
        description: description.trim(),
      };

      await paymentsApi.createExtraCharge(chargeData);

      Alert.alert(
        'Success',
        'Extra charge added successfully. Customer will be notified.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add extra charge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Extra Charge</Text>
        <Text style={styles.headerSubtitle}>Project: {project.name}</Text>
      </View>

      <View style={styles.form}>
        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount *</Text>
          <TextInput
            style={[styles.input, validationErrors.amount && styles.inputError]}
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              if (validationErrors.amount) {
                setValidationErrors({ ...validationErrors, amount: null });
              }
            }}
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />
          {validationErrors.amount && (
            <Text style={styles.errorText}>{validationErrors.amount}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, validationErrors.description && styles.inputError]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (validationErrors.description) {
                setValidationErrors({ ...validationErrors, description: null });
              }
            }}
            placeholder="Describe the extra charge (e.g., Additional materials, Extra labor)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
          />
          {validationErrors.description && (
            <Text style={styles.errorText}>{validationErrors.description}</Text>
          )}
          <Text style={styles.helperText}>
            Explain why this extra charge is needed
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitButtonText}>Add Extra Charge</Text>
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: colors.warning,
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

export default AddExtraChargeScreen;
