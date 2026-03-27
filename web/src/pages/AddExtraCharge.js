import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AddExtraCharge.css';

const AddExtraCharge = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get project info from navigation state
  const project = location.state?.project;
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    if (!amount) {
      errors.amount = 'Amount is required';
    } else {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.amount = 'Amount must be greater than 0';
      }
    }

    if (!description || description.trim() === '') {
      errors.description = 'Description is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fix the errors before submitting');
      return;
    }

    try {
      setLoading(true);

      const chargeData = {
        projectId: projectId,
        amount: parseFloat(amount),
        description: description.trim(),
      };

      const token = localStorage.getItem('token');
      await api.post(`/payments/extra-charge`, chargeData);

      alert('Extra charge added successfully. Customer will be notified.');
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Error adding extra charge:', err);
      alert(err.response?.data?.message || 'Failed to add extra charge');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value) => {
    setAmount(value);
    if (validationErrors.amount) {
      setValidationErrors({ ...validationErrors, amount: null });
    }
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);
    if (validationErrors.description) {
      setValidationErrors({ ...validationErrors, description: null });
    }
  };

  // Check if user has permission (finance only)
  if (user?.role !== 'finance') {
    return (
      <div className="page-container">
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <p>Access denied. Only finance users can add extra charges.</p>
          <button className="btn-primary" onClick={() => navigate(`/projects/${projectId}`)}>
            Back to Project
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
          <button className="btn-back" onClick={() => navigate(`/projects/${projectId}`)}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <h1 className="page-title">Add Extra Charge</h1>
          <p className="page-subtitle">
            Project: {project?.name || 'Loading...'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="form-container">
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            {/* Amount Field */}
            <div className="form-group">
              <label className="form-label">
                Amount <span className="required">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-input ${validationErrors.amount ? 'error' : ''}`}
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter amount"
                disabled={loading}
              />
              {validationErrors.amount && (
                <span className="error-text">{validationErrors.amount}</span>
              )}
            </div>

            {/* Description Field */}
            <div className="form-group">
              <label className="form-label">
                Description <span className="required">*</span>
              </label>
              <textarea
                className={`form-textarea ${validationErrors.description ? 'error' : ''}`}
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Describe the extra charge (e.g., Additional materials, Extra labor)"
                rows={4}
                disabled={loading}
              />
              {validationErrors.description && (
                <span className="error-text">{validationErrors.description}</span>
              )}
              <span className="helper-text">
                Explain why this extra charge is needed
              </span>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="submit"
                className={`btn-submit ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus"></i>
                    Add Extra Charge
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate(`/projects/${projectId}`)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExtraCharge;