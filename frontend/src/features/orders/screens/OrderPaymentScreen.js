import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useOrderActions } from '../hooks';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';

const OrderPaymentScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { orderId, type, amount } = route.params; // type: 'advance' | 'balance'
  const { payAdvance, payBalance, loading } = useOrderActions();

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [upiId, setUpiId] = useState('');

  const handlePay = async () => {
    if (paymentMethod === 'bank' && !upiId.trim()) {
      return Alert.alert('Error', 'Please enter UPI ID / Transaction ID');
    }

    try {
      const payload = { paymentMethod, upiId: upiId.trim() || undefined };
      if (type === 'advance') {
        await payAdvance(orderId, payload);
      } else {
        await payBalance(orderId, payload);
      }
      Alert.alert('Success', `${type === 'advance' ? 'Advance' : 'Balance'} payment recorded successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const safeAmount = Number(amount) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader navigation={navigation} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>
          {type === 'advance' ? 'Advance Payment' : 'Balance Payment'}
        </Text>
        <Text style={styles.amountValue}>₹{safeAmount.toLocaleString()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Payment Method</Text>

      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodBtnActive]}
          onPress={() => setPaymentMethod('cash')}
        >
          <FontAwesome5 name="money-bill-wave" size={20} color={paymentMethod === 'cash' ? '#fff' : '#374151'} />
          <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextActive]}>Cash</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodBtn, paymentMethod === 'bank' && styles.methodBtnActive]}
          onPress={() => setPaymentMethod('bank')}
        >
          <FontAwesome5 name="university" size={20} color={paymentMethod === 'bank' ? '#fff' : '#374151'} />
          <Text style={[styles.methodText, paymentMethod === 'bank' && styles.methodTextActive]}>Bank / UPI</Text>
        </TouchableOpacity>
      </View>

      {paymentMethod === 'bank' ? (
        <View style={styles.field}>
          <Text style={styles.label}>UPI ID / Transaction ID *</Text>
          <TextInput
            style={styles.input}
            value={upiId}
            onChangeText={setUpiId}
            placeholder="Enter UPI ID or transaction reference"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      ) : null}

      <View style={styles.infoBox}>
        <FontAwesome5 name="info-circle" size={14} color="#2563EB" />
        <Text style={styles.infoText}>
          {paymentMethod === 'cash'
            ? 'Please pay cash to the admin/site team and confirm here.'
            : 'Transfer the amount via UPI/bank and enter the transaction ID.'}
        </Text>
      </View>

      <TouchableOpacity style={styles.payBtn} onPress={handlePay} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.payBtnText}>Confirm Payment</Text>}
      </TouchableOpacity>
      </ScrollView>
      <BottomNavigation navigation={navigation} activeRoute="OrdersList" />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  amountCard: {
    backgroundColor: '#2563EB', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 28,
  },
  amountLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  amountValue: { fontSize: 36, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  methodRow: { flexDirection: 'row', marginBottom: 20 },
  methodBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, backgroundColor: '#fff',
    alignItems: 'center', marginRight: 12,
  },
  methodBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  methodText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 8 },
  methodTextActive: { color: '#fff' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary,
  },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#EFF6FF',
    borderRadius: 10, padding: 14, marginBottom: 24, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: '#2563EB', lineHeight: 18, marginLeft: 10 },
  payBtn: {
    backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default OrderPaymentScreen;
