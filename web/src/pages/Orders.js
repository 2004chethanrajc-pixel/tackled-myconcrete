import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef(null);
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders`);
      setOrders(res.data.data?.orders || []);
    } catch (e) {
      console.error('Failed to load orders', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDownloadMenu = () => {
    if (!showDownloadMenu && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY + 6, right: window.innerWidth - rect.right });
    }
    setShowDownloadMenu(v => !v);
  };

  const downloadCSV = () => {
    const headers = ['Order #', 'Customer', 'Product', 'Quantity', 'Unit', 'Unit Price', 'Total Amount', 'Advance Amount', 'Advance Paid', 'Balance Paid', 'Status', 'Finance', 'PM', 'Date'];
    const rows = orders.map(o => [
      o.order_number, o.customer_name || '', o.product_type,
      o.quantity || '', o.unit || '',
      o.unit_price || '', o.total_amount || '', o.advance_amount || '',
      o.advance_paid ? 'Yes' : 'No', o.balance_paid ? 'Yes' : 'No',
      o.status, o.assigned_finance_name || '', o.assigned_pm_name || '',
      new Date(o.created_at).toLocaleDateString('en-IN'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const downloadExcel = () => {
    const headers = ['Order #', 'Customer', 'Product', 'Quantity', 'Unit', 'Unit Price', 'Total Amount', 'Advance Amount', 'Advance Paid', 'Balance Paid', 'Status', 'Finance', 'PM', 'Date'];
    const rows = orders.map(o => [
      o.order_number, o.customer_name || '', o.product_type,
      o.quantity || '', o.unit || '',
      o.unit_price || '', o.total_amount || '', o.advance_amount || '',
      o.advance_paid ? 'Yes' : 'No', o.balance_paid ? 'Yes' : 'No',
      o.status, o.assigned_finance_name || '', o.assigned_pm_name || '',
      new Date(o.created_at).toLocaleDateString('en-IN'),
    ]);
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Orders"><Table>
      <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
      ${rows.map(r => `<Row>${r.map(v => `<Cell><Data ss:Type="String">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>`).join('')}
    </Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orders.xls'; a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const downloadPDF = () => {
    const rows = orders.map(o => `
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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Orders</title>
      <style>body{font-family:sans-serif;padding:20px}h2{color:#1F2937}table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#2563EB;color:#fff}tr:nth-child(even){background:#f9fafb}</style>
      </head><body><h2>Orders — ${new Date().toLocaleDateString('en-IN')}</h2>
      <p style="color:#6B7280;font-size:12px">Total: ${orders.length} orders</p>
      <table><thead><tr><th>Order #</th><th>Customer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Adv</th><th>Bal</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
    setShowDownloadMenu(false);
  };

  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.product_type?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q)
    );
  });

  const canCreate = ['admin', 'super_admin'].includes(user?.role);

  const getStatusStyle = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.pending_approval;
    if (isDarkMode) {
      return { background: colors.darkBg || 'rgba(100, 116, 139, 0.2)', color: colors.darkText || '#94A3B8' };
    }
    return { background: colors.bg, color: colors.text };
  };

  return (
    <div className={isDarkMode ? "dark-theme orders-page" : "light-theme orders-page"}>
      <div className="orders-container">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Orders</h1>
            <p className="page-subtitle">
              <i className="fas fa-truck"></i>
              Manage all material orders
            </p>
          </div>
          <div className="header-right">
            <div className="stats-badge">
              <i className="fas fa-shopping-cart"></i>
              <span className="stat-number">{orders.length}</span>
              <span className="stat-label">Total Orders</span>
            </div>
            <div ref={downloadRef} className="download-wrapper">
              <button ref={btnRef} className="btn-secondary" onClick={toggleDownloadMenu}>
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
            {canCreate && (
              <button className="btn-primary" onClick={() => navigate('/orders/create')}>
                <i className="fas fa-plus"></i>
                <span>New Order</span>
              </button>
            )}
          </div>
        </div>

        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            className="search-input"
            placeholder="Search by order number, customer, product, or status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <i className="fas fa-box-open"></i>
            </div>
            <h3>No Orders Found</h3>
            <p>No orders match your search criteria</p>
          </div>
        ) : (
          <div className="orders-grid">
            {filtered.map(order => {
              const statusStyle = getStatusStyle(order.status);
              const statusInfo = STATUS_COLORS[order.status] || STATUS_COLORS.pending_approval;
              return (
                <div
                  key={order.id}
                  className="order-card"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <div className="order-card-header">
                    <div className="order-number-wrapper">
                      <i className="fas fa-receipt"></i>
                      <span className="order-number">{order.order_number}</span>
                    </div>
                    <span className="order-status-badge" style={statusStyle}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="order-product-info">
                    <div className="product-icon">
                      {order.product_type === 'concrete' ? '🏗️' : '🧱'}
                    </div>
                    <div className="product-details">
                      <p className="order-product">
                        {order.product_type === 'concrete' ? 'Concrete' : 'Bricks'}
                      </p>
                      {order.quantity && (
                        <p className="order-quantity">
                          {order.quantity} {order.unit || 'units'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {order.customer_name && (
                    <div className="order-customer">
                      <i className="fas fa-user"></i>
                      <span>{order.customer_name}</span>
                    </div>
                  )}
                  
                  {order.total_amount ? (
                    <div className="order-amount">
                      <span className="amount-label">Total Amount</span>
                      <span className="amount-value">₹{Number(order.total_amount).toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="order-amount-pending">
                      <i className="fas fa-clock"></i>
                      <span>Amount Pending</span>
                    </div>
                  )}
                  
                  <div className="order-footer">
                    <div className="order-date">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="order-view">
                      <span>View Details</span>
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;