import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal,
  Linking, Platform,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ordersApi } from '../api';
import { useOrderActions } from '../hooks';
import { useAuth } from '../../../hooks/useAuth';
import apiClient from '../../../services/apiClient';
import { getLogoBase64, getPdfTimestamp, pdfStyles } from '../../../utils/pdfUtils';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { makeCall, sendEmail } from '../../../utils/contactUtils';
import { useTheme } from '../../../context/ThemeContext';

const STATUS_COLORS = {
  pending_approval: { bg: '#FFF7ED', text: '#EA580C' },
  placed:     { bg: '#EFF6FF', text: '#2563EB' },
  assigned:   { bg: '#F0F9FF', text: '#0369A1' },
  dispatched: { bg: '#F0FDF4', text: '#16A34A' },
  delivered:  { bg: '#F0FDF4', text: '#15803D' },
  invoiced:   { bg: '#F5F3FF', text: '#7C3AED' },
  cancelled:  { bg: '#FEF2F2', text: '#DC2626' },
};

const STATUS_FLOW = ['pending_approval', 'placed', 'assigned', 'dispatched', 'delivered', 'invoiced'];
let sharedStyles;

const Row = ({ label, value, valueStyle, themeColors }) => (
  <View style={[sharedStyles.row, themeColors && { borderBottomColor: themeColors.divider }]}>
    <Text style={[sharedStyles.rowLabel, themeColors && { color: themeColors.textSecondary }]}>{label}</Text>
    <Text style={[sharedStyles.rowValue, themeColors && { color: themeColors.textPrimary }, valueStyle]}>{value || '-'}</Text>
  </View>
);

const ContactRow = ({ label, value, onPress, themeColors }) => (
  <View style={[sharedStyles.row, themeColors && { borderBottomColor: themeColors.divider }]}>
    <Text style={[sharedStyles.rowLabel, themeColors && { color: themeColors.textSecondary }]}>{label}</Text>
    <TouchableOpacity onPress={onPress} disabled={!value || value === '-'}>
      <Text style={[sharedStyles.rowValue, themeColors && { color: themeColors.textPrimary }, value && value !== '-' && sharedStyles.linkValue]}>{value || '-'}</Text>
    </TouchableOpacity>
  </View>
);

