import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Payments.css';

const Payments = () => {
  const { user } = useAuth();
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifying, setVerifying] = useState(null);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {};

      // Fetch all projects
      const projectsResponse = await api.get(`/projects`);
      const projects = projectsResponse.data.data.projects || [];

      // Fetch payments for each project
      const allPendingPayments = [];
      for (const project of projects) {
        try {
          const paymentsResponse = await api.get(`/payments/project/${project.id}`);
          const payments = paymentsResponse.data.data.payments || [];

          // Filter pending payments that have payment_method (customer has paid)
          const pending = payments
            .filter(p => p.status === 'pending' && p.payment_method !== null)
            .map(p => ({
              ...p,
              project_name: project.name,
              project_location: project.location,
            }));

          allPendingPayments.push(...pending);
        } catch (err) {
          console.error(`Error fetching payments for project ${project.id}:`, err);
        }
      }

      // Sort by created_at (most recent first)
      allPendingPayments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setPendingPayments(allPendingPayments);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (payment) => {
    if (!window.confirm(`Verify payment of ₹${Number(payment.amount).toFixed(2)} for ${payment.project_name}?\n\nPayment Method: ${payment.payment_method}\nUPI ID: ${payment.upi_id || 'N/A'}`)) {
      return;
    }

    try {
      setVerifying(payment.id);
      const token = localStorage.getItem('token');

      await api.patch(`/payments/${payment.id}/verify`, {});

      alert('Payment verified successfully!');
      await fetchPendingPayments(); // Refresh the list
    } catch (err) {
      console.error('Error verifying payment:', err);
      alert(err.response?.data?.message || 'Failed to verify payment');
    } finally {
      setVerifying(null);
    }
  };

  const getPaymentTypeLabel = (type) => {
    switch (type) {
      case 'advance':
        return 'Advance Payment';
      case 'final':
        return 'Final Payment';
      case 'extra':
        return 'Extra Charge';
      default:
        return 'Payment';
    }
  };

  const filteredPayments = pendingPayments.filter((payment) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.project_name?.toLowerCase().includes(query) ||
      payment.amount?.toString().includes(query) ||
      payment.type?.toLowerCase().includes(query) ||
      payment.payment_method?.toLowerCase().includes(query)
    );
  });

  // Only show this page to finance users
  if (user?.role !== 'finance' && user?.role !== 'super_admin') {
    return (
      <div className="page-container">
        <div className="error-container">
          <i className="fas fa-lock"></i>
          <p>Access denied. Only finance users can verify payments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Verify Payments</h1>
          <p className="page-subtitle">Review and verify pending payments</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-number">{filteredPayments.length}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="search-container">
        <i className="fas fa-search search-icon"></i>
        <input
          type="text"
          className="search-input"
          placeholder="Search by project, amount, type, or payment method..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading pending payments...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-check-circle empty-icon success"></i>
          <h3>All Caught Up!</h3>
          <p>No pending payments to verify</p>
        </div>
      ) : (
        <div className="payments-grid">
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <div className="payment-info">
                  <h3 className="project-name">{payment.project_name}</h3>
                  <p className="project-location">
                    <i className="fas fa-map-marker-alt"></i>
                    {payment.project_location}
                  </p>
                  <p className="payment-type">
                    <i className="fas fa-tag"></i>
                    {getPaymentTypeLabel(payment.type)}
                  </p>
                  {payment.description && (
                    <p className="payment-description">
                      <i className="fas fa-info-circle"></i>
                      {payment.description}
                    </p>
                  )}
                </div>
                <div className="amount-badge">
                  <span className="amount">₹{Number(payment.amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="payment-details">
                <div className="detail-row">
                  <span className="detail-label">Payment Method:</span>
                  <span className="detail-value">{payment.payment_method}</span>
                </div>
                {payment.upi_id && (
                  <div className="detail-row">
                    <span className="detail-label">UPI ID:</span>
                    <span className="detail-value">{payment.upi_id}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                className="verify-button"
                onClick={() => handleVerifyPayment(payment)}
                disabled={verifying === payment.id}
              >
                {verifying === payment.id ? (
                  <>
                    <div className="spinner-small"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Verify Payment
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Payments;
