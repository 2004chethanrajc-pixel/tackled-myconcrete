import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useOrders } from '../hooks';
import { useAuth } from '../../../hooks/useAuth';
import { getLogoBase64, getPdfTimestamp, pdfStyles } from '../../../utils/pdfUtils';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { useTheme } from '../../../context/ThemeContext';

const STATUS_COLORS = {
  placed:     { bg: '#EFF6FF', text: '#2563EB' },
  assigned:   { bg: '#FFF7ED', text: '#EA580C' },
  dispatched: { bg: '#F0FDF4', text: '#16A34A' },
  delivered:  { bg: '#F0FDF4', text: '#15803D' },
  invoiced:   { bg: '#F5F3FF', text: '#7C3AED' },
  cancelled:  { bg: '#FEF2F2', text: '#DC2626' },
};

const OrderCard = ({ order, onPress, colors }) => {
  const sc = STATUS_COLORS[order.status] || { bg: '#F3F4F6', text: '#6B7280' };
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.cardBg }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={[styles.orderNumber, { color: colors.textPrimary }]}>{order.order_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>
            {order.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[styles.productType, { color: colors.textPrimary }]}>
        {order.product_type === 'concrete' ? '🏗️ Concrete' : '🧱 Bricks'}
        {order.quantity ? `  •  ${order.quantity} ${order.unit || 'units'}` : ''}
      </Text>
      {order.customer_name ? (
        <Text style={[styles.meta, { color: colors.subText }]}>Customer: {order.customer_name}</Text>
      ) : null}
      {order.total_amount ? (
        <Text style={styles.amount}>₹{Number(order.total_amount).toLocaleString()}</Text>
      ) : (
        <Text style={styles.amountPending}>Amount: Pending</Text>
      )}
      <Text style={[styles.date, { color: colors.textLight }]}>{new Date(order.created_at).toLocaleDateString('en-IN')}</Text>
    </TouchableOpacity>
  );
};

const OrdersListScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { orders, loading, error, refetch } = useOrders();
  const [refreshing, setRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const projectId = route?.params?.projectId || null;
  const projectName = route?.params?.projectName || null;

  const displayOrders = projectId
    ? orders.filter(o => o.project_id === projectId)
    : orders;

  useEffect(() => {
    // Calculate menu position when showExportMenu changes
    if (showExportMenu && exportButtonRef.current) {
      exportButtonRef.current.measure((fx, fy, width, height, px, py) => {
        setMenuPosition({
          top: py + height + 5,
          right: px + width,
        });
      });
    }
  }, [showExportMenu]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const downloadPdf = async () => {
    try {
      setExportLoading(true);
      setShowExportMenu(false);
      const logo = await getLogoBase64();
      const timestamp = getPdfTimestamp();
      const rows = displayOrders.map(o => `
         <tr>
           <td>${o.order_number}</td>
           <td>${o.customer_name || '-'}</td>
           <td>${o.product_type}</td>
           <td>${o.quantity || '-'} ${o.unit || ''}</td>
           <td>${o.total_amount ? '₹' + Number(o.total_amount).toLocaleString() : 'Pending'}</td>
           <td>${o.advance_paid ? '✓' : '✗'}</td>
           <td>${o.balance_paid ? '✓' : '✗'}</td>
           <td>${o.status}</td>
           <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
         </tr>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
        <style>${pdfStyles}
          table{width:100%;border-collapse:collapse;font-size:11px}
          th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
          th{background:#2563EB;color:#fff}tr:nth-child(even){background:#f9fafb}
        </style></head><body>
        ${logo ? `<img src="${logo}" style="height:50px;margin-bottom:12px;" />` : ''}
        <h2 style="color:#1F2937;margin-bottom:4px;">Orders${projectName ? ' — ' + projectName : ''}</h2>
        <p style="color:#6B7280;font-size:12px;margin-bottom:16px;">Total: ${displayOrders.length} orders</p>
        <table><thead><tr>
          <th>Order #</th><th>Customer</th><th>Product</th><th>Qty</th>
          <th>Amount</th><th>Advance</th><th>Balance</th><th>Status</th><th>Date</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div style="position:fixed;bottom:20px;right:20px;font-size:10px;color:#9CA3AF;">${timestamp}</div>
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      setExportLoading(true);
      setShowExportMenu(false);
      const headers = ['Order #', 'Customer', 'Product', 'Quantity', 'Unit', 'Total Amount', 'Advance Paid', 'Balance Paid', 'Status', 'Finance', 'PM', 'Date'];
      const rows = displayOrders.map(o => [
        o.order_number, o.customer_name || '', o.product_type,
        o.quantity || '', o.unit || '', o.total_amount || '',
        o.advance_paid ? 'Yes' : 'No', o.balance_paid ? 'Yes' : 'No',
        o.status, o.assigned_finance_name || '', o.assigned_pm_name || '',
        new Date(o.created_at).toLocaleDateString('en-IN'),
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const csvUri = FileSystem.cacheDirectory + 'orders.csv';
      await FileSystem.writeAsStringAsync(csvUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(csvUri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch (e) {
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      setExportLoading(true);
      setShowExportMenu(false);
      const headers = ['Order #', 'Customer', 'Product', 'Quantity', 'Unit', 'Total Amount', 'Advance Paid', 'Balance Paid', 'Status', 'Finance', 'PM', 'Date'];
      const rows = displayOrders.map(o => [
        o.order_number, o.customer_name || '', o.product_type,
        o.quantity || '', o.unit || '', o.total_amount || '',
        o.advance_paid ? 'Yes' : 'No', o.balance_paid ? 'Yes' : 'No',
        o.status, o.assigned_finance_name || '', o.assigned_pm_name || '',
        new Date(o.created_at).toLocaleDateString('en-IN'),
      ]);
      const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Orders"><Table>
        <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
        ${rows.map(r => `<Row>${r.map(v => `<Cell><Data ss:Type="String">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>`).join('')}
      </Table></Worksheet></Workbook>`;
      const xlsUri = FileSystem.cacheDirectory + 'orders.xls';
      await FileSystem.writeAsStringAsync(xlsUri, xml, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(xlsUri, { mimeType: 'application/vnd.ms-excel', UTI: 'com.microsoft.excel.xls' });
    } catch (e) {
      Alert.alert('Error', 'Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const canCreate = ['admin', 'super_admin', 'customer'].includes(user?.role);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader navigation={navigation} />
      <View style={[styles.toolbar, { backgroundColor: colors.toolbarBg, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {projectId ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10, padding: 4 }}>
              <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{projectId ? 'Orders' : 'Orders'}</Text>
            {projectId && projectName ? (
              <Text style={{ fontSize: 12, color: colors.subText, marginTop: 1 }} numberOfLines={1}>{projectName}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          <View ref={exportButtonRef} collapsable={false}>
            <TouchableOpacity 
              onPress={() => setShowExportMenu(v => !v)} 
              style={styles.iconBtn} 
              disabled={exportLoading}
            >
              {exportLoading
                ? <ActivityIndicator size="small" color="#2563EB" />
                : <FontAwesome5 name="download" size={18} color="#2563EB" />}
            </TouchableOpacity>
          </View>
          {canCreate ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('CreateOrder')}
            >
              <MaterialIcons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Modal for export menu to ensure it appears above all content */}
      <Modal
        visible={showExportMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowExportMenu(false)}
        >
          <View style={[styles.exportMenuHorizontal, { position: 'absolute', top: menuPosition.top, right: 20, backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.exportItemHorizontal} onPress={downloadPdf}>
              <FontAwesome5 name="file-pdf" size={18} color="#DC2626" />
              <Text style={[styles.exportItemTextHorizontal, { color: '#DC2626' }]}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportItemHorizontal} onPress={downloadCSV}>
              <FontAwesome5 name="file-csv" size={18} color="#16A34A" />
              <Text style={[styles.exportItemTextHorizontal, { color: '#16A34A' }]}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportItemHorizontal} onPress={downloadExcel}>
              <FontAwesome5 name="file-excel" size={18} color="#0369A1" />
              <Text style={[styles.exportItemTextHorizontal, { color: '#0369A1' }]}>Excel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayOrders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              colors={colors}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
          contentContainerStyle={displayOrders.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <FontAwesome5 name="box-open" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>{projectId ? 'No orders for this project' : 'No orders yet'}</Text>
            </View>
          }
        />
      )}
      <BottomNavigation navigation={navigation} activeRoute="OrdersList" />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.toolbarBg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6, marginRight: 10 },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: 8, padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exportMenuHorizontal: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    padding: 8,
  },
  exportItemHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginRight: 4,
  },
  exportItemTextHorizontal: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  list: { padding: 16, paddingBottom: 90 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNumber: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  productType: { fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 },
  amountPending: { fontSize: 13, color: colors.warning, marginTop: 4 },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { color: colors.error, marginBottom: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: colors.textWhite, fontWeight: '600' },
  emptyText: { color: colors.textSecondary, marginTop: 12, fontSize: 16 },
});

export default OrdersListScreen;