// New component for clickable driver phone
const ClickablePhoneRow = ({ label, value, themeColors }) => {
  const handleCall = () => {
    if (!value || value === '-') return;
    
    const phoneNumber = value.replace(/[^0-9+]/g, ''); // Clean the phone number
    const url = Platform.OS === 'ios' ? `tel:${phoneNumber}` : `tel:${phoneNumber}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch(err => {
        console.error('Error opening phone dialer:', err);
        Alert.alert('Error', 'Could not open phone dialer');
      });
  };

  return (
    <View style={[sharedStyles.row, themeColors && { borderBottomColor: themeColors.divider }]}>
      <Text style={[sharedStyles.rowLabel, themeColors && { color: themeColors.textSecondary }]}>{label}</Text>
      <TouchableOpacity onPress={handleCall} disabled={!value || value === '-'}>
        <Text style={[sharedStyles.rowValue, themeColors && { color: themeColors.textPrimary }, value && value !== '-' && sharedStyles.callLinkValue]}>
          {value || '-'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const OrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  sharedStyles = styles;
  const { updateOrder, approveOrder, verifyPayment, cancelOrder, loading: actionLoading } = useOrderActions();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    customerId: '', assignedFinance: '', assignedPm: '',
    unitPrice: '', totalAmount: '', advanceAmount: '',
    quantity: '', deliveryAddress: '', floor: '', notes: '', status: '',
    driverName: '', driverPhone: '', vehicleNumber: '', projectId: '',
  });

  // Users for pickers
  const [customers, setCustomers] = useState([]);
  const [financeUsers, setFinanceUsers] = useState([]);
  const [pmUsers, setPmUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showFinancePicker, setShowFinancePicker] = useState(false);
  const [showPmPicker, setShowPmPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showProjectToggle, setShowProjectToggle] = useState(false);

  // PM modal
  const [showPMModal, setShowPMModal] = useState(false);
  const [pmStatus, setPmStatus] = useState('');
  const [pmForm, setPmForm] = useState({ driverName: '', driverPhone: '', vehicleNumber: '', projectId: '' });
  const [showPMProjectPicker, setShowPMProjectPicker] = useState(false);
  const [showPMProjectToggle, setShowPMProjectToggle] = useState(false);

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const isCustomer = user?.role === 'customer';
  const isFinance = user?.role === 'finance';
  const isPM = user?.role === 'project_manager';
  const { colors: themeColors } = useTheme();

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveForm, setApproveForm] = useState({ unitPrice: '', totalAmount: '', advanceAmount: '' });

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getOrderById(orderId);
      setOrder(res.data.data?.order || res.data.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load order');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  useEffect(() => {
    if (!isAdmin) return;
    apiClient.get('/users?role=customer').then(r => setCustomers(r.data.data?.users || r.data.data || [])).catch(() => {});
    apiClient.get('/users?role=finance').then(r => setFinanceUsers(r.data.data?.users || r.data.data || [])).catch(() => {});
    apiClient.get('/users?role=project_manager').then(r => setPmUsers(r.data.data?.users || r.data.data || [])).catch(() => {});
    apiClient.get('/projects').then(r => setProjects(r.data.data?.projects || r.data.data || [])).catch(() => {});
  }, [isAdmin]);

  const handleApproveSubmit = async () => {
    if (!approveForm.totalAmount) return Alert.alert('Error', 'Total amount is required');
    if (!approveForm.advanceAmount) return Alert.alert('Error', 'Advance amount is required');
    try {
      await approveOrder(orderId, {
        totalAmount: Number(approveForm.totalAmount),
        advanceAmount: Number(approveForm.advanceAmount),
        unitPrice: approveForm.unitPrice ? Number(approveForm.unitPrice) : undefined,
      });
      setShowApproveModal(false);
      fetchOrder();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleVerify = (paymentType) => {
    Alert.alert('Verify Payment', `Confirm ${paymentType} payment for order ${order.order_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify', onPress: async () => {
          try {
            await verifyPayment(orderId, paymentType);
            fetchOrder();
          } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleUpdateSubmit = async () => {
    try {
      const payload = {};
      if (updateForm.customerId) payload.customerId = updateForm.customerId;
      if (updateForm.assignedFinance !== undefined) payload.assignedFinance = updateForm.assignedFinance || null;
      if (updateForm.assignedPm !== undefined) payload.assignedPm = updateForm.assignedPm || null;
      if (updateForm.unitPrice) payload.unitPrice = Number(updateForm.unitPrice);
      if (updateForm.totalAmount) payload.totalAmount = Number(updateForm.totalAmount);
      if (updateForm.advanceAmount) payload.advanceAmount = Number(updateForm.advanceAmount);
      if (updateForm.quantity) payload.quantity = Number(updateForm.quantity);
      if (updateForm.deliveryAddress !== '') payload.deliveryAddress = updateForm.deliveryAddress;
      if (updateForm.floor !== '') payload.floor = updateForm.floor;
      if (updateForm.notes !== '') payload.notes = updateForm.notes;
      if (updateForm.status) payload.status = updateForm.status;
      payload.driverName = updateForm.driverName || null;
      payload.driverPhone = updateForm.driverPhone || null;
      payload.vehicleNumber = updateForm.vehicleNumber || null;
      payload.projectId = showProjectToggle ? (updateForm.projectId || null) : null;
      await updateOrder(orderId, payload);
      setShowUpdateModal(false);
      fetchOrder();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await cancelOrder(orderId);
            fetchOrder();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handlePMStatusUpdate = async () => {
    if (!pmStatus) return Alert.alert('Error', 'Please select a status');
    try {
      const payload = { status: pmStatus };
      payload.driverName = pmForm.driverName || null;
      payload.driverPhone = pmForm.driverPhone || null;
      payload.vehicleNumber = pmForm.vehicleNumber || null;
      payload.projectId = showPMProjectToggle ? (pmForm.projectId || null) : null;
      await updateOrder(orderId, payload);
      setShowPMModal(false);
      fetchOrder();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const downloadPdf = async () => {
    try {
      setPdfLoading(true);
      const logo = await getLogoBase64();
      const timestamp = getPdfTimestamp();
      const o = order;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>${pdfStyles}
          .section { margin-bottom:20px; }
          .section-title { font-size:14px; font-weight:700; color:#2563EB; border-bottom:2px solid #2563EB; padding-bottom:6px; margin-bottom:12px; }
          .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f3f4f6; }
          .label { color:#6B7280; font-size:12px; }
          .value { color:#1F2937; font-size:12px; font-weight:600; }
          .badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:700; }
        </style></head><body>
        ${logo ? `<img src="${logo}" style="height:50px;margin-bottom:16px;" />` : ''}
        <h2 style="color:#1F2937;margin-bottom:4px;">Order Details</h2>
        <p style="color:#6B7280;font-size:12px;margin-bottom:20px;">Order #${o.order_number}</p>

        <div class="section">
          <div class="section-title">Order Information</div>
          <div class="row"><span class="label">Order Number</span><span class="value">${o.order_number}</span></div>
          <div class="row"><span class="label">Status</span><span class="value">${o.status.toUpperCase()}</span></div>
          <div class="row"><span class="label">Product Type</span><span class="value">${o.product_type}</span></div>
          <div class="row"><span class="label">Description</span><span class="value">${o.product_description || '-'}</span></div>
          <div class="row"><span class="label">Quantity</span><span class="value">${o.quantity} ${o.unit || ''}</span></div>
          <div class="row"><span class="label">Delivery Address</span><span class="value">${o.delivery_address || '-'}</span></div>
          <div class="row"><span class="label">Notes</span><span class="value">${o.notes || '-'}</span></div>
          <div class="row"><span class="label">Order Date</span><span class="value">${new Date(o.created_at).toLocaleDateString('en-IN')}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Customer</div>
          <div class="row"><span class="label">Name</span><span class="value">${o.customer_name || '-'}</span></div>
          <div class="row"><span class="label">Email</span><span class="value">${o.customer_email || '-'}</span></div>
          <div class="row"><span class="label">Phone</span><span class="value">${o.customer_phone || '-'}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Payment</div>
          <div class="row"><span class="label">Unit Price</span><span class="value">${o.unit_price ? '₹' + Number(o.unit_price).toLocaleString() : 'Pending'}</span></div>
          <div class="row"><span class="label">Total Amount</span><span class="value">${o.total_amount ? '₹' + Number(o.total_amount).toLocaleString() : 'Pending'}</span></div>
          <div class="row"><span class="label">Advance Amount</span><span class="value">${o.advance_amount ? '₹' + Number(o.advance_amount).toLocaleString() : 'Pending'}</span></div>
          <div class="row"><span class="label">Advance Paid</span><span class="value">${o.advance_paid ? 'Yes (' + (o.advance_payment_method || '') + ')' : 'No'}</span></div>
          <div class="row"><span class="label">Balance Paid</span><span class="value">${o.balance_paid ? 'Yes (' + (o.balance_payment_method || '') + ')' : 'No'}</span></div>
        </div>

        <div style="position:fixed;bottom:20px;right:20px;font-size:10px;color:#9CA3AF;">${timestamp}</div>
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  if (!order) return null;

  const sc = STATUS_COLORS[order.status] || { bg: '#F3F4F6', text: '#6B7280' };
  const nextStatuses = STATUS_FLOW.slice(STATUS_FLOW.indexOf(order.status) + 1);
  const canCancel = !['delivered', 'invoiced', 'cancelled'].includes(order.status);
  const canPayAdvance = isCustomer && !order.advance_paid && order.advance_amount && order.status !== 'cancelled';
  const canPayBalance = isCustomer && order.advance_paid && !order.balance_paid && order.total_amount && order.status !== 'cancelled';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <AppHeader navigation={navigation} />
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{order.order_number}</Text>
        <TouchableOpacity onPress={downloadPdf} disabled={pdfLoading}>
          {pdfLoading
            ? <ActivityIndicator size="small" color="#2563EB" />
            : <FontAwesome5 name="file-pdf" size={20} color="#2563EB" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusCard, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusLabel, { color: sc.text }]}>
            {order.status.toUpperCase()}
          </Text>
          <Text style={styles.statusDate}>
            {new Date(order.created_at).toLocaleDateString('en-IN')}
          </Text>
        </View>

        {/* Order Info */}
        <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Order Details</Text>
          <Row label="Product" value={order.product_type === 'concrete' ? '🏗️ Concrete' : '🧱 Bricks'} themeColors={themeColors} />
          <Row label="Description" value={order.product_description} themeColors={themeColors} />
          <Row label="Quantity" value={`${order.quantity} ${order.unit || ''}`} themeColors={themeColors} />
          <Row label="Delivery Address" value={order.delivery_address} themeColors={themeColors} />
          {order.floor ? <Row label="Floor" value={order.floor} themeColors={themeColors} /> : null}
          {order.driver_name ? <Row label="Driver Name" value={order.driver_name} themeColors={themeColors} /> : null}
          {/* Replace the driver phone row with clickable version */}
          {order.driver_phone ? (
            <ClickablePhoneRow label="Driver Phone" value={order.driver_phone} themeColors={themeColors} />
          ) : null}
          {order.vehicle_number ? <Row label="Vehicle Number" value={order.vehicle_number} themeColors={themeColors} /> : null}
          {order.project_name ? <Row label="Project" value={order.project_name} themeColors={themeColors} /> : null}
          <Row label="Notes" value={order.notes} themeColors={themeColors} />
        </View>

        {/* Customer Info */}
        {isAdmin ? (
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Customer</Text>
            <Row label="Name" value={order.customer_name} themeColors={themeColors} />
            <ContactRow label="Email" value={order.customer_email} onPress={() => sendEmail(order.customer_email)} themeColors={themeColors} />
            <ContactRow label="Phone" value={order.customer_phone} onPress={() => makeCall(order.customer_phone)} themeColors={themeColors} />
            {order.assigned_finance_name ? (
              <Row label="Assigned Finance" value={order.assigned_finance_name} themeColors={themeColors} />
            ) : null}
            {order.assigned_pm_name ? (
              <Row label="Assigned PM" value={order.assigned_pm_name} themeColors={themeColors} />
            ) : null}
          </View>
        ) : null}

        {/* Payment Info */}
        <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Payment</Text>
          <Row label="Unit Price" value={order.unit_price ? `₹${Number(order.unit_price).toLocaleString()}` : 'Pending'} themeColors={themeColors} />
          <Row label="Total Amount" value={order.total_amount ? `₹${Number(order.total_amount).toLocaleString()}` : 'Pending'} themeColors={themeColors} />
          <Row label="Advance Amount" value={order.advance_amount ? `₹${Number(order.advance_amount).toLocaleString()}` : 'Pending'} themeColors={themeColors} />
          <Row
            label="Advance Paid"
            value={order.advance_paid ? ('Paid - ' + (order.advance_payment_method || '')) : 'Not paid'}
            valueStyle={{ color: order.advance_paid ? '#16A34A' : '#DC2626' }}
            themeColors={themeColors}
          />
          <Row
            label="Advance Verified"
            value={order.advance_verified ? 'Verified by Finance' : (order.advance_paid ? 'Pending verification' : '-')}
            valueStyle={{ color: order.advance_verified ? '#16A34A' : '#F59E0B' }}
            themeColors={themeColors}
          />
          <Row
            label="Balance Paid"
            value={order.balance_paid ? ('Paid - ' + (order.balance_payment_method || '')) : 'Not paid'}
            valueStyle={{ color: order.balance_paid ? '#16A34A' : '#DC2626' }}
            themeColors={themeColors}
          />
          <Row
            label="Balance Verified"
            value={order.balance_verified ? 'Verified by Finance' : (order.balance_paid ? 'Pending verification' : '-')}
            valueStyle={{ color: order.balance_verified ? '#16A34A' : '#F59E0B' }}
            themeColors={themeColors}
          />
        </View>

        {/* Finance: assigned info */}
        {isFinance && order.assigned_finance_name ? (
          <View style={[styles.section, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Assignment</Text>
            <Row label="Assigned Finance" value={order.assigned_finance_name} themeColors={themeColors} />
            <Row label="Customer" value={order.customer_name} themeColors={themeColors} />
          </View>
        ) : null}

        {/* Finance: Verify payments */}
        {isFinance && order.advance_paid && !order.advance_verified ? (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: '#0369A1' }]}
            onPress={() => handleVerify('advance')}
          >
            <FontAwesome5 name="check-double" size={16} color="#fff" />
            <Text style={styles.updateBtnText}>Verify Advance Payment</Text>
          </TouchableOpacity>
        ) : null}

        {isFinance && order.balance_paid && !order.balance_verified ? (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: '#7C3AED' }]}
            onPress={() => handleVerify('balance')}
          >
            <FontAwesome5 name="check-double" size={16} color="#fff" />
            <Text style={styles.updateBtnText}>Verify Balance Payment</Text>
          </TouchableOpacity>
        ) : null}

        {/* Admin: Approve pending order */}
        {isAdmin && order.status === 'pending_approval' ? (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: '#16A34A' }]}
            onPress={() => {
              setApproveForm({ unitPrice: '', totalAmount: '', advanceAmount: '' });
              setShowApproveModal(true);
            }}
          >
            <FontAwesome5 name="check-circle" size={16} color="#fff" />
            <Text style={styles.updateBtnText}>Approve Order & Set Amount</Text>
          </TouchableOpacity>
        ) : null}

        {/* Admin Actions */}
        {isAdmin && order.status !== 'cancelled' ? (
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => {
              setUpdateForm({
                customerId: order.customer_id || '',
                assignedFinance: order.assigned_finance || '',
                assignedPm: order.assigned_pm || '',
                unitPrice: order.unit_price ? String(order.unit_price) : '',
                totalAmount: order.total_amount ? String(order.total_amount) : '',
                advanceAmount: order.advance_amount ? String(order.advance_amount) : '',
                quantity: order.quantity ? String(order.quantity) : '',
                deliveryAddress: order.delivery_address || '',
                floor: order.floor || '',
                notes: order.notes || '',
                status: '',
                driverName: order.driver_name || '',
                driverPhone: order.driver_phone || '',
                vehicleNumber: order.vehicle_number || '',
                projectId: order.project_id || '',
              });
              setShowProjectToggle(!!order.project_id);
              setShowCustomerPicker(false);
              setShowFinancePicker(false);
              setShowPmPicker(false);
              setShowProjectPicker(false);
              setShowUpdateModal(true);
            }}
          >
            <FontAwesome5 name="edit" size={16} color="#fff" />
            <Text style={styles.updateBtnText}>Update Order</Text>
          </TouchableOpacity>
        ) : null}

        {/* PM: status update only */}
        {isPM && order.status !== 'cancelled' && order.status !== 'pending_approval' ? (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: '#0369A1' }]}
            onPress={() => {
              setPmStatus('');
              setPmForm({
                driverName: order.driver_name || '',
                driverPhone: order.driver_phone || '',
                vehicleNumber: order.vehicle_number || '',
                projectId: order.project_id || '',
              });
              setShowPMProjectToggle(!!order.project_id);
              setShowPMModal(true);
            }}
          >
            <FontAwesome5 name="exchange-alt" size={16} color="#fff" />
            <Text style={styles.updateBtnText}>Update Status</Text>
          </TouchableOpacity>
        ) : null}

        {/* Customer Payment Actions */}
        {canPayAdvance ? (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: '#16A34A' }]}
            onPress={() => navigation.navigate('OrderPayment', { orderId: order.id, type: 'advance', amount: order.advance_amount })}
          >
            <FontAwesome5 name="rupee-sign" size={16} color="#fff" />
            <Text style={styles.updateBtnText}>{'Pay Advance \u20B9' + Number(order.advance_amount).toLocaleString()}</Text>
          </TouchableOpacity>
        ) : null}

        {canPayBalance ? (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: '#7C3AED' }]}
            onPress={() => {
              const balance = Number(order.total_amount) - Number(order.advance_amount || 0);
              navigation.navigate('OrderPayment', { orderId: order.id, type: 'balance', amount: balance });
            }}
          >
            <FontAwesome5 name="rupee-sign" size={16} color="#fff" />
            <Text style={styles.updateBtnText}>
              {'Pay Balance \u20B9' + (Number(order.total_amount) - Number(order.advance_amount || 0)).toLocaleString()}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Cancel */}
        {(isAdmin || isCustomer) && canCancel ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel Order</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <BottomNavigation navigation={navigation} activeRoute="OrdersList" />

      {/* Approve Modal */}
      <Modal visible={showApproveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Approve Order</Text>
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Unit Price (₹) - Optional</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]} value={approveForm.unitPrice}
              onChangeText={v => setApproveForm(f => ({ ...f, unitPrice: v }))}
              keyboardType="numeric" placeholder="Enter unit price" placeholderTextColor={themeColors.placeholderText} />
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Total Amount (₹) *</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]} value={approveForm.totalAmount}
              onChangeText={v => setApproveForm(f => ({ ...f, totalAmount: v }))}
              keyboardType="numeric" placeholder="Enter total amount" placeholderTextColor={themeColors.placeholderText} />
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Advance Amount (₹) *</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: themeColors.inputBg, color: themeColors.textPrimary, borderColor: themeColors.border }]} value={approveForm.advanceAmount}
              onChangeText={v => setApproveForm(f => ({ ...f, advanceAmount: v }))}
              keyboardType="numeric" placeholder="Enter advance amount" placeholderTextColor={themeColors.placeholderText} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowApproveModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { backgroundColor: '#16A34A' }]}
                onPress={handleApproveSubmit} disabled={actionLoading}>
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Approve</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Modal */}
      <Modal visible={showUpdateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]} contentContainerStyle={{ paddingBottom: 36 }}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Update Order</Text>

            {/* Customer picker */}
            <Text style={styles.inputLabel}>Customer</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowCustomerPicker(v => !v)}>
              <Text style={updateForm.customerId ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {customers.find(c => c.id === updateForm.customerId)?.name || 'Select customer...'}
              </Text>
              <FontAwesome5 name={showCustomerPicker ? 'chevron-up' : 'chevron-down'} size={12} color="#6B7280" />
            </TouchableOpacity>
            {showCustomerPicker ? (
              <View style={styles.pickerDropdown}>
                {customers.map(c => (
                  <TouchableOpacity key={c.id} style={styles.pickerItem}
                    onPress={() => { setUpdateForm(f => ({ ...f, customerId: c.id })); setShowCustomerPicker(false); }}>
                    <Text style={styles.pickerItemText}>{c.name}</Text>
                    <Text style={styles.pickerItemSub}>{c.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Finance picker */}
            <Text style={styles.inputLabel}>Assign Finance</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowFinancePicker(v => !v)}>
              <Text style={updateForm.assignedFinance ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {financeUsers.find(f => f.id === updateForm.assignedFinance)?.name || 'None'}
              </Text>
              <FontAwesome5 name={showFinancePicker ? 'chevron-up' : 'chevron-down'} size={12} color="#6B7280" />
            </TouchableOpacity>
            {showFinancePicker ? (
              <View style={styles.pickerDropdown}>
                <TouchableOpacity style={styles.pickerItem} onPress={() => { setUpdateForm(f => ({ ...f, assignedFinance: '' })); setShowFinancePicker(false); }}>
                  <Text style={[styles.pickerItemText, { color: '#6B7280' }]}>None</Text>
                </TouchableOpacity>
                {financeUsers.map(f => (
                  <TouchableOpacity key={f.id} style={styles.pickerItem}
                    onPress={() => { setUpdateForm(uf => ({ ...uf, assignedFinance: f.id })); setShowFinancePicker(false); }}>
                    <Text style={styles.pickerItemText}>{f.name}</Text>
                    <Text style={styles.pickerItemSub}>{f.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* PM picker */}
            <Text style={styles.inputLabel}>Assign Project Manager</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPmPicker(v => !v)}>
              <Text style={updateForm.assignedPm ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {pmUsers.find(p => p.id === updateForm.assignedPm)?.name || 'None'}
              </Text>
              <FontAwesome5 name={showPmPicker ? 'chevron-up' : 'chevron-down'} size={12} color="#6B7280" />
            </TouchableOpacity>
            {showPmPicker ? (
              <View style={styles.pickerDropdown}>
                <TouchableOpacity style={styles.pickerItem} onPress={() => { setUpdateForm(f => ({ ...f, assignedPm: '' })); setShowPmPicker(false); }}>
                  <Text style={[styles.pickerItemText, { color: '#6B7280' }]}>None</Text>
                </TouchableOpacity>
                {pmUsers.map(p => (
                  <TouchableOpacity key={p.id} style={styles.pickerItem}
                    onPress={() => { setUpdateForm(f => ({ ...f, assignedPm: p.id })); setShowPmPicker(false); }}>
                    <Text style={styles.pickerItemText}>{p.name}</Text>
                    <Text style={styles.pickerItemSub}>{p.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput style={styles.modalInput} value={updateForm.quantity}
              onChangeText={v => setUpdateForm(f => ({ ...f, quantity: v }))}
              keyboardType="numeric" placeholder="Enter quantity" placeholderTextColor="#9CA3AF" />

            <Text style={styles.inputLabel}>Delivery Address</Text>
            <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={updateForm.deliveryAddress}
              onChangeText={v => setUpdateForm(f => ({ ...f, deliveryAddress: v }))}
              placeholder="Enter delivery address" placeholderTextColor="#9CA3AF" multiline />

            <Text style={styles.inputLabel}>Floor</Text>
            <TextInput style={styles.modalInput} value={updateForm.floor}
              onChangeText={v => setUpdateForm(f => ({ ...f, floor: v }))}
              placeholder="e.g. 2nd Floor" placeholderTextColor="#9CA3AF" />

            <Text style={styles.inputLabel}>Driver Name</Text>
            <TextInput style={styles.modalInput} value={updateForm.driverName}
              onChangeText={v => setUpdateForm(f => ({ ...f, driverName: v }))}
              placeholder="Driver name" placeholderTextColor="#9CA3AF" />

            <Text style={styles.inputLabel}>Driver Phone</Text>
            <TextInput style={styles.modalInput} value={updateForm.driverPhone}
              onChangeText={v => setUpdateForm(f => ({ ...f, driverPhone: v }))}
              placeholder="Driver phone" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />

            <Text style={styles.inputLabel}>Vehicle Number</Text>
            <TextInput style={styles.modalInput} value={updateForm.vehicleNumber}
              onChangeText={v => setUpdateForm(f => ({ ...f, vehicleNumber: v }))}
              placeholder="e.g. MH12AB1234" placeholderTextColor="#9CA3AF" />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.inputLabel, { flex: 1, marginBottom: 0 }]}>Link to Project</Text>
              <TouchableOpacity
                onPress={() => { setShowProjectToggle(v => !v); if (showProjectToggle) { setUpdateForm(f => ({ ...f, projectId: '' })); setShowProjectPicker(false); } }}
                style={[styles.statusOption, showProjectToggle && styles.statusOptionActive]}>
                <Text style={[styles.statusOptionText, showProjectToggle && styles.statusOptionTextActive]}>{showProjectToggle ? 'On' : 'Off'}</Text>
              </TouchableOpacity>
            </View>
            {showProjectToggle ? (
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowProjectPicker(v => !v)}>
                  <Text style={updateForm.projectId ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                    {projects.find(p => p.id === updateForm.projectId)?.name || 'Select project...'}
                  </Text>
                  <FontAwesome5 name={showProjectPicker ? 'chevron-up' : 'chevron-down'} size={12} color="#6B7280" />
                </TouchableOpacity>
                {showProjectPicker ? (
                  <View style={styles.pickerDropdown}>
                    <TouchableOpacity style={styles.pickerItem} onPress={() => { setUpdateForm(f => ({ ...f, projectId: '' })); setShowProjectPicker(false); }}>
                      <Text style={[styles.pickerItemText, { color: '#6B7280' }]}>None</Text>
                    </TouchableOpacity>
                    {projects.map(p => (
                      <TouchableOpacity key={p.id} style={styles.pickerItem}
                        onPress={() => { setUpdateForm(f => ({ ...f, projectId: p.id })); setShowProjectPicker(false); }}>
                        <Text style={styles.pickerItemText}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Unit Price (₹)</Text>
            <TextInput style={styles.modalInput} value={updateForm.unitPrice}
              onChangeText={v => setUpdateForm(f => ({ ...f, unitPrice: v }))}
              keyboardType="numeric" placeholder="Enter unit price" placeholderTextColor="#9CA3AF" />

            <Text style={styles.inputLabel}>Total Amount (₹)</Text>
            <TextInput style={styles.modalInput} value={updateForm.totalAmount}
              onChangeText={v => setUpdateForm(f => ({ ...f, totalAmount: v }))}
              keyboardType="numeric" placeholder="Enter total amount" placeholderTextColor="#9CA3AF" />

            <Text style={styles.inputLabel}>Advance Amount (₹)</Text>
            <TextInput style={styles.modalInput} value={updateForm.advanceAmount}
              onChangeText={v => setUpdateForm(f => ({ ...f, advanceAmount: v }))}
              keyboardType="numeric" placeholder="Enter advance amount" placeholderTextColor="#9CA3AF" />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={updateForm.notes}
              onChangeText={v => setUpdateForm(f => ({ ...f, notes: v }))}
              placeholder="Notes" placeholderTextColor="#9CA3AF" multiline />

            {order.status !== 'pending_approval' ? (
              <View>
                <Text style={styles.inputLabel}>Change Status</Text>
                <View style={styles.statusOptions}>
                  {nextStatuses.concat(['cancelled']).map(s => (
                    <TouchableOpacity key={s}
                      style={[styles.statusOption, updateForm.status === s && styles.statusOptionActive]}
                      onPress={() => setUpdateForm(f => ({ ...f, status: f.status === s ? '' : s }))}>
                      <Text style={[styles.statusOptionText, updateForm.status === s && styles.statusOptionTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowUpdateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleUpdateSubmit} disabled={actionLoading}>
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* PM Status Update Modal */}
      <Modal visible={showPMModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]} contentContainerStyle={{ paddingBottom: 36 }}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Update Order Status</Text>
            <Text style={styles.inputLabel}>Select New Status</Text>
            <View style={styles.statusOptions}>
              {nextStatuses.concat(['cancelled']).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOption, pmStatus === s && styles.statusOptionActive]}
                  onPress={() => setPmStatus(prev => prev === s ? '' : s)}
                >
                  <Text style={[styles.statusOptionText, pmStatus === s && styles.statusOptionTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Driver Name</Text>
            <TextInput style={styles.modalInput} value={pmForm.driverName}
              onChangeText={v => setPmForm(f => ({ ...f, driverName: v }))}
              placeholder="Driver name" placeholderTextColor="#9CA3AF" />

            <Text style={styles.inputLabel}>Driver Phone</Text>
            <TextInput style={styles.modalInput} value={pmForm.driverPhone}
              onChangeText={v => setPmForm(f => ({ ...f, driverPhone: v }))}
              placeholder="Driver phone" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />

            <Text style={styles.inputLabel}>Vehicle Number</Text>
            <TextInput style={styles.modalInput} value={pmForm.vehicleNumber}
              onChangeText={v => setPmForm(f => ({ ...f, vehicleNumber: v }))}
              placeholder="e.g. MH12AB1234" placeholderTextColor="#9CA3AF" />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.inputLabel, { flex: 1, marginBottom: 0 }]}>Link to Project</Text>
              <TouchableOpacity
                onPress={() => { setShowPMProjectToggle(v => !v); if (showPMProjectToggle) { setPmForm(f => ({ ...f, projectId: '' })); setShowPMProjectPicker(false); } }}
                style={[styles.statusOption, showPMProjectToggle && styles.statusOptionActive]}>
                <Text style={[styles.statusOptionText, showPMProjectToggle && styles.statusOptionTextActive]}>{showPMProjectToggle ? 'On' : 'Off'}</Text>
              </TouchableOpacity>
            </View>
            {showPMProjectToggle ? (
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPMProjectPicker(v => !v)}>
                  <Text style={pmForm.projectId ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                    {projects.find(p => p.id === pmForm.projectId)?.name || 'Select project...'}
                  </Text>
                  <FontAwesome5 name={showPMProjectPicker ? 'chevron-up' : 'chevron-down'} size={12} color="#6B7280" />
                </TouchableOpacity>
                {showPMProjectPicker ? (
                  <View style={styles.pickerDropdown}>
                    <TouchableOpacity style={styles.pickerItem} onPress={() => { setPmForm(f => ({ ...f, projectId: '' })); setShowPMProjectPicker(false); }}>
                      <Text style={[styles.pickerItemText, { color: '#6B7280' }]}>None</Text>
                    </TouchableOpacity>
                    {projects.map(p => (
                      <TouchableOpacity key={p.id} style={styles.pickerItem}
                        onPress={() => { setPmForm(f => ({ ...f, projectId: p.id })); setShowPMProjectPicker(false); }}>
                        <Text style={styles.pickerItemText}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPMModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handlePMStatusUpdate} disabled={actionLoading}>
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, flex: 1, marginHorizontal: 12 },
  content: { padding: 16, paddingBottom: 100 },
  statusCard: {
    borderRadius: 12, padding: 16, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusLabel: { fontSize: 16, fontWeight: '800' },
  statusDate: { fontSize: 13, color: colors.textSecondary },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#2563EB', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  rowLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
  linkValue: { color: '#2563EB', textDecorationLine: 'underline' },
  callLinkValue: { color: '#16A34A', textDecorationLine: 'underline', fontWeight: '700' },
  updateBtn: {
    backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#EF4444', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  cancelBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  modalInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textPrimary, marginBottom: 12,
  },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  statusOption: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background,
    marginRight: 8, marginBottom: 8,
  },
  statusOptionActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  statusOptionText: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  statusOptionTextActive: { color: '#fff', fontWeight: '700' },
  modalActions: { flexDirection: 'row' },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
    marginRight: 12,
  },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalSave: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickerBtn: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  pickerBtnText: { fontSize: 14, color: colors.textPrimary },
  pickerBtnPlaceholder: { fontSize: 14, color: colors.textSecondary },
  pickerDropdown: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, marginBottom: 12, maxHeight: 160, overflow: 'hidden',
  },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerItemText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  pickerItemSub: { fontSize: 12, color: colors.textSecondary },
});

export default OrderDetailScreen;
