import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Projects.css';

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    customerId: '',
    pmId: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

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
    fetchProjects();
  }, []);

  useEffect(() => {
    if (showCreateModal) {
      fetchUsers();
    }
  }, [showCreateModal]);

  const fetchProjects = async () => {
    try {
      const response = await api.get(`/projects`);
      setProjects(response.data.data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get(`/users`);
      const users = response.data.data.users || [];
      
      const customerUsers = users.filter(u => u.role === 'customer' && u.is_active);
      const pmUsers = users.filter(u => u.role === 'project_manager' && u.is_active);
      
      setCustomers(customerUsers);
      setProjectManagers(pmUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Project name must be at least 2 characters';
    } else if (formData.name.trim().length > 150) {
      errors.name = 'Project name cannot exceed 150 characters';
    }

    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }

    if (!formData.customerId) {
      errors.customerId = 'Please select a customer';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      const projectData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        customerId: formData.customerId,
      };

      const createResponse = await api.post(`/projects`, projectData);
      const createdProject = createResponse.data.data.project;

      if (formData.pmId && createdProject) {
        try {
          await api.patch(`/projects/${createdProject.id}/assign-pm`, { pmId: formData.pmId });
          alert('Project created and Project Manager assigned successfully!');
        } catch (pmError) {
          console.error('PM assignment error:', pmError);
          alert('Project created successfully, but failed to assign Project Manager.');
        }
      } else {
        alert('Project created successfully!');
      }

      setShowCreateModal(false);
      setFormData({ name: '', location: '', customerId: '', pmId: '' });
      setValidationErrors({});
      fetchProjects();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"?`)) return;
    try {
      await api.delete(`/projects/${projectId}`);
      alert('Project deleted successfully!');
      fetchProjects();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      CREATED: '#94a3b8', PM_ASSIGNED: '#3b82f6', VISIT_DONE: '#06b6d4',
      REPORT_SUBMITTED: '#8b5cf6', QUOTATION_GENERATED: '#f59e0b',
      CUSTOMER_APPROVED: '#10b981', ADVANCE_PENDING: '#f97316',
      ADVANCE_PAID: '#22c55e', WORK_STARTED: '#3b82f6',
      COMPLETED: '#10b981', CLOSED: '#64748b',
    };
    return statusColors[status] || '#757575';
  };

  const filteredProjects = projects.filter((project) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.location.toLowerCase().includes(query) ||
      project.id.toLowerCase().includes(query) ||
      project.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className={isDarkMode ? "dark-theme projects-page" : "light-theme projects-page"}>
      <div className="projects-container">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">Manage all construction projects</p>
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus"></i> Create Project
            </button>
          )}
        </div>

        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, location, ID, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <i className="fas fa-folder-open"></i>
            </div>
            <h3>No Projects Found</h3>
            <p>No projects match your search criteria</p>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((project, index) => (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{ '--card-index': index }}
              >
                <div className="project-card-header">
                  <h3 className="project-name">{project.name}</h3>
                  {isAdmin && (
                    <button
                      className="btn-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id, project.name); }}
                      title="Delete project"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
                <p className="project-location">
                  <i className="fas fa-map-marker-alt"></i> {project.location}
                </p>
                <div className="project-status" style={{ backgroundColor: getStatusColor(project.status) }}>
                  {project.status.replace(/_/g, ' ')}
                </div>
                <div className="project-footer">
                  <span className="project-date">
                    <i className="fas fa-calendar"></i> {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowCreateModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button className="modal-close" onClick={() => !submitting && setShowCreateModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {loadingUsers ? (
              <div className="modal-loading">
                <div className="spinner"></div>
                <p>Loading users...</p>
              </div>
            ) : (
              <form onSubmit={handleCreateProject} className="modal-form">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    className={validationErrors.name ? 'input-error' : ''}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter project name"
                    disabled={submitting}
                  />
                  {validationErrors.name && <span className="error-text">{validationErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Location *</label>
                  <textarea
                    className={validationErrors.location ? 'input-error' : ''}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter project location"
                    rows="3"
                    disabled={submitting}
                  />
                  {validationErrors.location && <span className="error-text">{validationErrors.location}</span>}
                </div>

                <div className="form-group">
                  <label>Customer *</label>
                  <select
                    className={validationErrors.customerId ? 'input-error' : ''}
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                  {validationErrors.customerId && <span className="error-text">{validationErrors.customerId}</span>}
                </div>

                <div className="form-group">
                  <label>Project Manager (Optional)</label>
                  <select
                    value={formData.pmId}
                    onChange={(e) => setFormData({ ...formData, pmId: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="">Select a project manager (optional)</option>
                    {projectManagers.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name} - {pm.active_projects || 0} active project{pm.active_projects !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="helper-text">You can assign a Project Manager now or later</span>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? <><div className="spinner-small"></div>Creating...</> : 'Create Project'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;