import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Users.css';

const CalendarPicker = ({ value, onChange, placeholder = 'Select date' }) => {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  const displayValue = () => {
    if (!value) return placeholder;
    const d = new Date(value + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isSelected = (day) => {
    if (!value || !day) return false;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return value === `${viewYear}-${mm}-${dd}`;
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div onClick={() => setOpen(o => !o)} className="calendar-trigger">
        <span className={value ? 'has-value' : 'placeholder'}>{displayValue()}</span>
        <i className="fas fa-calendar-alt"></i>
      </div>
      {open && (
        <div className="calendar-dropdown">
          <div className="calendar-header">
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} className="calendar-nav">‹</button>
            <span className="calendar-month-year">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} className="calendar-nav">›</button>
          </div>
          <div className="calendar-year-jump">
            <button onClick={() => setViewYear(y => y - 1)} className="year-jump-btn">-</button>
            <span className="current-year">{viewYear}</span>
            <button onClick={() => setViewYear(y => y + 1)} className="year-jump-btn">+</button>
          </div>
          <div className="calendar-weekdays">
            {DAYS.map(d => <div key={d} className="weekday">{d}</div>)}
          </div>
          <div className="calendar-days">
            {cells.map((day, i) => (
              <div key={i} onClick={() => day && select(day)} className={`calendar-day ${day ? '' : 'empty'} ${isSelected(day) ? 'selected' : ''}`}>
                {day || ''}
              </div>
            ))}
          </div>
          {value && (
            <div className="calendar-clear">
              <button onClick={() => { onChange(''); setOpen(false); }} className="clear-btn">Clear date</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Users = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(null);
  const [activating, setActivating] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', role: 'customer',
    date_of_joining: '', date_of_birth: '', city: '',
    current_address: '', permanent_address: '',
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [updatingUser, setUpdatingUser] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [forcingLogout, setForcingLogout] = useState(false);
  
  // Sorting and Filtering States
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  const roles = [
    { value: 'super_admin', label: 'Super Admin', icon: 'fa-crown', color: '#8B5CF6', order: 1 },
    { value: 'admin', label: 'Admin', icon: 'fa-user-shield', color: '#3B82F6', order: 2 },
    { value: 'project_manager', label: 'Project Manager', icon: 'fa-tasks', color: '#F59E0B', order: 3 },
    { value: 'site_incharge', label: 'Site Incharge', icon: 'fa-hard-hat', color: '#EF4444', order: 4 },
    { value: 'finance', label: 'Finance', icon: 'fa-chart-line', color: '#10B981', order: 5 },
    { value: 'customer', label: 'Customer', icon: 'fa-user', color: '#6B7280', order: 6 },
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setIsDarkMode(savedTheme !== "light");
  }, []);

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get(`/users`);
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const canDeactivateUser = (user) => {
    if (user.role === 'super_admin') return false;
    if (user.role === 'admin' && currentUser?.role !== 'super_admin') return false;
    if (user.id === currentUser?.id) return false;
    if (!user.is_active) return false;
    return true;
  };

  const canActivateUser = (user) => {
    if (user.role === 'admin' && currentUser?.role !== 'super_admin') return false;
    if (user.is_active) return false;
    return true;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users`, formData);
      alert('User created successfully!');
      setShowCreateModal(false);
      setFormData({
        name: '', email: '', phone: '', password: '', role: 'customer',
        date_of_joining: '', date_of_birth: '', city: '',
        current_address: '', permanent_address: '',
      });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDeactivateUser = async (user) => {
    if (!window.confirm(`Are you sure you want to deactivate ${user.name}?`)) return;
    try {
      setDeactivating(user.id);
      await api.patch(`/users/${user.id}/deactivate`, { reason: 'Deactivated by admin' });
      alert('User deactivated successfully');
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setDeactivating(null);
    }
  };

  const handleActivateUser = async (user) => {
    if (!window.confirm(`Are you sure you want to activate ${user.name}?`)) return;
    try {
      setActivating(user.id);
      await api.patch(`/users/${user.id}/activate`, {});
      alert('User activated successfully');
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to activate user');
    } finally {
      setActivating(null);
    }
  };

  const getRoleDetails = (role) => roles.find(r => r.value === role) || roles[5];
  const formatRole = (role) => role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return 'Not provided'; }
  };

  const handleViewUserDetails = async (user) => {
    setSelectedUser(user);
    setSessionStatus(null);
    setShowUserDetailsModal(true);
    try {
      const res = await api.get(`/users/${user.id}/session-status`);
      setSessionStatus(res.data.data);
    } catch { setSessionStatus(null); }
  };

  const handleForceLogout = async () => {
    if (!window.confirm(`Force logout ${selectedUser.name} from all devices?`)) return;
    try {
      setForcingLogout(true);
      const res = await api.delete(`/users/${selectedUser.id}/sessions`);
      alert(res.data.message || 'User logged out from all devices');
      setSessionStatus({ hasActiveSession: false, session: null });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to force logout');
    } finally {
      setForcingLogout(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setEditFormData({
      name: user.name || '', phone: user.phone || '', email: user.email || '',
      date_of_joining: user.date_of_joining ? user.date_of_joining.split('T')[0] : '',
      date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
      city: user.city || '', current_address: user.current_address || '',
      permanent_address: user.permanent_address || '',
      role: user.role || '',
    });
    setShowUserDetailsModal(false);
    setShowEditModal(true);
  };

  const handleUpdateUserDetails = async (e) => {
    e.preventDefault();
    try {
      setUpdatingUser(true);
      const payload = {
        name: editFormData.name || undefined, phone: editFormData.phone || null,
        email: editFormData.email || undefined, date_of_joining: editFormData.date_of_joining || null,
        date_of_birth: editFormData.date_of_birth || null, city: editFormData.city || null,
        current_address: editFormData.current_address || null,
        permanent_address: editFormData.permanent_address || null,
      };
      const response = await api.patch(`/users/${selectedUser.id}/details`, payload);
      let updatedUser = response.data.data?.user || response.data.user;

      // Also update role if it changed
      if (editFormData.role && editFormData.role !== selectedUser.role) {
        const roleRes = await api.patch(`/users/${selectedUser.id}/role`, { role: editFormData.role });
        updatedUser = roleRes.data.data?.user || updatedUser;
      }

      setSelectedUser({ ...selectedUser, ...updatedUser });
      setShowEditModal(false);
      setShowUserDetailsModal(true);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update user details');
    } finally {
      setUpdatingUser(false);
    }
  };

  const getFilteredAndSortedUsers = () => {
    let filtered = [...users];
    if (filterRole !== 'all') filtered = filtered.filter(user => user.role === filterRole);
    if (filterStatus !== 'all') filtered = filtered.filter(user => filterStatus === 'active' ? user.is_active : !user.is_active);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.toLowerCase().includes(query)) || user.role.toLowerCase().includes(query)
      );
    }
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch(sortBy) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'role':
          const roleOrder = { super_admin: 1, admin: 2, project_manager: 3, site_incharge: 4, finance: 5, customer: 6 };
          aVal = roleOrder[a.role] || 999; bVal = roleOrder[b.role] || 999; break;
        case 'status': aVal = a.is_active ? 1 : 0; bVal = b.is_active ? 1 : 0; break;
        case 'joined': aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
        default: aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase();
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return filtered;
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const getSortIcon = (field) => sortBy !== field ? 'fa-sort' : (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
  const filteredUsers = getFilteredAndSortedUsers();

  const stats = {
    total: users.length, active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    byRole: {
      super_admin: users.filter(u => u.role === 'super_admin').length,
      admin: users.filter(u => u.role === 'admin').length,
      project_manager: users.filter(u => u.role === 'project_manager').length,
      site_incharge: users.filter(u => u.role === 'site_incharge').length,
      finance: users.filter(u => u.role === 'finance').length,
      customer: users.filter(u => u.role === 'customer').length,
    }
  };

  const clearFilters = () => {
    setFilterRole('all'); setFilterStatus('all'); setSearchQuery(''); setSortBy('name'); setSortOrder('asc');
  };

  return (
    <div className={isDarkMode ? "dark-theme users-page" : "light-theme users-page"}>
      <div className="users-container">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage system users, roles, and permissions</p>
          </div>
          <div className="header-right">
            {currentUser?.role === 'super_admin' && (
              <button className="btn-warning" onClick={() => navigate('/create-admin')}>
                <i className="fas fa-user-plus"></i> Add Admin
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus"></i> Create User
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card total"><div className="stat-icon"><i className="fas fa-users"></i></div><div className="stat-info"><h3>{stats.total}</h3><span>Total Users</span></div></div>
          <div className="stat-card active"><div className="stat-icon"><i className="fas fa-user-check"></i></div><div className="stat-info"><h3>{stats.active}</h3><span>Active Users</span></div></div>
          <div className="stat-card inactive"><div className="stat-icon"><i className="fas fa-user-slash"></i></div><div className="stat-info"><h3>{stats.inactive}</h3><span>Inactive Users</span></div></div>
          <div className="stat-card admins"><div className="stat-icon"><i className="fas fa-user-shield"></i></div><div className="stat-info"><h3>{stats.admins}</h3><span>Administrators</span></div></div>
        </div>

        <div className="search-filter-section">
          <div className="search-container">
            <i className="fas fa-search search-icon"></i>
            <input type="text" className="search-input" placeholder="Search by name, email, phone, or role..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button className={`filter-toggle-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <i className="fas fa-sliders-h"></i> Filters {(filterRole !== 'all' || filterStatus !== 'all') && <span className="filter-badge">!</span>}
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-header"><h3><i className="fas fa-filter"></i> Filter Users</h3><button className="clear-filters-btn" onClick={clearFilters}><i className="fas fa-times"></i> Clear All</button></div>
            <div className="filters-grid">
              <div className="filter-group"><label>Role</label><div className="role-filter-buttons">
                <button className={`role-filter-btn ${filterRole === 'all' ? 'active' : ''}`} onClick={() => setFilterRole('all')}>All ({stats.total})</button>
                {roles.map(role => <button key={role.value} className={`role-filter-btn ${filterRole === role.value ? 'active' : ''}`} onClick={() => setFilterRole(role.value)} style={{ '--role-color': role.color }}><i className={`fas ${role.icon}`}></i>{role.label} ({stats.byRole[role.value] || 0})</button>)}
              </div></div>
              <div className="filter-group"><label>Account Status</label><div className="status-filter-buttons">
                <button className={`status-filter-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All ({stats.total})</button>
                <button className={`status-filter-btn active-status ${filterStatus === 'active' ? 'active' : ''}`} onClick={() => setFilterStatus('active')}><i className="fas fa-check-circle"></i> Active ({stats.active})</button>
                <button className={`status-filter-btn inactive-status ${filterStatus === 'inactive' ? 'active' : ''}`} onClick={() => setFilterStatus('inactive')}><i className="fas fa-ban"></i> Inactive ({stats.inactive})</button>
              </div></div>
              <div className="filter-group"><label>Sort By</label><div className="sort-buttons">
                <button className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`} onClick={() => handleSort('name')}><i className={`fas ${getSortIcon('name')}`}></i> Name</button>
                <button className={`sort-btn ${sortBy === 'role' ? 'active' : ''}`} onClick={() => handleSort('role')}><i className={`fas ${getSortIcon('role')}`}></i> Role</button>
                <button className={`sort-btn ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}><i className={`fas ${getSortIcon('status')}`}></i> Status</button>
                <button className={`sort-btn ${sortBy === 'joined' ? 'active' : ''}`} onClick={() => handleSort('joined')}><i className={`fas ${getSortIcon('joined')}`}></i> Joined Date</button>
              </div></div>
            </div>
            {(filterRole !== 'all' || filterStatus !== 'all' || searchQuery) && (
              <div className="active-filters"><span>Active Filters:</span>
                {filterRole !== 'all' && <span className="active-filter-tag">Role: {roles.find(r => r.value === filterRole)?.label}<button onClick={() => setFilterRole('all')}>×</button></span>}
                {filterStatus !== 'all' && <span className="active-filter-tag">Status: {filterStatus === 'active' ? 'Active' : 'Inactive'}<button onClick={() => setFilterStatus('all')}>×</button></span>}
                {searchQuery && <span className="active-filter-tag">Search: {searchQuery}<button onClick={() => setSearchQuery('')}>×</button></span>}
              </div>
            )}
          </div>
        )}

        <div className="results-count"><span><i className="fas fa-users"></i> Showing {filteredUsers.length} of {stats.total} users</span></div>

        {loading ? (
          <div className="loading-container"><div className="spinner"></div><p>Loading users...</p></div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon-wrapper"><i className="fas fa-users-slash"></i></div><h3>No Users Found</h3><p>Try adjusting your filters or search criteria</p><button className="btn-primary" onClick={clearFilters}><i className="fas fa-undo"></i> Clear All Filters</button></div>
        ) : (
          <div className="users-grid">
            {filteredUsers.map((user, index) => {
              const roleDetails = getRoleDetails(user.role);
              return (
                <div key={user.id} className={`user-card ${!user.is_active ? 'inactive-user' : ''}`} onClick={() => handleViewUserDetails(user)} style={{ '--card-index': index }}>
                  <div className="user-card-header">
                    <div className="user-avatar" style={{ background: roleDetails.color }}><span>{user.name.charAt(0).toUpperCase()}</span></div>
                    <div className="user-badges">
                      <span className="role-badge" style={{ background: roleDetails.color }}><i className={`fas ${roleDetails.icon}`}></i>{formatRole(user.role)}</span>
                      {!user.is_active && <span className="status-badge inactive"><i className="fas fa-ban"></i> Inactive</span>}
                    </div>
                  </div>
                  <div className="user-card-body"><h3 className="user-name">{user.name}</h3><div className="user-contact"><p className="user-email"><i className="fas fa-envelope"></i><a href={`mailto:${user.email}`} onClick={e => e.stopPropagation()}>{user.email}</a></p>{user.phone && <p className="user-phone"><i className="fas fa-phone"></i><a href={`tel:${user.phone}`} onClick={e => e.stopPropagation()}>{user.phone}</a></p>}</div>{user.city && <div className="user-location"><i className="fas fa-map-marker-alt"></i><span>{user.city}</span></div>}</div>
                  <div className="user-card-footer"><div className="user-joined"><i className="fas fa-calendar-alt"></i><span>Joined {formatDate(user.created_at)}</span></div><div className={`user-status ${user.is_active ? 'active' : 'inactive'}`}><i className={`fas fa-circle ${user.is_active ? 'active-dot' : 'inactive-dot'}`}></i>{user.is_active ? 'Active' : 'Inactive'}</div></div>
                  {(canDeactivateUser(user) || canActivateUser(user)) && (
                    <div className="user-actions">
                      {canDeactivateUser(user) && <button className="action-btn deactivate" onClick={(e) => { e.stopPropagation(); handleDeactivateUser(user); }} disabled={deactivating === user.id}>{deactivating === user.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-slash"></i>} Deactivate</button>}
                      {canActivateUser(user) && <button className="action-btn activate" onClick={(e) => { e.stopPropagation(); handleActivateUser(user); }} disabled={activating === user.id}>{activating === user.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-check"></i>} Activate</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2><i className="fas fa-user-plus"></i> Create New User</h2><button className="modal-close" onClick={() => setShowCreateModal(false)}><i className="fas fa-times"></i></button></div>
            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-row"><div className="form-group"><label>Full Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter full name" /></div>
              <div className="form-group"><label>Email Address *</label><input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email address" /></div></div>
              <div className="form-row"><div className="form-group"><label>Phone Number *</label><input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter phone number" /></div>
              <div className="form-group"><label>Password *</label><input type="password" required minLength="6" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter password (min 6 characters)" /></div></div>
              <div className="form-row"><div className="form-group"><label>User Role *</label><select required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
              <div className="form-group"><label>City</label><input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Enter city" /></div></div>
              <div className="form-row"><div className="form-group"><label>Date of Joining</label><CalendarPicker value={formData.date_of_joining} onChange={(val) => setFormData({ ...formData, date_of_joining: val })} placeholder="Select date of joining" /></div>
              <div className="form-group"><label>Date of Birth</label><CalendarPicker value={formData.date_of_birth} onChange={(val) => setFormData({ ...formData, date_of_birth: val })} placeholder="Select date of birth" /></div></div>
              <div className="form-group"><label>Current Address</label><textarea value={formData.current_address} onChange={(e) => setFormData({ ...formData, current_address: e.target.value })} placeholder="Enter current address" rows="2" /></div>
              <div className="form-group"><label>Permanent Address</label><textarea value={formData.permanent_address} onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })} placeholder="Enter permanent address" rows="2" /></div>
              <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button><button type="submit" className="btn-primary"><i className="fas fa-check"></i> Create User</button></div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserDetailsModal(false)}>
          <div className="modal-content modal-details" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2><i className="fas fa-user-circle"></i> User Profile</h2><button className="modal-close" onClick={() => setShowUserDetailsModal(false)}><i className="fas fa-times"></i></button></div>
            <div className="modal-form">
              <div className="profile-header-details"><div className="profile-avatar-details" style={{ background: getRoleDetails(selectedUser.role).color }}><span>{selectedUser.name.charAt(0).toUpperCase()}</span></div>
              <div className="profile-info-details"><h3>{selectedUser.name}</h3><div className="profile-role-details" style={{ background: getRoleDetails(selectedUser.role).color }}><i className={`fas ${getRoleDetails(selectedUser.role).icon}`}></i>{formatRole(selectedUser.role)}</div>
              <div className={`profile-status-details ${selectedUser.is_active ? 'active' : 'inactive'}`}><i className={`fas fa-circle ${selectedUser.is_active ? 'active-dot' : 'inactive-dot'}`}></i>{selectedUser.is_active ? 'Active Account' : 'Inactive Account'}</div></div></div>
              <div className="details-section"><h4><i className="fas fa-user"></i> Personal Information</h4><div className="details-grid">
                <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#3B82F615' }}><i className="fas fa-envelope" style={{ color: '#3B82F6' }}></i></div><div className="detail-content-details"><label>Email Address</label><p><a href={`mailto:${selectedUser.email}`}>{selectedUser.email}</a></p></div></div>
                <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#10B98115' }}><i className="fas fa-phone" style={{ color: '#10B981' }}></i></div><div className="detail-content-details"><label>Phone Number</label><p>{selectedUser.phone ? <a href={`tel:${selectedUser.phone}`}>{selectedUser.phone}</a> : 'Not provided'}</p></div></div>
                <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#8B5CF615' }}><i className="fas fa-calendar-day" style={{ color: '#8B5CF6' }}></i></div><div className="detail-content-details"><label>Date of Joining</label><p>{formatDate(selectedUser.date_of_joining)}</p></div></div>
                <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#EC489915' }}><i className="fas fa-birthday-cake" style={{ color: '#EC4899' }}></i></div><div className="detail-content-details"><label>Date of Birth</label><p>{formatDate(selectedUser.date_of_birth)}</p></div></div>
              </div></div>
              <div className="details-section"><h4><i className="fas fa-map-marker-alt"></i> Address Information</h4><div className="details-grid">
                <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#F59E0B15' }}><i className="fas fa-map-marker-alt" style={{ color: '#F59E0B' }}></i></div><div className="detail-content-details"><label>City</label><p>{selectedUser.city || 'Not provided'}</p></div></div>
                <div className="detail-item-details full-width"><div className="detail-icon-details" style={{ backgroundColor: '#3B82F615' }}><i className="fas fa-home" style={{ color: '#3B82F6' }}></i></div><div className="detail-content-details"><label>Current Address</label><p>{selectedUser.current_address || 'Not provided'}</p></div></div>
                <div className="detail-item-details full-width"><div className="detail-icon-details" style={{ backgroundColor: '#10B98115' }}><i className="fas fa-building" style={{ color: '#10B981' }}></i></div><div className="detail-content-details"><label>Permanent Address</label><p>{selectedUser.permanent_address || 'Not provided'}</p></div></div>
              </div></div>
              <div className="details-section"><h4><i className="fas fa-chart-line"></i> Account Information</h4><div className="details-grid">
                <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#8B5CF615' }}><i className="fas fa-calendar-alt" style={{ color: '#8B5CF6' }}></i></div><div className="detail-content-details"><label>Account Created</label><p>{formatDate(selectedUser.created_at)}</p></div></div>
                <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#10B98115' }}><i className="fas fa-check-circle" style={{ color: '#10B981' }}></i></div><div className="detail-content-details"><label>Account Status</label><p style={{ color: selectedUser.is_active ? '#10B981' : '#EF4444', fontWeight: 600 }}>{selectedUser.is_active ? 'Active' : 'Inactive'}</p></div></div>
                {sessionStatus !== null && <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#F59E0B15' }}><i className="fas fa-mobile-alt" style={{ color: '#F59E0B' }}></i></div><div className="detail-content-details"><label>Active Session</label><p className={sessionStatus.hasActiveSession ? 'session-active' : 'session-inactive'}>{sessionStatus.hasActiveSession ? 'User is currently logged in' : 'No active session'}</p></div></div>}
                {selectedUser.active_projects > 0 && <div className="detail-item-details"><div className="detail-icon-details" style={{ backgroundColor: '#3B82F615' }}><i className="fas fa-project-diagram" style={{ color: '#3B82F6' }}></i></div><div className="detail-content-details"><label>Active Projects</label><p className="project-count">{selectedUser.active_projects}</p></div></div>}
              </div></div>
              <div className="modal-actions">
                {((currentUser?.role === 'admin' && !['admin', 'super_admin'].includes(selectedUser.role)) || (currentUser?.role === 'super_admin' && selectedUser.role !== 'super_admin')) && <button type="button" className="btn-primary" onClick={() => handleOpenEditModal(selectedUser)}><i className="fas fa-edit"></i> Edit Details</button>}
                {sessionStatus?.hasActiveSession && selectedUser.id !== currentUser?.id && ((currentUser?.role === 'admin' && !['admin', 'super_admin'].includes(selectedUser.role)) || currentUser?.role === 'super_admin') && <button type="button" className="btn-warning" onClick={handleForceLogout} disabled={forcingLogout}>{forcingLogout ? <><i className="fas fa-spinner fa-spin"></i> Logging out...</> : <><i className="fas fa-sign-out-alt"></i> Logout All Devices</>}</button>}
                <button type="button" className="btn-secondary" onClick={() => setShowUserDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setShowUserDetailsModal(true); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2><i className="fas fa-edit"></i> Edit User Details</h2><button className="modal-close" onClick={() => { setShowEditModal(false); setShowUserDetailsModal(true); }}><i className="fas fa-times"></i></button></div>
            <form onSubmit={handleUpdateUserDetails} className="modal-form">
              <div className="form-group"><label>Full Name *</label><input type="text" required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} placeholder="Full name" /></div>
              <div className="form-row"><div className="form-group"><label>Phone</label><input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} placeholder="Phone number" /></div>
              <div className="form-group"><label>Email</label><input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} placeholder="Email address" /></div></div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  disabled={
                    // Cannot change super_admin role unless you are super_admin editing someone else
                    (selectedUser.role === 'super_admin' && currentUser?.id !== selectedUser.id) ||
                    // Admin cannot change role of admin/super_admin
                    (currentUser?.role === 'admin' && ['admin', 'super_admin'].includes(selectedUser.role))
                  }
                >
                  {currentUser?.role === 'super_admin' ? (
                    <>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="site_incharge">Site Incharge</option>
                      <option value="finance">Finance</option>
                      <option value="customer">Customer</option>
                    </>
                  ) : (
                    // Admin can change roles of non-admin users
                    <>
                      <option value="project_manager">Project Manager</option>
                      <option value="site_incharge">Site Incharge</option>
                      <option value="finance">Finance</option>
                      <option value="customer">Customer</option>
                    </>
                  )}
                </select>
                {editFormData.role !== selectedUser.role && (
                  <span style={{ fontSize: 12, color: '#F59E0B', marginTop: 4, display: 'block' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
                    Role will change from <strong>{selectedUser.role.replace(/_/g, ' ')}</strong> to <strong>{editFormData.role.replace(/_/g, ' ')}</strong>
                  </span>
                )}
              </div>
              <div className="form-row"><div className="form-group"><label>Date of Joining</label><CalendarPicker value={editFormData.date_of_joining} onChange={(val) => setEditFormData({ ...editFormData, date_of_joining: val })} placeholder="Select date of joining" /></div>
              <div className="form-group"><label>Date of Birth</label><CalendarPicker value={editFormData.date_of_birth} onChange={(val) => setEditFormData({ ...editFormData, date_of_birth: val })} placeholder="Select date of birth" /></div></div>
              <div className="form-group"><label>City</label><input type="text" value={editFormData.city} onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })} placeholder="Enter city" /></div>
              <div className="form-group"><label>Current Address</label><textarea value={editFormData.current_address} onChange={(e) => setEditFormData({ ...editFormData, current_address: e.target.value })} placeholder="Enter current address" rows="2" /></div>
              <div className="form-group"><label>Permanent Address</label><textarea value={editFormData.permanent_address} onChange={(e) => setEditFormData({ ...editFormData, permanent_address: e.target.value })} placeholder="Enter permanent address" rows="2" /></div>
              <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => { setShowEditModal(false); setShowUserDetailsModal(true); }}>Cancel</button><button type="submit" className="btn-primary" disabled={updatingUser}>{updatingUser ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Save Changes'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;