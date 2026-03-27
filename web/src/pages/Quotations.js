import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Quotations.css';

const Quotations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [projects, setProjects] = useState([]);
  const [projectsNeedingQuotations, setProjectsNeedingQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [quotationForm, setQuotationForm] = useState({
    materialCost: '',
    labourCost: '',
    transportCost: '',
    otherCost: '',
    totalCost: '',
    advanceAmount: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/projects`);
      
      const allProjects = response.data.data.projects || [];
      
      // Projects that already have quotations
      const projectsWithQuotations = allProjects.filter(p => 
        ['QUOTATION_GENERATED', 'CUSTOMER_APPROVED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 
         'WORK_STARTED', 'COMPLETED', 'FINAL_PAID', 'CLOSED'].includes(p.status)
      );
      
      // Projects that need quotations (REPORT_SUBMITTED status)
      const projectsNeedingQuotations = allProjects.filter(p => 
        p.status === 'REPORT_SUBMITTED' && 
        (user?.role === 'finance' && p.finance_id === user.id)
      );
      
      setProjects(projectsWithQuotations);
      setProjectsNeedingQuotations(projectsNeedingQuotations);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuotation = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/quotations/project/${projectId}`);
      
      if (response.data.success && response.data.data?.quotations?.length > 0) {
        const quotation = response.data.data.quotations[0];
        navigate(`/quotations/${quotation.id}`, { 
          state: { quotation, projectId } 
        });
      } else {
        alert('No quotation found for this project');
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      alert(error.response?.data?.message || 'Failed to load quotation');
    }
  };

  const handleGenerateQuotation = (project) => {
    setSelectedProject(project);
    setQuotationForm({
      materialCost: '',
      labourCost: '',
      transportCost: '',
      otherCost: '',
      totalCost: '',
      advanceAmount: ''
    });
    setValidationErrors({});
    setShowCreateModal(true);
  };

  // Auto-calculate total cost
  React.useEffect(() => {
    const material = parseFloat(quotationForm.materialCost) || 0;
    const labour = parseFloat(quotationForm.labourCost) || 0;
    const transport = parseFloat(quotationForm.transportCost) || 0;
    const other = parseFloat(quotationForm.otherCost) || 0;
    
    const calculated = material + labour + transport + other;
    setQuotationForm(prev => ({
      ...prev,
      totalCost: calculated > 0 ? calculated.toFixed(2) : ''
    }));
  }, [quotationForm.materialCost, quotationForm.labourCost, quotationForm.transportCost, quotationForm.otherCost]);

  const validateForm = () => {
    const errors = {};

    if (!quotationForm.materialCost) {
      errors.materialCost = 'Material cost is required';
    } else {
      const cost = parseFloat(quotationForm.materialCost);
      if (isNaN(cost) || cost < 0) {
        errors.materialCost = 'Material cost cannot be negative';
      }
    }

    if (!quotationForm.labourCost) {
      errors.labourCost = 'Labour cost is required';
    } else {
      const cost = parseFloat(quotationForm.labourCost);
      if (isNaN(cost) || cost < 0) {
        errors.labourCost = 'Labour cost cannot be negative';
      }
    }

    if (!quotationForm.transportCost) {
      errors.transportCost = 'Transport cost is required';
    } else {
      const cost = parseFloat(quotationForm.transportCost);
      if (isNaN(cost) || cost < 0) {
        errors.transportCost = 'Transport cost cannot be negative';
      }
    }

    if (!quotationForm.otherCost) {
      errors.otherCost = 'Other cost is required (enter 0 if none)';
    } else {
      const cost = parseFloat(quotationForm.otherCost);
      if (isNaN(cost) || cost < 0) {
        errors.otherCost = 'Other cost cannot be negative';
      }
    }

    if (!quotationForm.totalCost) {
      errors.totalCost = 'Total cost is required';
    } else {
      const total = parseFloat(quotationForm.totalCost);
      if (isNaN(total) || total < 0) {
        errors.totalCost = 'Total cost cannot be negative';
      }
    }

    if (quotationForm.advanceAmount) {
      const advance = parseFloat(quotationForm.advanceAmount);
      const total = parseFloat(quotationForm.totalCost);
      if (isNaN(advance) || advance < 0) {
        errors.advanceAmount = 'Advance amount cannot be negative';
      } else if (advance > total) {
        errors.advanceAmount = 'Advance amount cannot exceed total cost';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitQuotation = async () => {
    if (!validateForm()) {
      alert('Please fix the errors before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const quotationData = {
        projectId: selectedProject.id,
        materialCost: parseFloat(quotationForm.materialCost) || 0,
        labourCost: parseFloat(quotationForm.labourCost) || 0,
        transportCost: parseFloat(quotationForm.transportCost) || 0,
        otherCost: parseFloat(quotationForm.otherCost) || 0,
        totalCost: parseFloat(quotationForm.totalCost) || 0,
        advanceAmount: quotationForm.advanceAmount ? parseFloat(quotationForm.advanceAmount) : 0,
      };

      await api.post(`/quotations`, quotationData);

      alert('Quotation generated successfully!');
      setShowCreateModal(false);
      fetchProjects();
    } catch (error) {
      console.error('Error generating quotation:', error);
      alert(error.response?.data?.message || 'Failed to generate quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      QUOTATION_GENERATED: '#f59e0b',
      CUSTOMER_APPROVED: '#10b981',
      ADVANCE_PENDING: '#f97316',
      ADVANCE_PAID: '#22c55e',
      WORK_STARTED: '#3b82f6',
      COMPLETED: '#10b981',
      FINAL_PAID: '#06b6d4',
      CLOSED: '#64748b',
    };
    return statusColors[status] || '#757575';
  };

  const filteredProjects = projects.filter((project) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (project.name?.toLowerCase() || '').includes(query) ||
      (project.location?.toLowerCase() || '').includes(query) ||
      (project.status?.toLowerCase() || '').includes(query)
    );
  });

  return (
    <div className={isDarkMode ? "dark-theme quotations-page" : "light-theme quotations-page"}>
      <div className="quotations-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Quotations</h1>
            <p className="page-subtitle">
              <i className="fas fa-file-invoice-dollar"></i>
              View and manage all project quotations
            </p>
          </div>
          <div className="header-right">
            <div className="stats-badge">
              <i className="fas fa-file-invoice"></i>
              <span className="stat-number">{filteredProjects.length}</span>
              <span className="stat-label">Total Quotations</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Search by project name, location, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Projects Needing Quotations - Finance Only */}
        {user?.role === 'finance' && projectsNeedingQuotations.length > 0 && (
          <div className="section">
            <h2 className="section-title">
              <i className="fas fa-exclamation-triangle text-warning"></i>
              Projects Needing Quotations
            </h2>
            <div className="quotations-grid">
              {projectsNeedingQuotations.map((project) => (
                <div key={project.id} className="quotation-card pending">
                  <div className="card-badge pending-badge">
                    <i className="fas fa-clock"></i>
                    <span>Needs Quotation</span>
                  </div>
                  
                  <div className="quotation-icon pending-icon">
                    <i className="fas fa-file-invoice"></i>
                  </div>
                  
                  <h3 className="quotation-title">{project.name}</h3>
                  
                  <div className="quotation-details">
                    <div className="detail-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{project.location}</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button 
                    className="btn-generate"
                    onClick={() => handleGenerateQuotation(project)}
                  >
                    <i className="fas fa-plus-circle"></i>
                    <span>Generate Quotation</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Quotations */}
        <div className="section">
          <h2 className="section-title">
            <i className="fas fa-check-circle text-success"></i>
            Existing Quotations
          </h2>
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading quotations...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <i className="fas fa-file-invoice"></i>
              </div>
              <h3>No Quotations Found</h3>
              <p>No quotations available for any projects</p>
            </div>
          ) : (
            <div className="quotations-grid">
              {filteredProjects.map((project) => (
                <div key={project.id} className="quotation-card">
                  <div className="card-header">
                    <div className="status-badge" style={{ backgroundColor: getStatusColor(project.status) }}>
                      {project.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                  
                  <div className="quotation-icon">
                    <i className="fas fa-file-invoice-dollar"></i>
                  </div>
                  
                  <h3 className="quotation-title">{project.name}</h3>
                  
                  <div className="quotation-details">
                    <div className="detail-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{project.location}</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button 
                    className="btn-view"
                    onClick={() => handleViewQuotation(project.id)}
                  >
                    <i className="fas fa-eye"></i>
                    <span>View Quotation</span>
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate Quotation Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowCreateModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-file-invoice"></i>
                Generate Quotation
              </h2>
              <button 
                className="modal-close" 
                onClick={() => !submitting && setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="project-info-card">
                <div className="project-info-header">
                  <i className="fas fa-building"></i>
                  <h3>{selectedProject?.name}</h3>
                </div>
                <div className="project-info-details">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{selectedProject?.location}</span>
                </div>
              </div>
              
              <div className="form-section">
                <h4 className="form-section-title">Cost Breakdown</h4>
                
                <div className="form-group">
                  <label>Material Cost *</label>
                  <div className="input-with-icon">
                    <span className="input-icon">₹</span>
                    <input
                      type="number"
                      value={quotationForm.materialCost}
                      onChange={(e) => {
                        setQuotationForm({
                          ...quotationForm,
                          materialCost: e.target.value
                        });
                        if (validationErrors.materialCost) {
                          setValidationErrors({ ...validationErrors, materialCost: null });
                        }
                      }}
                      placeholder="Enter material cost"
                      min="0"
                      step="0.01"
                      className={validationErrors.materialCost ? 'error' : ''}
                    />
                  </div>
                  {validationErrors.materialCost && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{validationErrors.materialCost}</span>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Labour Cost *</label>
                  <div className="input-with-icon">
                    <span className="input-icon">₹</span>
                    <input
                      type="number"
                      value={quotationForm.labourCost}
                      onChange={(e) => {
                        setQuotationForm({
                          ...quotationForm,
                          labourCost: e.target.value
                        });
                        if (validationErrors.labourCost) {
                          setValidationErrors({ ...validationErrors, labourCost: null });
                        }
                      }}
                      placeholder="Enter labour cost"
                      min="0"
                      step="0.01"
                      className={validationErrors.labourCost ? 'error' : ''}
                    />
                  </div>
                  {validationErrors.labourCost && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{validationErrors.labourCost}</span>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Transport Cost *</label>
                  <div className="input-with-icon">
                    <span className="input-icon">₹</span>
                    <input
                      type="number"
                      value={quotationForm.transportCost}
                      onChange={(e) => {
                        setQuotationForm({
                          ...quotationForm,
                          transportCost: e.target.value
                        });
                        if (validationErrors.transportCost) {
                          setValidationErrors({ ...validationErrors, transportCost: null });
                        }
                      }}
                      placeholder="Enter transport cost"
                      min="0"
                      step="0.01"
                      className={validationErrors.transportCost ? 'error' : ''}
                    />
                  </div>
                  {validationErrors.transportCost && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{validationErrors.transportCost}</span>
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Other Cost *</label>
                  <div className="input-with-icon">
                    <span className="input-icon">₹</span>
                    <input
                      type="number"
                      value={quotationForm.otherCost}
                      onChange={(e) => {
                        setQuotationForm({
                          ...quotationForm,
                          otherCost: e.target.value
                        });
                        if (validationErrors.otherCost) {
                          setValidationErrors({ ...validationErrors, otherCost: null });
                        }
                      }}
                      placeholder="Enter other cost (or 0 if none)"
                      min="0"
                      step="0.01"
                      className={validationErrors.otherCost ? 'error' : ''}
                    />
                  </div>
                  {validationErrors.otherCost && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{validationErrors.otherCost}</span>
                    </div>
                  )}
                  <span className="helper-text">Enter 0 if there are no other costs</span>
                </div>
                
                <div className="form-group">
                  <label>Total Cost * (Auto-calculated)</label>
                  <div className="input-with-icon total-input">
                    <span className="input-icon">₹</span>
                    <input
                      type="text"
                      value={quotationForm.totalCost}
                      readOnly
                      placeholder="Auto-calculated"
                      className={`total-cost ${validationErrors.totalCost ? 'error' : ''}`}
                    />
                  </div>
                  {validationErrors.totalCost && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{validationErrors.totalCost}</span>
                    </div>
                  )}
                  <span className="helper-text auto-calc">This field is automatically calculated</span>
                </div>
                
                <div className="form-group">
                  <label>Advance Amount (Optional)</label>
                  <div className="input-with-icon">
                    <span className="input-icon">₹</span>
                    <input
                      type="number"
                      value={quotationForm.advanceAmount}
                      onChange={(e) => {
                        setQuotationForm({
                          ...quotationForm,
                          advanceAmount: e.target.value
                        });
                        if (validationErrors.advanceAmount) {
                          setValidationErrors({ ...validationErrors, advanceAmount: null });
                        }
                      }}
                      placeholder="Enter advance amount to be paid"
                      min="0"
                      step="0.01"
                      className={validationErrors.advanceAmount ? 'error' : ''}
                    />
                  </div>
                  {validationErrors.advanceAmount && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{validationErrors.advanceAmount}</span>
                    </div>
                  )}
                  <span className="helper-text">Amount customer should pay in advance (leave empty if no advance required)</span>
                </div>
              </div>
              
              {quotationForm.totalCost && (
                <div className="cost-breakdown-card">
                  <h4>Cost Breakdown Summary</h4>
                  <div className="breakdown-list">
                    <div className="breakdown-item">
                      <span>Material Cost</span>
                      <span>₹{parseFloat(quotationForm.materialCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Labour Cost</span>
                      <span>₹{parseFloat(quotationForm.labourCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Transport Cost</span>
                      <span>₹{parseFloat(quotationForm.transportCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Other Cost</span>
                      <span>₹{parseFloat(quotationForm.otherCost || 0).toFixed(2)}</span>
                    </div>
                    <div className="breakdown-divider"></div>
                    <div className="breakdown-item total">
                      <span>Total Cost</span>
                      <span className="total-value">₹{parseFloat(quotationForm.totalCost || 0).toFixed(2)}</span>
                    </div>
                    {quotationForm.advanceAmount && (
                      <div className="breakdown-item advance">
                        <span>Advance Amount</span>
                        <span className="advance-value">₹{parseFloat(quotationForm.advanceAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                <i className="fas fa-times"></i>
                <span>Cancel</span>
              </button>
              <button 
                className="btn-submit"
                onClick={handleSubmitQuotation}
                disabled={submitting || !quotationForm.materialCost || !quotationForm.labourCost || !quotationForm.transportCost || !quotationForm.otherCost}
              >
                {submitting ? (
                  <>
                    <div className="spinner-small"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-invoice"></i>
                    <span>Generate Quotation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotations;