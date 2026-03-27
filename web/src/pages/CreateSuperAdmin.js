import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './CreateAdmin.css';

// Inline calendar picker (no deps)
const CalendarPicker = ({ value, onChange, placeholder = 'Select date' }) => {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const select = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const isSelected = (day) => {
    if (!value || !day) return false;
    return value === `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const displayValue = () => {
    if (!value) return placeholder;
    const d = new Date(value + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} className="form-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: value ? '#333' : '#999' }}>
        <span>{displayValue()}</span>
        <i className="fas fa-calendar-alt" style={{ color: '#666' }}></i>
      </div>
      {open && (
        <div style={{ position: 'absolute', zIndex: 9999, top: '110%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 12, width: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 8px' }}>‹</button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 8px' }}>›</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, gap: 6 }}>
            <button onClick={() => setViewYear(y => y - 1)} style={{ background: '#f0f0f0', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>-</button>
            <span style={{ fontSize: 12, lineHeight: '22px', color: '#555' }}>{viewYear}</span>
            <button onClick={() => setViewYear(y => y + 1)} style={{ background: '#f0f0f0', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>+</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#888', padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => (
              <div key={i} onClick={() => day && select(day)} style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 6, fontSize: 13, cursor: day ? 'pointer' : 'default', backgroundColor: isSelected(day) ? '#2563EB' : 'transparent', color: isSelected(day) ? '#fff' : day ? '#333' : 'transparent', fontWeight: isSelected(day) ? 600 : 'normal' }}
                onMouseEnter={e => { if (day && !isSelected(day)) e.currentTarget.style.backgroundColor = '#f0f4ff'; }}
                onMouseLeave={e => { if (!isSelected(day)) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                {day || ''}
              </div>
            ))}
          </div>
          {value && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => { onChange(''); setOpen(false); }} style={{ background: 'none', border: 'none', color: '#E53935', cursor: 'pointer', fontSize: 12 }}>Clear date</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CreateSuperAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    date_of_joining: '', date_of_birth: '', city: '',
    current_address: '', permanent_address: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setFormData(f => ({ ...f, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const validateField = (field, value) => {
    let msg = null;
    if (field === 'email' && value && !/\S+@\S+\.\S+/.test(value)) msg = 'Enter a valid email address';
    if (field === 'phone' && value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) msg = 'Phone must be 10 digits';
    if (field === 'password' && value && value.length < 6) msg = 'Password must be at least 6 characters';
    if (field === 'confirmPassword' && value && formData.password !== value) msg = 'Passwords do not match';
    if (msg) setErrors(e => ({ ...e, [field]: msg }));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Full name is required';
    else if (formData.name.trim().length < 2) e.name = 'Name must be at least 2 characters';

    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email address';

    if (!formData.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) e.phone = 'Phone must be 10 digits';

    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 6) e.password = 'Password must be at least 6 characters';

    if (!formData.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      await api.post('/users', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: 'super_admin',
        date_of_joining: formData.date_of_joining || null,
        date_of_birth: formData.date_of_birth || null,
        city: formData.city || null,
        current_address: formData.current_address || null,
        permanent_address: formData.permanent_address || null,
      });
      alert('Super Admin created successfully!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      const serverErrors = {};
      if (msg.toLowerCase().includes('email')) serverErrors.email = msg;
      else if (msg.toLowerCase().includes('phone')) serverErrors.phone = msg;
      else serverErrors._general = msg || 'Failed to create super admin';
      setErrors(e => ({ ...e, ...serverErrors }));
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="page-container">
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <p>Access denied. Only super administrators can create super admins.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
        <div className="page-header">
          <div>
            <button className="btn-back" onClick={() => navigate('/')}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h1 className="page-title">Create New Super Admin</h1>
            <p className="page-subtitle">Add a new super administrator to the system</p>
          </div>
        </div>

        <div className="form-container">
          <div className="form-card">
            <form onSubmit={handleSubmit}>

              <p className="form-section-label">Required Information</p>

              {errors._general && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#DC2626', fontSize: 14 }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>{errors._general}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input type="text" className={`form-input ${errors.name ? 'error' : ''}`} value={formData.name} onChange={e => set('name', e.target.value)} onBlur={e => validateField('name', e.target.value)} placeholder="Enter full name" disabled={loading} />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address <span className="required">*</span></label>
                <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} value={formData.email} onChange={e => set('email', e.target.value)} onBlur={e => validateField('email', e.target.value)} placeholder="Enter email address" disabled={loading} />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number <span className="required">*</span></label>
                <input type="tel" className={`form-input ${errors.phone ? 'error' : ''}`} value={formData.phone} onChange={e => set('phone', e.target.value)} onBlur={e => validateField('phone', e.target.value)} placeholder="Enter 10-digit phone number" disabled={loading} />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Password <span className="required">*</span></label>
                <input type="password" className={`form-input ${errors.password ? 'error' : ''}`} value={formData.password} onChange={e => set('password', e.target.value)} onBlur={e => validateField('password', e.target.value)} placeholder="Enter password (min 6 characters)" disabled={loading} />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password <span className="required">*</span></label>
                <input type="password" className={`form-input ${errors.confirmPassword ? 'error' : ''}`} value={formData.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} onBlur={e => validateField('confirmPassword', e.target.value)} placeholder="Confirm password" disabled={loading} />
                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
              </div>

              <p className="form-section-label" style={{ marginTop: 24 }}>Additional Information (Optional)</p>

              <div className="form-group">
                <label className="form-label">Date of Joining</label>
                <CalendarPicker value={formData.date_of_joining} onChange={v => set('date_of_joining', v)} placeholder="Select date of joining" />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <CalendarPicker value={formData.date_of_birth} onChange={v => set('date_of_birth', v)} placeholder="Select date of birth" />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input type="text" className="form-input" value={formData.city} onChange={e => set('city', e.target.value)} placeholder="Enter city" disabled={loading} />
              </div>

              <div className="form-group">
                <label className="form-label">Current Address</label>
                <textarea className="form-input" value={formData.current_address} onChange={e => set('current_address', e.target.value)} placeholder="Enter current address" rows={2} style={{ resize: 'vertical' }} disabled={loading} />
              </div>

              <div className="form-group">
                <label className="form-label">Permanent Address</label>
                <textarea className="form-input" value={formData.permanent_address} onChange={e => set('permanent_address', e.target.value)} placeholder="Enter permanent address" rows={2} style={{ resize: 'vertical' }} disabled={loading} />
              </div>

              <div className="form-actions">
                <button type="submit" className={`btn-submit ${loading ? 'loading' : ''}`} disabled={loading}>
                  {loading ? <><div className="spinner-small"></div> Creating...</> : <><i className="fas fa-user-shield"></i> Create Super Admin</>}
                </button>
                <button type="button" className="btn-cancel" onClick={() => navigate('/')} disabled={loading}>Cancel</button>
              </div>

            </form>
          </div>
        </div>
      </div>
  );
};

export default CreateSuperAdmin;
