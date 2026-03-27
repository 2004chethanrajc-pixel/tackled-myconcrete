import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Orders.css';

const STATUS_COLORS = {
  pending_approval: { 
    bg: '#FFF7ED', text: '#EA580C', darkBg: 'rgba(245, 158, 11, 0.2)', darkText: '#F59E0B', 
    icon: 'fa-clock', name: 'Pending Approval' 
  },
  placed: { 
    bg: '#EFF6FF', text: '#2563EB', darkBg: 'rgba(59, 130, 246, 0.2)', darkText: '#60A5FA', 
    icon: 'fa-shopping-cart', name: 'Placed' 
  },
  assigned: { 
    bg: '#F0F9FF', text: '#0369A1', darkBg: 'rgba(6, 182, 212, 0.2)', darkText: '#06B6D4', 
    icon: 'fa-user-check', name: 'Assigned' 
  },
  dispatched: { 
    bg: '#F0FDF4', text: '#16A34A', darkBg: 'rgba(16, 185, 129, 0.2)', darkText: '#10B981', 
    icon: 'fa-truck', name: 'Dispatched' 
  },
  delivered: { 
    bg: '#F0FDF4', text: '#15803D', darkBg: 'rgba(16, 185, 129, 0.2)', darkText: '#10B981', 
    icon: 'fa-check-circle', name: 'Delivered' 
  },
  invoiced: { 
    bg: '#F5F3FF', text: '#7C3AED', darkBg: 'rgba(139, 92, 246, 0.2)', darkText: '#A78BFA', 
    icon: 'fa-file-invoice', name: 'Invoiced' 
  },
  cancelled: { 
    bg: '#FEF2F2', text: '#DC2626', darkBg: 'rgba(239, 68, 68, 0.2)', darkText: '#F87171', 
    icon: 'fa-ban', name: 'Cancelled' 
  },
};

const STATUS_FLOW = ['pending_approval', 'placed', 'assigned', 'dispatched', 'delivered', 'invoiced'];

const InfoRow = ({ label, value, valueClass, onClick, icon, isDarkMode }) => (
  <div className="info-row">
    <div className="info-row-left">
      {icon && <i className={`fas ${icon} info-row-icon`}></i>}
      <span className="info-label">{label}</span>
    </div>
    <span
      className={`info-value ${valueClass || ''} ${onClick ? 'link' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      {value || '-'}
    </span>
  </div>
);

const PhoneRow = ({ label, phone, icon, isDarkMode }) => {
  const handleCall = () => {
    if (!phone || phone === '-') return;
    const cleanPhone = phone.replace(/[\s\-)]/g, '');
    window.open(`tel:${cleanPhone}`);
  };

  return (
    <div className="info-row">
      <div className="info-row-left">
        {icon && <i className={`fas ${icon} info-row-icon`}></i>}
        <span className="info-label">{label}</span>
      </div>
      <span
        className={`info-value phone-link ${phone && phone !== '-' ? 'clickable' : ''}`}
        onClick={handleCall}
        style={phone && phone !== '-' ? { cursor: 'pointer' } : {}}
      >
        {phone || '-'}
      </span>
    </div>
  );
};

const PaymentStatusRow = ({ label, status, method, verified, amount, isDarkMode }) => (
  <div className="payment-status-item">
    <div className="payment-status-header">
      <span className="payment-status-label">{label}</span>
      <span className={`payment-status-badge ${status === 'paid' ? 'paid' : 'unpaid'}`}>
        {status === 'paid' ? 'Paid' : 'Pending'}
      </span>
    </div>
    
    {status === 'paid' && (
      <div className="payment-status-details">
        {amount && (
          <div className="payment-detail-row">
            <i className="fas fa-rupee-sign"></i>
            <span className="payment-detail-label">Amount:</span>
            <span className="payment-detail-value">₹{Number(amount).toLocaleString()}</span>
          </div>
        )}
        {method && (
          <div className="payment-detail-row">
            <i className="fas fa-credit-card"></i>
            <span className="payment-detail-label">Method:</span>
            <span className="payment-detail-value">{method}</span>
          </div>
        )}
        <div className="payment-detail-row">
          <i className="fas fa-check-circle"></i>
          <span className="payment-detail-label">Verification:</span>
          <span className={`payment-verify-badge ${verified ? 'verified' : 'pending'}`}>
            {verified ? 'Verified' : 'Pending Verification'}
          </span>
        </div>
      </div>
    )}
  </div>
);

const OrderDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef(null);
  const downloadBtnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  // Users for pickers
  const [customers, setCustomers] = useState([]);
  const [financeUsers, setFinanceUsers] = useState([]);
  const [pmUsers, setPmUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  // Approve modal
  const [showApprove, setShowApprove] = useState(false);
  const [approveForm, setApproveForm] = useState({ unitPrice: '', totalAmount: '', advanceAmount: '' });

  // Update modal
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    customerId: '', assignedFinance: '', assignedPm: '',
    unitPrice: '', totalAmount: '', advanceAmount: '',
    quantity: '', unit: '', deliveryAddress: '', floor: '', notes: '',
    productDescription: '', status: '',
    driverName: '', driverPhone: '', vehicleNumber: '', projectId: '',
  });
  const [showUpdateProject, setShowUpdateProject] = useState(false);

  // PM status-only update modal
  const [showPMUpdate, setShowPMUpdate] = useState(false);
  const [pmStatus, setPmStatus] = useState('');
  const [pmForm, setPmForm] = useState({ driverName: '', driverPhone: '', vehicleNumber: '', projectId: '' });
  const [showPMProject, setShowPMProject] = useState(false);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setIsDarkMode(savedTheme !== "light");
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem("theme");
      setIsDarkMode(currentTheme !== "light");
    };

    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const isFinance = user?.role === 'finance';
  const isPM = user?.role === 'project_manager';

  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDownloadMenu = () => {
    if (!showDownloadMenu && downloadBtnRef.current) {
      const rect = downloadBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY + 6, right: window.innerWidth - rect.right });
    }
    setShowDownloadMenu(v => !v);
  };

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.data?.order || res.data.data);
    } catch (e) {
      alert('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      api.get('/users?role=customer'),
      api.get('/users?role=finance'),
      api.get('/users?role=project_manager'),
      api.get('/projects'),
    ]).then(([c, f, p, proj]) => {
      setCustomers(c.data.data?.users || c.data.data || []);
      setFinanceUsers(f.data.data?.users || f.data.data || []);
      setPmUsers(p.data.data?.users || p.data.data || []);
      setProjects(proj.data.data?.projects || proj.data.data || []);
    }).catch(console.error);
  }, [isAdmin]);

  const handleApprove = async () => {
    if (!approveForm.totalAmount) return alert('Total amount is required');
    if (!approveForm.advanceAmount) return alert('Advance amount is required');
    try {
      setActionLoading(true);
      await api.post(`/orders/${id}/approve`, {
        totalAmount: Number(approveForm.totalAmount),
        advanceAmount: Number(approveForm.advanceAmount),
        unitPrice: approveForm.unitPrice ? Number(approveForm.unitPrice) : undefined,
      });
      setShowApprove(false);
      fetchOrder();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to approve order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setActionLoading(true);
      const payload = {};
      if (updateForm.customerId) payload.customerId = updateForm.customerId;
      if (updateForm.assignedFinance !== undefined) payload.assignedFinance = updateForm.assignedFinance || null;
      if (updateForm.assignedPm !== undefined) payload.assignedPm = updateForm.assignedPm || null;
      if (updateForm.unitPrice) payload.unitPrice = Number(updateForm.unitPrice);
      if (updateForm.totalAmount) payload.totalAmount = Number(updateForm.totalAmount);
      if (updateForm.advanceAmount) payload.advanceAmount = Number(updateForm.advanceAmount);
      if (updateForm.quantity) payload.quantity = Number(updateForm.quantity);
      if (updateForm.unit) payload.unit = updateForm.unit;
      if (updateForm.deliveryAddress !== '') payload.deliveryAddress = updateForm.deliveryAddress;
      if (updateForm.floor !== '') payload.floor = updateForm.floor;
      if (updateForm.notes !== '') payload.notes = updateForm.notes;
      if (updateForm.productDescription !== '') payload.productDescription = updateForm.productDescription;
      if (updateForm.status) payload.status = updateForm.status;
      payload.driverName = updateForm.driverName || null;
      payload.driverPhone = updateForm.driverPhone || null;
      payload.vehicleNumber = updateForm.vehicleNumber || null;
      payload.projectId = showUpdateProject ? (updateForm.projectId || null) : null;
      await api.patch(`/orders/${id}`, payload);
      setShowUpdate(false);
      fetchOrder();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (type) => {
    if (!window.confirm(`Verify ${type} payment for order ${order.order_number}?`)) return;
    try {
      setActionLoading(true);
      await api.post(`/orders/${id}/verify/${type}`, {});
      fetchOrder();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to verify payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      setActionLoading(true);
      await api.patch(`/orders/${id}/cancel`, {});
      fetchOrder();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePMUpdate = async () => {
    if (!pmStatus) return alert('Please select a status');
    try {
      setActionLoading(true);
      const payload = { status: pmStatus };
      payload.driverName = pmForm.driverName || null;
      payload.driverPhone = pmForm.driverPhone || null;
      payload.vehicleNumber = pmForm.vehicleNumber || null;
      payload.projectId = showPMProject ? (pmForm.projectId || null) : null;
      await api.patch(`/orders/${id}`, payload);
      setShowPMUpdate(false);
      fetchOrder();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!order) return;
    const headers = ['Order #', 'Customer', 'Product', 'Quantity', 'Unit', 'Unit Price', 'Total Amount', 'Advance Amount', 'Advance Paid', 'Balance Paid', 'Status', 'Finance', 'PM', 'Address', 'Floor', 'Driver Name', 'Driver Phone', 'Vehicle Number', 'Date'];
    const row = [
      order.order_number, order.customer_name || '', order.product_type,
      order.quantity || '', order.unit || '', order.unit_price || '',
      order.total_amount || '', order.advance_amount || '',
      order.advance_paid ? 'Yes' : 'No', order.balance_paid ? 'Yes' : 'No',
      order.status, order.assigned_finance_name || '', order.assigned_pm_name || '',
      order.delivery_address || '', order.floor || '',
      order.driver_name || '', order.driver_phone || '', order.vehicle_number || '',
      new Date(order.created_at).toLocaleDateString('en-IN'),
    ];
    const csv = [headers, row].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `order-${order.order_number}.csv`; a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const downloadExcel = () => {
    if (!order) return;
    const headers = ['Order #', 'Customer', 'Product', 'Quantity', 'Unit', 'Unit Price', 'Total Amount', 'Advance Amount', 'Advance Paid', 'Balance Paid', 'Status', 'Finance', 'PM', 'Address', 'Floor', 'Driver Name', 'Driver Phone', 'Vehicle Number', 'Date'];
    const row = [
      order.order_number, order.customer_name || '', order.product_type,
      order.quantity || '', order.unit || '', order.unit_price || '',
      order.total_amount || '', order.advance_amount || '',
      order.advance_paid ? 'Yes' : 'No', order.balance_paid ? 'Yes' : 'No',
      order.status, order.assigned_finance_name || '', order.assigned_pm_name || '',
      order.delivery_address || '', order.floor || '',
      order.driver_name || '', order.driver_phone || '', order.vehicle_number || '',
      new Date(order.created_at).toLocaleDateString('en-IN'),
    ];
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Order"><Table>
      <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
      <Row>${row.map(v => `<Cell><Data ss:Type="String">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>
    </Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `order-${order.order_number}.xls`; a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const downloadPDF = () => {
    if (!order) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Order ${order.order_number}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#1F2937}h2{color:#2563EB}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#2563EB;color:#fff;width:40%}td{background:#f9fafb}</style>
      </head><body><h2>Order: ${order.order_number}</h2>
      <p style="color:#6B7280">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
      <table>
        <tr><th>Status</th><td>${order.status.replace(/_/g, ' ')}</td></tr>
        <tr><th>Customer</th><td>${order.customer_name || '-'}</td></tr>
        <tr><th>Product</th><td>${order.product_type}</td></tr>
        <tr><th>Quantity</th><td>${order.quantity || '-'} ${order.unit || ''}</td></tr>
        <tr><th>Delivery Address</th><td>${order.delivery_address || '-'}</td></tr>
        ${order.floor ? `<tr><th>Floor</th><td>${order.floor}</td></tr>` : ''}
        ${order.driver_name ? `<tr><th>Driver Name</th><td>${order.driver_name}</td></tr>` : ''}
        ${order.driver_phone ? `<tr><th>Driver Phone</th><td>${order.driver_phone}</td></tr>` : ''}
        ${order.vehicle_number ? `<tr><th>Vehicle Number</th><td>${order.vehicle_number}</td></tr>` : ''}
        <tr><th>Unit Price</th><td>${order.unit_price ? '₹' + Number(order.unit_price).toLocaleString() : 'Pending'}</td></tr>
        <tr><th>Total Amount</th><td>${order.total_amount ? '₹' + Number(order.total_amount).toLocaleString() : 'Pending'}</td></tr>
        <tr><th>Advance Amount</th><td>${order.advance_amount ? '₹' + Number(order.advance_amount).toLocaleString() : 'Pending'}</td></tr>
        <tr><th>Advance Paid</th><td>${order.advance_paid ? 'Yes' : 'No'}</td></tr>
        <tr><th>Balance Paid</th><td>${order.balance_paid ? 'Yes' : 'No'}</td></tr>
        <tr><th>Finance</th><td>${order.assigned_finance_name || '-'}</td></tr>
        <tr><th>Project Manager</th><td>${order.assigned_pm_name || '-'}</td></tr>
        <tr><th>Date</th><td>${new Date(order.created_at).toLocaleDateString('en-IN')}</td></tr>
      </table></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
    setShowDownloadMenu(false);
  };

  const getStatusStyle = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.pending_approval;
    if (isDarkMode) {
      return { background: colors.darkBg, color: colors.darkText };
    }
    return { background: colors.bg, color: colors.text };
  };

  if (loading) {
    return (
      <div className={isDarkMode ? "dark-theme order-detail-page" : "light-theme order-detail-page"}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const sc = STATUS_COLORS[order.status] || { bg: '#F3F4F6', text: '#6B7280', darkBg: 'rgba(100, 116, 139, 0.2)', darkText: '#94A3B8', icon: 'fa-box', name: order.status };
  const nextStatuses = STATUS_FLOW.slice(STATUS_FLOW.indexOf(order.status) + 1);
  const canCancel = !['delivered', 'invoiced', 'cancelled'].includes(order.status);
  const currentStepIndex = STATUS_FLOW.indexOf(order.status);
  const progressPercentage = ((currentStepIndex + 1) / STATUS_FLOW.length) * 100;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return 'Not provided'; }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const advanceStatus = {
    label: 'Advance Payment',
    status: order.advance_paid ? 'paid' : 'unpaid',
    method: order.advance_payment_method,
    verified: order.advance_verified,
    amount: order.advance_amount
  };

  const balanceStatus = {
    label: 'Balance Payment',
    status: order.balance_paid ? 'paid' : 'unpaid',
    method: order.balance_payment_method,
    verified: order.balance_verified,
    amount: order.total_amount && order.advance_amount ? 
      Number(order.total_amount) - Number(order.advance_amount) : null
  };

  const statusStyle = getStatusStyle(order.status);

  return (
    <div className={isDarkMode ? "dark-theme order-detail-page" : "light-theme order-detail-page"}>
      <div className="order-detail-container">
        {/* Header */}
        <div className="detail-header">
          <button className="back-button" onClick={() => navigate('/orders')}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to Orders</span>
          </button>
          <div className="order-title-section">
            <h1 className="order-title">{order.order_number}</h1>
            <div className="order-status-large" style={statusStyle}>
              <i className={`fas ${sc.icon}`}></i>
              <span>{sc.name.toUpperCase()}</span>
            </div>
          </div>
          <div className="order-actions">
            <div ref={downloadRef} className="download-wrapper">
              <button ref={downloadBtnRef} className="btn-secondary" onClick={toggleDownloadMenu}>
                <i className="fas fa-download"></i>
                <span>Download</span>
                <i className={`fas fa-chevron-${showDownloadMenu ? 'up' : 'down'}`}></i>
              </button>
              {showDownloadMenu && (
                <div className="download-menu" style={{ top: menuPos.top, right: menuPos.right }}>
                  <button onClick={downloadPDF} className="download-option pdf">
                    <i className="fas fa-file-pdf"></i>
                    <span>PDF</span>
                  </button>
                  <button onClick={downloadCSV} className="download-option csv">
                    <i className="fas fa-file-csv"></i>
                    <span>CSV</span>
                  </button>
                  <button onClick={downloadExcel} className="download-option excel">
                    <i className="fas fa-file-excel"></i>
                    <span>Excel</span>
                  </button>
                </div>
              )}
            </div>
            <div className="order-date-large">
              <i className="fas fa-calendar-alt"></i>
              <span>{formatDate(order.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="order-progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>

        {/* Progress Timeline */}
        <div className="order-timeline">
          {STATUS_FLOW.map((status, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = status === order.status;
            const statusColor = STATUS_COLORS[status];
            const stepStatusStyle = getStatusStyle(status);
            
            return (
              <div key={status} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className={`timeline-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                     style={isCompleted && !isCurrent ? { background: isDarkMode ? statusColor.darkText : statusColor.text } : {}}>
                  {isCompleted ? <i className={`fas ${statusColor.icon}`}></i> : <span className="step-number">{index + 1}</span>}
                </div>
                {index < STATUS_FLOW.length - 1 && (
                  <div className={`timeline-line ${isCompleted ? 'completed' : ''}`}
                       style={isCompleted ? { background: isDarkMode ? statusColor.darkText : statusColor.text } : {}}></div>
                )}
                <div className="timeline-label">
                  <span className="status-name">{statusColor.name}</span>
                  {isCurrent && order[`${status}_at`] && (
                    <span className="status-date">{formatDate(order[`${status}_at`])}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Information Grid */}
        <div className="info-grid">
          {/* Order Details Section */}
          <div className="info-card">
            <div className="card-header">
              <i className="fas fa-box"></i>
              <h3>Order Details</h3>
            </div>
            <div className="card-content">
              <InfoRow label="Product Type" value={order.product_type === 'concrete' ? '🏗️ Concrete' : '🧱 Bricks'} icon="fa-tag" isDarkMode={isDarkMode} />
              <InfoRow label="Description" value={order.product_description} icon="fa-file-alt" isDarkMode={isDarkMode} />
              <InfoRow label="Quantity" value={`${order.quantity} ${order.unit || 'units'}`} icon="fa-weight-hanging" isDarkMode={isDarkMode} />
              <InfoRow label="Delivery Address" value={order.delivery_address} icon="fa-map-marker-alt" isDarkMode={isDarkMode} />
              {order.floor && <InfoRow label="Floor" value={order.floor} icon="fa-building" isDarkMode={isDarkMode} />}
              {order.driver_name && <InfoRow label="Driver Name" value={order.driver_name} icon="fa-user" isDarkMode={isDarkMode} />}
              {order.driver_phone && <PhoneRow label="Driver Phone" phone={order.driver_phone} icon="fa-phone-alt" isDarkMode={isDarkMode} />}
              {order.vehicle_number && <InfoRow label="Vehicle Number" value={order.vehicle_number} icon="fa-truck" isDarkMode={isDarkMode} />}
              {order.project_name && <InfoRow label="Project" value={order.project_name} icon="fa-project-diagram" isDarkMode={isDarkMode} />}
              {order.notes && <InfoRow label="Notes" value={order.notes} icon="fa-sticky-note" isDarkMode={isDarkMode} />}
            </div>
          </div>

          {/* Customer Information Section */}
          {(isAdmin || isFinance) && (
            <div className="info-card">
              <div className="card-header">
                <i className="fas fa-user"></i>
                <h3>Customer Information</h3>
              </div>
              <div className="card-content">
                <InfoRow label="Name" value={order.customer_name} icon="fa-user" isDarkMode={isDarkMode} />
                <InfoRow label="Email" value={order.customer_email} valueClass="link" onClick={() => order.customer_email && window.open(`mailto:${order.customer_email}`)} icon="fa-envelope" isDarkMode={isDarkMode} />
                {order.customer_phone && <PhoneRow label="Phone" phone={order.customer_phone} icon="fa-phone-alt" isDarkMode={isDarkMode} />}
                {order.assigned_finance_name && <InfoRow label="Assigned Finance" value={order.assigned_finance_name} icon="fa-user-tie" isDarkMode={isDarkMode} />}
                {order.assigned_pm_name && <InfoRow label="Assigned PM" value={order.assigned_pm_name} icon="fa-hard-hat" isDarkMode={isDarkMode} />}
              </div>
            </div>
          )}

          {/* Payment Information Section */}
          <div className="info-card">
            <div className="card-header">
              <i className="fas fa-rupee-sign"></i>
              <h3>Payment Details</h3>
            </div>
            <div className="card-content">
              <div className="amount-info">
                <div className="amount-row">
                  <span className="amount-label">Unit Price</span>
                  <span className="amount-value">{order.unit_price ? formatCurrency(order.unit_price) : 'Pending'}</span>
                </div>
                <div className="amount-row">
                  <span className="amount-label">Total Amount</span>
                  <span className="amount-value total">{order.total_amount ? formatCurrency(order.total_amount) : 'Pending'}</span>
                </div>
                <div className="amount-row">
                  <span className="amount-label">Advance Amount</span>
                  <span className="amount-value">{order.advance_amount ? formatCurrency(order.advance_amount) : 'Pending'}</span>
                </div>
                {order.total_amount && order.advance_amount && (
                  <div className="amount-row balance">
                    <span className="amount-label">Balance Amount</span>
                    <span className="amount-value balance-value">
                      {formatCurrency(Number(order.total_amount) - Number(order.advance_amount))}
                    </span>
                  </div>
                )}
              </div>

              <div className="divider"></div>

              <PaymentStatusRow label={advanceStatus.label} status={advanceStatus.status} method={advanceStatus.method} verified={advanceStatus.verified} amount={advanceStatus.amount} isDarkMode={isDarkMode} />
              <PaymentStatusRow label={balanceStatus.label} status={balanceStatus.status} method={balanceStatus.method} verified={balanceStatus.verified} amount={balanceStatus.amount} isDarkMode={isDarkMode} />

              {isFinance && order.advance_paid && !order.advance_verified && (
                <button className="verify-payment-btn" onClick={() => handleVerify('advance')} disabled={actionLoading}>
                  <i className="fas fa-check-double"></i>
                  Verify Advance Payment
                </button>
              )}
              {isFinance && order.balance_paid && !order.balance_verified && (
                <button className="verify-payment-btn" onClick={() => handleVerify('balance')} disabled={actionLoading}>
                  <i className="fas fa-check-double"></i>
                  Verify Balance Payment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {isAdmin && order.status === 'pending_approval' && (
            <button className="action-btn approve-btn" onClick={() => { setApproveForm({ unitPrice: '', totalAmount: '', advanceAmount: '' }); setShowApprove(true); }} disabled={actionLoading}>
              <i className="fas fa-check-circle"></i>
              <span>Approve Order & Set Amount</span>
            </button>
          )}

          {isAdmin && order.status !== 'cancelled' && (
            <button className="action-btn update-btn" onClick={() => {
              setUpdateForm({
                customerId: order.customer_id || '',
                assignedFinance: order.assigned_finance || '',
                assignedPm: order.assigned_pm || '',
                unitPrice: order.unit_price ? String(order.unit_price) : '',
                totalAmount: order.total_amount ? String(order.total_amount) : '',
                advanceAmount: order.advance_amount ? String(order.advance_amount) : '',
                quantity: order.quantity ? String(order.quantity) : '',
                unit: order.unit || 'units',
                deliveryAddress: order.delivery_address || '',
                floor: order.floor || '',
                notes: order.notes || '',
                productDescription: order.product_description || '',
                status: '',
                driverName: order.driver_name || '',
                driverPhone: order.driver_phone || '',
                vehicleNumber: order.vehicle_number || '',
                projectId: order.project_id || '',
              });
              setShowUpdateProject(!!order.project_id);
              setShowUpdate(true);
            }} disabled={actionLoading}>
              <i className="fas fa-edit"></i>
              <span>Update Order</span>
            </button>
          )}

          {isPM && order.status !== 'cancelled' && order.status !== 'pending_approval' && (
            <button className="action-btn update-btn" onClick={() => {
              setPmStatus('');
              setPmForm({
                driverName: order.driver_name || '',
                driverPhone: order.driver_phone || '',
                vehicleNumber: order.vehicle_number || '',
                projectId: order.project_id || '',
              });
              setShowPMProject(!!order.project_id);
              setShowPMUpdate(true);
            }} disabled={actionLoading}>
              <i className="fas fa-exchange-alt"></i>
              <span>Update Status</span>
            </button>
          )}

          {(isAdmin || isFinance) && canCancel && (
            <button className="action-btn cancel-btn" onClick={handleCancel} disabled={actionLoading}>
              <i className="fas fa-ban"></i>
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApprove && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowApprove(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Approve Order</h2>
              <button className="modal-close" onClick={() => setShowApprove(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Unit Price (₹) - Optional</label>
                <input type="number" value={approveForm.unitPrice} onChange={e => setApproveForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="Enter unit price" />
              </div>
              <div className="form-group">
                <label>Total Amount (₹) *</label>
                <input type="number" value={approveForm.totalAmount} onChange={e => setApproveForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="Enter total amount" />
              </div>
              <div className="form-group">
                <label>Advance Amount (₹) *</label>
                <input type="number" value={approveForm.advanceAmount} onChange={e => setApproveForm(f => ({ ...f, advanceAmount: e.target.value }))} placeholder="Enter advance amount" />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowApprove(false)} disabled={actionLoading}>Cancel</button>
                <button className="btn-primary" onClick={handleApprove} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner-small"></span> : null} Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdate && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowUpdate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Update Order</h2>
              <button className="modal-close" onClick={() => setShowUpdate(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Customer</label>
                <select value={updateForm.customerId} onChange={e => setUpdateForm(f => ({ ...f, customerId: e.target.value }))}>
                  <option value="">— keep current —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assign Finance</label>
                <select value={updateForm.assignedFinance} onChange={e => setUpdateForm(f => ({ ...f, assignedFinance: e.target.value }))}>
                  <option value="">None</option>
                  {financeUsers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assign Project Manager</label>
                <select value={updateForm.assignedPm} onChange={e => setUpdateForm(f => ({ ...f, assignedPm: e.target.value }))}>
                  <option value="">None</option>
                  {pmUsers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" value={updateForm.quantity} onChange={e => setUpdateForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Enter quantity" />
              </div>
              <div className="form-group">
                <label>Delivery Address</label>
                <textarea value={updateForm.deliveryAddress} onChange={e => setUpdateForm(f => ({ ...f, deliveryAddress: e.target.value }))} placeholder="Enter delivery address" rows={2} />
              </div>
              <div className="form-group">
                <label>Floor</label>
                <input type="text" value={updateForm.floor} onChange={e => setUpdateForm(f => ({ ...f, floor: e.target.value }))} placeholder="e.g. 2nd Floor" />
              </div>
              <div className="form-group">
                <label>Driver Name</label>
                <input type="text" value={updateForm.driverName} onChange={e => setUpdateForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Driver name" />
              </div>
              <div className="form-group">
                <label>Driver Phone</label>
                <input type="tel" value={updateForm.driverPhone} onChange={e => setUpdateForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="Driver phone" />
              </div>
              <div className="form-group">
                <label>Vehicle Number</label>
                <input type="text" value={updateForm.vehicleNumber} onChange={e => setUpdateForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="e.g. MH12AB1234" />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>Link to Project</span>
                  <button type="button" onClick={() => { setShowUpdateProject(v => !v); if (showUpdateProject) setUpdateForm(f => ({ ...f, projectId: '' })); }}
                    className={`toggle-switch ${showUpdateProject ? 'active' : ''}`}>
                    <span className="toggle-slider"></span>
                  </button>
                </label>
                {showUpdateProject && (
                  <select value={updateForm.projectId} onChange={e => setUpdateForm(f => ({ ...f, projectId: e.target.value }))} style={{ marginTop: 6 }}>
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Unit Price (₹)</label>
                <input type="number" value={updateForm.unitPrice} onChange={e => setUpdateForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="Enter unit price" />
              </div>
              <div className="form-group">
                <label>Total Amount (₹)</label>
                <input type="number" value={updateForm.totalAmount} onChange={e => setUpdateForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="Enter total amount" />
              </div>
              <div className="form-group">
                <label>Advance Amount (₹)</label>
                <input type="number" value={updateForm.advanceAmount} onChange={e => setUpdateForm(f => ({ ...f, advanceAmount: e.target.value }))} placeholder="Enter advance amount" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea value={updateForm.notes} onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" rows={2} />
              </div>
              {order.status !== 'pending_approval' && (
                <div className="form-group">
                  <label>Change Status</label>
                  <div className="status-buttons">
                    {nextStatuses.concat(['cancelled']).map(s => (
                      <button key={s} type="button"
                        className={`status-option ${updateForm.status === s ? 'active' : ''}`}
                        onClick={() => setUpdateForm(f => ({ ...f, status: f.status === s ? '' : s }))}>
                        {STATUS_COLORS[s]?.name || s.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowUpdate(false)} disabled={actionLoading}>Cancel</button>
                <button className="btn-primary" onClick={handleUpdate} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner-small"></span> : null} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PM Update Modal */}
      {showPMUpdate && (
        <div className="modal-overlay" onClick={() => !actionLoading && setShowPMUpdate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Update Order Status</h2>
              <button className="modal-close" onClick={() => setShowPMUpdate(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Select New Status</label>
                <div className="status-buttons">
                  {nextStatuses.concat(['cancelled']).map(s => (
                    <button key={s} type="button"
                      className={`status-option ${pmStatus === s ? 'active' : ''}`}
                      onClick={() => setPmStatus(prev => prev === s ? '' : s)}>
                      {STATUS_COLORS[s]?.name || s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Driver Name</label>
                <input type="text" value={pmForm.driverName} onChange={e => setPmForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Driver name" />
              </div>
              <div className="form-group">
                <label>Driver Phone</label>
                <input type="tel" value={pmForm.driverPhone} onChange={e => setPmForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="Driver phone" />
              </div>
              <div className="form-group">
                <label>Vehicle Number</label>
                <input type="text" value={pmForm.vehicleNumber} onChange={e => setPmForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="e.g. MH12AB1234" />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>Link to Project</span>
                  <button type="button" onClick={() => { setShowPMProject(v => !v); if (showPMProject) setPmForm(f => ({ ...f, projectId: '' })); }}
                    className={`toggle-switch ${showPMProject ? 'active' : ''}`}>
                    <span className="toggle-slider"></span>
                  </button>
                </label>
                {showPMProject && (
                  <select value={pmForm.projectId} onChange={e => setPmForm(f => ({ ...f, projectId: e.target.value }))} style={{ marginTop: 6 }}>
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowPMUpdate(false)} disabled={actionLoading}>Cancel</button>
                <button className="btn-primary" onClick={handlePMUpdate} disabled={actionLoading}>
                  {actionLoading ? <span className="spinner-small"></span> : null} Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;