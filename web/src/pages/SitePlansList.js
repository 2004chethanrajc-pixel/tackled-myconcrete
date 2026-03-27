import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './SitePlansList.css';

const SitePlansList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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

  useEffect(() => {
    api.get('/projects')
      .then(res => setProjects(res.data.data?.projects || res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.status?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    const statusColors = {
      CREATED: '#94a3b8',
      PM_ASSIGNED: '#3b82f6',
      VISIT_DONE: '#06b6d4',
      REPORT_SUBMITTED: '#8b5cf6',
      QUOTATION_GENERATED: '#f59e0b',
      CUSTOMER_APPROVED: '#10b981',
      ADVANCE_PENDING: '#f97316',
      ADVANCE_PAID: '#22c55e',
      WORK_STARTED: '#3b82f6',
      COMPLETED: '#10b981',
      FINAL_PAID: '#10b981',
      CLOSED: '#64748b',
    };
    return statusColors[status] || '#94a3b8';
  };

  return (
    <div className={isDarkMode ? "dark-theme site-plans-list-page" : "light-theme site-plans-list-page"}>
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Site Plans</h1>
          <p className="page-subtitle">
            <i className="fas fa-map"></i>
            Select a project to view or upload site plans
          </p>
        </div>
      </div>

      <div className="search-container">
        <i className="fas fa-search search-icon"></i>
        <input
          className="search-input"
          type="text"
          placeholder="Search projects by name or status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading projects...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrapper">
            <i className="fas fa-folder-open"></i>
          </div>
          <h3>No Projects Found</h3>
          <p>{search ? 'No projects match your search criteria' : 'No projects available'}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(project => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}/site-plans`, {
                state: { projectName: project.name }
              })}
            >
              <div className="project-card-header">
                <div className="project-icon">
                  <i className="fas fa-draw-polygon"></i>
                </div>
                <div className="project-info">
                  <h3 className="project-name">{project.name}</h3>
                  <div className="project-meta">
                    {project.customer_name && (
                      <span className="meta-item">
                        <i className="fas fa-user"></i>
                        {project.customer_name}
                      </span>
                    )}
                    {project.location && (
                      <span className="meta-item">
                        <i className="fas fa-map-marker-alt"></i>
                        {project.location}
                      </span>
                    )}
                  </div>
                </div>
                <div 
                  className="project-status-badge"
                  style={{ backgroundColor: getStatusColor(project.status) }}
                >
                  {project.status?.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="project-card-footer">
                <span className="view-plans-text">
                  <i className="fas fa-eye"></i>
                  View Site Plans
                </span>
                <i className="fas fa-chevron-right arrow-icon"></i>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SitePlansList;