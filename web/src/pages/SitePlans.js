import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './SitePlans.css';

const BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace('/api/v1', '');

const SitePlans = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [sitePlans, setSitePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [projectName, setProjectName] = useState(location.state?.projectName || '');
  const [error, setError] = useState(null);
  
  // PDF Viewer state
  const [viewingPlan, setViewingPlan] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const canUpload = ['admin', 'super_admin', 'project_manager', 'customer'].includes(user?.role);

  useEffect(() => {
    fetchSitePlans();
    if (!projectName) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/projects/${projectId}`);
      if (response.data.success) {
        setProjectName(response.data.data.project.name);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchSitePlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      const response = await api.get(`/projects/${projectId}/site-plans`);
      
      let plans = [];
      
      if (response.data && response.data.success) {
        if (response.data.data && response.data.data.sitePlans) {
          plans = response.data.data.sitePlans;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          plans = response.data.data;
        } else if (Array.isArray(response.data.sitePlans)) {
          plans = response.data.sitePlans;
        } else if (Array.isArray(response.data)) {
          plans = response.data;
        } else if (response.data.data && response.data.data.site_plans) {
          plans = response.data.data.site_plans;
        }
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        plans = response.data.data;
      } else if (Array.isArray(response.data)) {
        plans = response.data;
      } else if (response.data && response.data.sitePlans) {
        plans = response.data.sitePlans;
      } else if (response.data && response.data.site_plans) {
        plans = response.data.site_plans;
      }
      
      setSitePlans(plans);
      setError(null);
    } catch (error) {
      console.error('Error fetching site plans:', error);
      
      if (error.response && error.response.status === 404) {
        setSitePlans([]);
        setError(null);
      } else {
        setError('Failed to load site plans. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      try {
        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('sitePlan', file);

        const response = await api.post(
          `/projects/${projectId}/site-plans`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
              }
            }
          }
        );

        if (response.data.success) {
          alert('Site plan uploaded successfully!');
          await fetchSitePlans();
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to upload site plan';
        alert(errorMessage);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };

    input.click();
  };

  const handleViewPDF = async (plan) => {
    try {
      setViewingPlan(plan);
      setPdfLoading(true);
      
      let url = '';
      
      if (plan.file_path.startsWith('http')) {
        url = plan.file_path;
      } else {
        const filePath = plan.file_path.startsWith('/') ? plan.file_path : `/${plan.file_path}`;
        url = `${BASE_URL}${filePath}`;
      }
      
      const timestampedUrl = `${url}?t=${Date.now()}`;
      setPdfUrl(timestampedUrl);
      
      setTimeout(() => {
        setPdfLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error opening PDF:', error);
      setPdfLoading(false);
      alert(`Failed to open PDF: ${error.message}\n\nPlease try downloading the file instead.`);
    }
  };

  const handleClosePDFViewer = () => {
    setViewingPlan(null);
    setPdfUrl(null);
    setPdfLoading(false);
  };

  const handleDownloadPDF = async (plan) => {
    try {
      setDownloadingId(plan.id);
      
      let url = '';
      if (plan.file_path.startsWith('http')) {
        url = plan.file_path;
      } else {
        const filePath = plan.file_path.startsWith('/') ? plan.file_path : `/${plan.file_path}`;
        url = `${BASE_URL}${filePath}`;
      }
      
      const timestampedUrl = `${url}?t=${Date.now()}`;
      
      const token = localStorage.getItem('token');
      const response = await fetch(timestampedUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = plan.file_name || 'site-plan.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setDownloadingId(null);
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download file: ${error.message}`);
      setDownloadingId(null);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete "${plan.file_name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await api.delete(`/site-plans/${plan.id}`);
      
      if (response.data.success) {
        alert('Site plan deleted successfully');
        
        if (viewingPlan && viewingPlan.id === plan.id) {
          handleClosePDFViewer();
        }
        
        await fetchSitePlans();
      } else {
        throw new Error(response.data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.message || error.message || 'Failed to delete site plan');
    }
  };

  const canDelete = (plan) => {
    return (
      user?.role === 'admin' ||
      user?.role === 'super_admin' ||
      plan.uploaded_by === user?.id
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={isDarkMode ? "dark-theme site-plans-page" : "light-theme site-plans-page"}>
      {/* Header */}
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(`/projects/${projectId}`)}>
          <i className="fas fa-arrow-left"></i>
          <span>Back to Project</span>
        </button>
        <div className="header-content">
          <h1 className="page-title">Site Plans</h1>
          <p className="page-subtitle">
            <i className="fas fa-draw-polygon"></i>
            {projectName || 'Loading project...'}
          </p>
        </div>
      </div>

      {/* Upload Section */}
      {canUpload && (
        <div className="upload-section">
          <button 
            className="btn-upload"
            onClick={handleUploadPDF}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="spinner-small"></div>
                <span>Uploading... {uploadProgress}%</span>
              </>
            ) : (
              <>
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Upload Site Plan (PDF)</span>
              </>
            )}
          </button>
          
          {uploading && (
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
          <button onClick={fetchSitePlans} className="retry-button">
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      )}

      {/* Site Plans List */}
      <div className="plans-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading site plans...</p>
          </div>
        ) : sitePlans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <i className="fas fa-file-pdf"></i>
            </div>
            <h3>No site plans uploaded yet</h3>
            {canUpload ? (
              <p>Click the upload button above to add a PDF</p>
            ) : (
              <p>No site plans available for this project</p>
            )}
            <button 
              className="btn-refresh" 
              onClick={fetchSitePlans}
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        ) : (
          <div className="plans-grid">
            {sitePlans.map((plan, index) => (
              <div key={plan.id} className="plan-card" style={{ '--card-index': index }}>
                <div className="plan-icon">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="plan-info">
                  <h3 className="plan-name" title={plan.file_name}>
                    {plan.file_name}
                  </h3>
                  <div className="plan-meta">
                    <span>
                      <i className="fas fa-user"></i> {plan.uploaded_by_name || 'Unknown'}
                    </span>
                    <span>
                      <i className="fas fa-calendar-alt"></i> {plan.uploaded_at ? new Date(plan.uploaded_at).toLocaleDateString() : 'Unknown date'}
                    </span>
                    {plan.file_size && (
                      <span>
                        <i className="fas fa-database"></i> {formatFileSize(plan.file_size)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="plan-actions">
                  <button 
                    className="btn-view"
                    onClick={() => handleViewPDF(plan)}
                    title="View PDF"
                  >
                    <i className="fas fa-eye"></i>
                    <span>View</span>
                  </button>

                  <button 
                    className="btn-download"
                    onClick={() => handleDownloadPDF(plan)}
                    disabled={downloadingId === plan.id}
                    title="Download PDF"
                  >
                    {downloadingId === plan.id ? (
                      <>
                        <div className="spinner-small"></div>
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download"></i>
                        <span>Download</span>
                      </>
                    )}
                  </button>

                  {canDelete(plan) && (
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeletePlan(plan)}
                      title="Delete PDF"
                    >
                      <i className="fas fa-trash-alt"></i>
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {viewingPlan && (
        <div className="pdf-viewer-modal" onClick={handleClosePDFViewer}>
          <div className="pdf-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-viewer-header">
              <div className="pdf-viewer-header-left">
                <button className="pdf-viewer-close" onClick={handleClosePDFViewer}>
                  <i className="fas fa-times"></i>
                </button>
                <div className="pdf-viewer-title-container">
                  <h3 className="pdf-viewer-title" title={viewingPlan.file_name}>
                    {viewingPlan.file_name}
                  </h3>
                  <span className="pdf-viewer-subtitle">
                    <i className="fas fa-user"></i> Uploaded by: {viewingPlan.uploaded_by_name || 'Unknown'}
                  </span>
                </div>
              </div>
              <button 
                className="pdf-viewer-download"
                onClick={() => handleDownloadPDF(viewingPlan)}
                disabled={downloadingId === viewingPlan.id}
              >
                {downloadingId === viewingPlan.id ? (
                  <>
                    <div className="spinner-small"></div>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>

            <div className="pdf-viewer-body">
              {pdfLoading ? (
                <div className="pdf-loading-container">
                  <div className="spinner"></div>
                  <p>Loading PDF...</p>
                </div>
              ) : pdfUrl ? (
                <>
                  <div className="pdf-iframe-container">
                    <iframe
                      src={pdfUrl}
                      className="pdf-iframe"
                      title="PDF Viewer"
                      onError={(e) => {
                        console.error('Iframe error:', e);
                        setPdfLoading(false);
                        alert('Failed to load PDF in iframe. Please try downloading instead.');
                      }}
                      onLoad={() => {
                        console.log('Iframe loaded successfully');
                        setPdfLoading(false);
                      }}
                    />
                  </div>
                  
                  <div className="pdf-fallback-message">
                    <div className="fallback-content">
                      <i className="fas fa-info-circle"></i>
                      <div className="fallback-text">
                        <p><strong>Having trouble viewing the PDF?</strong></p>
                        <p>If the PDF doesn't display properly, you can:</p>
                        <ul>
                          <li>
                            <button 
                              className="fallback-link"
                              onClick={() => handleDownloadPDF(viewingPlan)}
                            >
                              <i className="fas fa-download"></i> Download the PDF
                            </button>
                          </li>
                          <li>
                            <button 
                              className="fallback-link"
                              onClick={() => window.open(pdfUrl, '_blank')}
                            >
                              <i className="fas fa-external-link-alt"></i> Open in new tab
                            </button>
                          </li>
                          <li>
                            <button 
                              className="fallback-link"
                              onClick={() => {
                                const iframe = document.querySelector('.pdf-iframe');
                                if (iframe) {
                                  iframe.src = iframe.src;
                                  setPdfLoading(true);
                                }
                              }}
                            >
                              <i className="fas fa-sync-alt"></i> Reload PDF
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="pdf-loading-container">
                  <i className="fas fa-file-pdf" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }}></i>
                  <p>Failed to load PDF</p>
                  <div className="pdf-error-actions">
                    <button 
                      className="fallback-button primary"
                      onClick={() => handleDownloadPDF(viewingPlan)}
                    >
                      <i className="fas fa-download"></i> Download Instead
                    </button>
                    <button 
                      className="fallback-button secondary"
                      onClick={() => {
                        setPdfLoading(true);
                        setTimeout(() => setPdfLoading(false), 1000);
                      }}
                    >
                      <i className="fas fa-sync-alt"></i> Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SitePlans;