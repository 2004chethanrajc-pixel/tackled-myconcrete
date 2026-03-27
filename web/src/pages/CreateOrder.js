import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Orders.css';

const PRODUCT_TYPES = ['concrete', 'bricks'];
const UNITS = ['units', 'bags', 'cubic meters', 'tonnes', 'loads'];

const CreateOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const [customers, setCustomers] = useState([]);
  const [financeUsers, setFinanceUsers] = useState([]);
  const [pmUsers, setPmUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerId: '',
    assignedFinance: '',
    assignedPm: '',
    productType: 'concrete',
    productDescription: '',
    quantity: '',
    unit: 'units',
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    projectId: '',
    deliveryAddress: '',
    floor: '',
    notes: '',
    unitPrice: '',
    totalAmount: '',
    advanceAmount: '',
  });
  const [showProject, setShowProject] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    Promise.all([
      api.get(`/users?role=customer`),
      api.get(`/users?role=finance`),
      api.get(`/users?role=project_manager`),
      api.get(`/projects`),
    ]).then(([custRes, finRes, pmRes, projRes]) => {
      setCustomers(custRes.data.data?.users || custRes.data.data || []);
      setFinanceUsers(finRes.data.data?.users || finRes.data.data || []);
      setPmUsers(pmRes.data.data?.users || pmRes.data.data || []);
      setProjects(projRes.data.data?.projects || projRes.data.data || []);
    }).catch(console.error)
      .finally(() => setLoadingUsers(false));
  }, [isAdmin]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin && !form.customerId) return alert('Please select a customer');
    if (!form.quantity) return alert('Please enter quantity');
    if (isAdmin && !form.totalAmount) return alert('Please enter total amount');
    if (isAdmin && !form.advanceAmount) return alert('Please enter advance amount');

    try {
      setSubmitting(true);
      const payload = {
        productType: form.productType,
        productDescription: form.productDescription || undefined,
        quantity: Number(form.quantity),
        unit: form.unit,
        driverName: form.driverName || undefined,
        driverPhone: form.driverPhone || undefined,
        vehicleNumber: form.vehicleNumber || undefined,
        projectId: showProject && form.projectId ? form.projectId : undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        floor: form.floor || undefined,
        notes: form.notes || undefined,
      };
      if (isAdmin) {
        payload.customerId = form.customerId;
        if (form.assignedFinance) payload.assignedFinance = form.assignedFinance;
        if (form.assignedPm) payload.assignedPm = form.assignedPm;
        if (form.unitPrice) payload.unitPrice = Number(form.unitPrice);
        payload.totalAmount = Number(form.totalAmount);
        payload.advanceAmount = Number(form.advanceAmount);
      }
      await api.post(`/orders`, payload);
      alert('Order placed successfully');
      navigate('/orders');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="create-order-container">
        <div className="order-detail-header">
          <button className="back-btn" onClick={() => navigate('/orders')}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <h1 className="order-detail-title">New Order</h1>
        </div>

        {/* Info box for non-admin users */}
        {!isAdmin && (
          <div className="info-box">
            <i className="fas fa-info-circle" style={{ color: '#2563EB', marginRight: '8px' }}></i>
            <span className="info-text">
              Your order will be reviewed by admin who will set the amount before you can pay.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer & Finance (admin only) */}
          {isAdmin && (
            <div className="form-section">
              {loadingUsers ? (
                <div className="loading-container" style={{ padding: 20 }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Customer *</label>
                    <select 
                      value={form.customerId} 
                      onChange={e => set('customerId', e.target.value)} 
                      required
                      className="form-select"
                    >
                      <option value="">Select a customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign Finance (optional)</label>
                    <select 
                      value={form.assignedFinance} 
                      onChange={e => set('assignedFinance', e.target.value)}
                      className="form-select"
                    >
                      <option value="">None</option>
                      {financeUsers.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign Project Manager (optional)</label>
                    <select 
                      value={form.assignedPm} 
                      onChange={e => set('assignedPm', e.target.value)}
                      className="form-select"
                    >
                      <option value="">None</option>
                      {pmUsers.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Product */}
          <div className="form-section">
            <div className="form-group">
              <label>Product Type *</label>
              <div className="toggle-group">
                {PRODUCT_TYPES.map(t => (
                  <button
                    key={t} type="button"
                    className={`toggle-btn ${form.productType === t ? 'active' : ''}`}
                    onClick={() => set('productType', t)}
                  >
                    {t === 'concrete' ? '🏗️ Concrete' : '🧱 Bricks'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <input 
                type="text" 
                value={form.productDescription} 
                onChange={e => set('productDescription', e.target.value)} 
                placeholder="e.g. M25 grade concrete"
                className="form-input"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Quantity *</label>
                <input 
                  type="number" 
                  value={form.quantity} 
                  onChange={e => set('quantity', e.target.value)} 
                  placeholder="0" 
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <div className="unit-group">
                  {UNITS.map(u => (
                    <button 
                      key={u} 
                      type="button" 
                      className={`unit-btn ${form.unit === u ? 'active' : ''}`} 
                      onClick={() => set('unit', u)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Driver Details Section */}
            <div style={{ marginTop: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                Driver Details
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Driver Name</label>
                  <input 
                    type="text" 
                    value={form.driverName} 
                    onChange={e => set('driverName', e.target.value)} 
                    placeholder="Driver name"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Driver Phone</label>
                  <input 
                    type="tel" 
                    value={form.driverPhone} 
                    onChange={e => set('driverPhone', e.target.value)} 
                    placeholder="Driver phone number"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Vehicle Number</label>
                <input 
                  type="text" 
                  value={form.vehicleNumber} 
                  onChange={e => set('vehicleNumber', e.target.value)} 
                  placeholder="e.g. MH12AB1234"
                  className="form-input"
                />
              </div>
            </div>

            {/* Project Linking */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span>Link to Project</span>
                <button
                  type="button"
                  onClick={() => { 
                    setShowProject(v => !v); 
                    if (showProject) set('projectId', ''); 
                  }}
                  className={`project-toggle-btn ${showProject ? 'active' : ''}`}
                >
                  {showProject ? 'On' : 'Off'}
                </button>
              </label>
              {showProject && isAdmin && (
                <select 
                  value={form.projectId} 
                  onChange={e => set('projectId', e.target.value)} 
                  className="form-select"
                  style={{ marginTop: '6px' }}
                >
                  <option value="">Select a project (optional)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              {showProject && !isAdmin && (
                <div className="info-text-small" style={{ marginTop: '6px' }}>
                  <i className="fas fa-info-circle"></i> Projects can only be linked by admin
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Delivery Address</label>
              <textarea 
                value={form.deliveryAddress} 
                onChange={e => set('deliveryAddress', e.target.value)} 
                placeholder="Enter delivery address" 
                rows={2}
                className="form-textarea"
              />
            </div>
            
            <div className="form-group">
              <label>Floor (optional)</label>
              <input 
                type="text" 
                value={form.floor} 
                onChange={e => set('floor', e.target.value)} 
                placeholder="e.g. 2nd Floor, Ground Floor"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>Notes</label>
              <textarea 
                value={form.notes} 
                onChange={e => set('notes', e.target.value)} 
                placeholder="Any special instructions..." 
                rows={2}
                className="form-textarea"
              />
            </div>
          </div>

          {/* Pricing (admin only) */}
          {isAdmin && (
            <div className="form-section pricing-section">
              <h3 className="form-section-title">Pricing</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input 
                    type="number" 
                    value={form.unitPrice} 
                    onChange={e => set('unitPrice', e.target.value)} 
                    placeholder="Optional"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Total Amount (₹) *</label>
                  <input 
                    type="number" 
                    value={form.totalAmount} 
                    onChange={e => set('totalAmount', e.target.value)} 
                    placeholder="0" 
                    required
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Advance Amount (₹) *</label>
                <input 
                  type="number" 
                  value={form.advanceAmount} 
                  onChange={e => set('advanceAmount', e.target.value)} 
                  placeholder="0" 
                  required
                  className="form-input"
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }} 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-small"></span> 
                {isAdmin ? 'Placing Order...' : 'Submitting for Approval...'}
              </>
            ) : (
              isAdmin ? 'Place Order' : 'Submit for Approval'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateOrder;