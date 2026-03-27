import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AuditLogs.css';

const AuditLogs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get role filter from navigation state
  const roleFilter = location.state?.role;
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(roleFilter || 'all');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/audit`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100, page: 1 }
      });
      
      setLogs(response.data.data.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return '#10b981';
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) return '#ef4444';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return '#f59e0b';
    if (action.includes('LOGIN')) return '#3b82f6';
    if (action.includes('ASSIGN')) return '#8b5cf6';
    if (action.includes('VERIFY')) return '#06b6d4';
    if (action.includes('SHARED') || action.includes('EXPORT')) return '#7c3aed';
    return '#6b7280';
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      project_manager: 'Project Manager',
      site_incharge: 'Site Incharge',
      finance: 'Finance',
      customer: 'Customer'
    };
    return roleNames[role] || role;
  };

  // Filter logs based on selected role
  const filteredLogs = selectedRole === 'all' 
    ? logs 
    : logs.filter(log => log.performed_by_role === selectedRole);

  // Check if user has permission (admin and super_admin)
  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <p>Access denied. Only administrators can view audit logs.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchAuditLogs}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">
            {selectedRole === 'all' 
              ? `All Activities (${filteredLogs.length} logs)`
              : `${getRoleDisplayName(selectedRole)} Activities (${filteredLogs.length} logs)`
            }
          </p>
        </div>
      </div>

      {/* Role Filter */}
      <div className="filter-container">
        <div className="filter-card">
          <label className="filter-label">Filter by Role:</label>
          <select 
            className="filter-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="project_manager">Project Manager</option>
            <option value="site_incharge">Site Incharge</option>
            <option value="finance">Finance</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-clipboard-list"></i>
            <p>No audit logs found</p>
            {selectedRole !== 'all' && (
              <button 
                className="btn-secondary"
                onClick={() => setSelectedRole('all')}
              >
                View All Logs
              </button>
            )}
          </div>
        ) : (
          <div className="logs-grid">
            {filteredLogs.map((log) => (
              <div key={log.id} className="log-card">
                <div className="log-header">
                  <div 
                    className="action-badge"
                    style={{ backgroundColor: getActionColor(log.action) }}
                  >
                    {log.action}
                  </div>
                  <div className="log-time">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="log-description">
                  {log.description}
                </div>
                
                <div className="log-user">
                  <div className="user-info">
                    <span className="user-name">{log.performed_by_name}</span>
                    <span className="user-role">
                      ({getRoleDisplayName(log.performed_by_role)})
                    </span>
                  </div>
                  <div className="log-date">
                    {new Date(log.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;