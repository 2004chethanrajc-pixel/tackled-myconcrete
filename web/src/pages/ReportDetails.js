import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import jsPDF from 'jspdf';
import { getLogoBase64, getPdfTimestamp, addPdfLogo, addPdfFooter } from '../utils/pdfUtils';
import './ReportDetails.css';

const BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace('/api/v1', '');
const isVideoFile = (path) => /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(path);

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [report, setReport] = useState(location.state?.report || null);
  const [loading, setLoading] = useState(!location.state?.report);
  const [downloading, setDownloading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);

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
    if (!report) {
      fetchReportDetails();
    }
  }, [id]);

  const fetchReportDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/reports/${id}`);
      setReport(response.data.data.report);
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      approved: '#10b981',
      rejected: '#ef4444',
      pending: '#f59e0b'
    };
    return statusColors[status] || '#f59e0b';
  };

  const getStatusDarkColor = (status) => {
    const statusColors = {
      approved: 'rgba(16, 185, 129, 0.2)',
      rejected: 'rgba(239, 68, 68, 0.2)',
      pending: 'rgba(245, 158, 11, 0.2)'
    };
    return statusColors[status] || 'rgba(245, 158, 11, 0.2)';
  };

  const getStatusLightColor = (status) => {
    const statusColors = {
      approved: '#10b98120',
      rejected: '#ef444420',
      pending: '#f59e0b20'
    };
    return statusColors[status] || '#f59e0b20';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'fa-check-circle';
      case 'rejected': return 'fa-times-circle';
      default: return 'fa-clock';
    }
  };

  const downloadImage = async (imageUrl, index) => {
    try {
      setDownloading(true);
      
      const fullUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `${BASE_URL}${imageUrl}`;

      const response = await fetch(fullUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const extension = imageUrl.split('.').pop() || 'jpg';
      a.download = `report-image-${index + 1}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image');
    } finally {
      setDownloading(false);
    }
  };

  const downloadAllImages = async () => {
    if (!report || !report.images || report.images.length === 0) {
      alert('This report has no images to download');
      return;
    }

    if (window.confirm(`Download all ${report.images.length} images?`)) {
      for (let i = 0; i < report.images.length; i++) {
        await downloadImage(report.images[i], i);
      }
    }
  };

  const openImageViewer = (imageUrl) => {
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${BASE_URL}${imageUrl}`;
    setSelectedImage(fullUrl);
    setShowImageViewer(true);
  };

  const handleDownloadReport = async () => {
    if (!report) return;

    try {
      setDownloading(true);

      const logoBase64 = await getLogoBase64();
      const timestamp = getPdfTimestamp();

      // Pre-fetch images as base64
      const imageBase64List = [];
      if (report.images && report.images.length > 0) {
        for (const imageUrl of report.images) {
          if (isVideoFile(imageUrl)) continue;
          try {
            const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
            const response = await fetch(fullUrl);
            const blob = await response.blob();
            const b64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            imageBase64List.push(b64);
          } catch (e) {
            console.warn('Could not load image for PDF:', e.message);
          }
        }
      }
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      
      // Helper function to add section
      const addSection = (title, y, color = '#3B82F6') => {
        pdf.setFillColor(color);
        pdf.rect(margin, y - 5, pageWidth - (2 * margin), 0.5, 'F');
        pdf.setFontSize(16);
        pdf.setTextColor(color);
        pdf.setFont(undefined, 'bold');
        pdf.text(title, margin, y);
        return y + 8;
      };

      // Helper function to add row
      const addRow = (label, value, y) => {
        pdf.setFontSize(11);
        pdf.setTextColor('#64748B');
        pdf.setFont(undefined, 'normal');
        pdf.text(label, margin, y);
        pdf.setTextColor('#1E293B');
        pdf.setFont(undefined, 'bold');
        
        const maxWidth = pageWidth - (2 * margin) - 80;
        const splitValue = pdf.splitTextToSize(String(value || 'N/A'), maxWidth);
        pdf.text(splitValue, pageWidth - margin - maxWidth, y);
        
        return y + 8;
      };

      let yPos = 30;

      // Header with gradient effect
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setFillColor(30, 58, 138);
      pdf.rect(0, 35, pageWidth, 5, 'F');
      
      addPdfLogo(pdf, logoBase64, margin, 6);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont(undefined, 'bold');
      pdf.text('SITE REPORT', pageWidth / 2, 20, { align: 'center' });

      yPos = 60;

      // Project Info Header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin - 5, yPos - 20, pageWidth - (2 * margin) + 10, 45, 'F');
      
      pdf.setTextColor('#1E293B');
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text(report.project_name || 'Project Report', margin, yPos);
      yPos += 8;

      pdf.setFontSize(12);
      pdf.setTextColor('#64748B');
      pdf.text(report.project_location || '', margin, yPos);
      yPos += 15;

      // Status Badge
      const statusColor = getStatusColor(report.approval_status);
      pdf.setFillColor(statusColor);
      pdf.roundedRect(pageWidth - margin - 100, yPos - 20, 100, 20, 3, 3, 'F');
      pdf.setTextColor('#FFFFFF');
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      const statusText = (report.approval_status || 'pending').toUpperCase();
      pdf.text(statusText, pageWidth - margin - 50, yPos - 8, { align: 'center' });

      yPos += 10;

      // Report Details Section
      yPos = addSection('Report Details', yPos);
      
      const details = [
        { label: 'Report ID', value: id },
        { label: 'Project Name', value: report.project_name },
        { label: 'Location', value: report.project_location },
        { label: 'Customer', value: report.customer_name },
        { label: 'Submitted By', value: report.site_incharge_name },
        { label: 'Created', value: new Date(report.created_at).toLocaleString('en-IN', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      ];

      details.forEach(item => {
        yPos = addRow(item.label, item.value, yPos);
      });

      yPos += 5;

      // Site Specifications Section
      yPos = addSection('Site Specifications', yPos);
      
      const specs = [
        { label: 'Total Floors', value: report.total_floors },
        { label: 'Dimensions', value: report.dimensions }
      ];

      specs.forEach(item => {
        yPos = addRow(item.label, item.value, yPos);
      });

      // Remarks
      if (report.remarks) {
        yPos += 5;
        yPos = addSection('Remarks', yPos, '#10b981');
        
        pdf.setFontSize(11);
        pdf.setTextColor('#1E293B');
        pdf.setFont(undefined, 'normal');
        const splitRemarks = pdf.splitTextToSize(report.remarks, pageWidth - (2 * margin));
        pdf.text(splitRemarks, margin, yPos);
        yPos += (splitRemarks.length * 6) + 10;
      }

      // Images section
      if (report.images && report.images.length > 0) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = 30;
        }

        const imgCount = imageBase64List.length;
        yPos = addSection(`Site Images (${imgCount > 0 ? imgCount : report.images.length})`, yPos, '#8b5cf6');

        if (imgCount > 0) {
          const imagesPerRow = 2;
          const imageWidth = (pageWidth - (2 * margin) - 10) / imagesPerRow;
          const imageHeight = imageWidth * 0.75;

          for (let i = 0; i < imgCount; i++) {
            const col = i % imagesPerRow;
            const row = Math.floor(i / imagesPerRow);
            const xPos = margin + col * (imageWidth + 10);
            const currentYPos = yPos + row * (imageHeight + 10);

            if (currentYPos + imageHeight > pageHeight - 20) {
              pdf.addPage();
              yPos = 30;
              const newRow = Math.floor((i - (row * imagesPerRow)) / imagesPerRow);
              const newYPos = yPos + newRow * (imageHeight + 10);
              try {
                pdf.addImage(imageBase64List[i], 'JPEG', xPos, newYPos, imageWidth, imageHeight);
              } catch (e) { /* skip broken image */ }
            } else {
              try {
                pdf.addImage(imageBase64List[i], 'JPEG', xPos, currentYPos, imageWidth, imageHeight);
              } catch (e) { /* skip broken image */ }
            }
          }
          yPos += Math.ceil(imgCount / imagesPerRow) * (imageHeight + 10) + 10;
        } else {
          pdf.setFontSize(11);
          pdf.setTextColor('#64748B');
          pdf.setFont(undefined, 'italic');
          pdf.text(`This report contains ${report.images.length} image(s).`, margin, yPos);
          yPos += 10;
        }
      }

      addPdfFooter(pdf, pageWidth, pageHeight, margin, timestamp, `Report ID: ${id.slice(0, 8)}`);
      
      pdf.save(`site-report-${report.project_name?.replace(/\s+/g, '-') || 'report'}-${Date.now()}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const downloadCSV = () => {
    if (!report) return;
    const rows = [
      ['Field', 'Value'],
      ['Project', report.project_name || id],
      ['Location', report.project_location || ''],
      ['Approval Status', report.approval_status || 'pending'],
      ['Site Incharge', report.site_incharge_name || ''],
      ['Total Floors', report.total_floors ?? ''],
      ['Dimensions', report.dimensions || ''],
      ['Remarks', report.remarks || ''],
      ['Images Count', report.images?.length ?? 0],
      ['Created At', report.created_at ? new Date(report.created_at).toLocaleDateString('en-IN') : ''],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-report-${report.project_name?.replace(/\s+/g, '-') || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!report) return;
    const rows = [
      ['Field', 'Value'],
      ['Project', report.project_name || id],
      ['Location', report.project_location || ''],
      ['Approval Status', report.approval_status || 'pending'],
      ['Site Incharge', report.site_incharge_name || ''],
      ['Total Floors', report.total_floors ?? ''],
      ['Dimensions', report.dimensions || ''],
      ['Remarks', report.remarks || ''],
      ['Images Count', report.images?.length ?? 0],
      ['Created At', report.created_at ? new Date(report.created_at).toLocaleDateString('en-IN') : ''],
    ];
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Site Report"><Table>${
      rows.map(r => `<Row>${r.map(v => `<Cell><Data ss:Type="String">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>`).join('')
    }</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-report-${report.project_name?.replace(/\s+/g, '-') || id}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={isDarkMode ? "dark-theme report-details-page" : "light-theme report-details-page"}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading report details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={isDarkMode ? "dark-theme report-details-page" : "light-theme report-details-page"}>
        <div className="error-container">
          <div className="error-icon-wrapper">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h3>Report Not Found</h3>
          <p>The report you're looking for doesn't exist or has been removed.</p>
          <button className="btn-primary" onClick={() => navigate('/reports')}>
            <i className="fas fa-arrow-left"></i>
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(report.approval_status);
  const statusLightColor = isDarkMode ? getStatusDarkColor(report.approval_status) : getStatusLightColor(report.approval_status);
  const statusIcon = getStatusIcon(report.approval_status);
  const statusText = (report.approval_status || 'pending').toUpperCase();

  return (
    <div className={isDarkMode ? "dark-theme report-details-page" : "light-theme report-details-page"}>
      {/* Hero Section */}
      <div className="report-hero" style={{ background: 'linear-gradient(135deg, #3B82F6, #1E3A8A)' }}>
        <div className="hero-content">
          <div className="hero-top">
            <div className="report-badge">
              <i className="fas fa-file-alt"></i>
              <span>Site Report</span>
            </div>
            <div className="status-badge" style={{ backgroundColor: statusColor }}>
              <i className={`fas ${statusIcon}`}></i>
              <span>{statusText}</span>
            </div>
          </div>

          <h1 className="report-title">{report.project_name || `Report #${id}`}</h1>
          
          <div className="report-meta">
            <div className="meta-item">
              <i className="fas fa-map-marker-alt"></i>
              <span>{report.project_location || 'N/A'}</span>
            </div>
          </div>
          <div className="report-meta">
            <div className="meta-item">
              <i className="fas fa-calendar-alt"></i>
              <span>
                {new Date(report.created_at).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <div className="meta-item">
              <i className="fas fa-clock"></i>
              <span>
                {new Date(report.created_at).toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="hero-decoration-1"></div>
        <div className="hero-decoration-2"></div>
      </div>

      <div className="report-content">
        {/* Report Details Card */}
        <div className="info-card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-clipboard-list"></i>
              <h3>Report Details</h3>
            </div>
          </div>
          <div className="card-content">
            <div className="info-row">
              <span className="info-label">Report ID</span>
              <span className="info-value">{id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Project Name</span>
              <span className="info-value">{report.project_name || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Location</span>
              <span className="info-value">{report.project_location || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Customer</span>
              <span className="info-value">{report.customer_name || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Submitted By</span>
              <span className="info-value">{report.site_incharge_name || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Floors</span>
              <span className="info-value">{report.total_floors}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Dimensions</span>
              <span className="info-value">{report.dimensions}</span>
            </div>
            {report.remarks && (
              <div className="remarks-container">
                <span className="remarks-label">Remarks</span>
                <div className="remarks-box" style={{ backgroundColor: statusLightColor }}>
                  <p className="remarks-text">{report.remarks}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Images Section */}
        {report.images && report.images.length > 0 && (
          <div className="info-card">
            <div className="card-header">
              <div className="card-title">
                <i className="fas fa-images"></i>
                <h3>Site Media ({report.images.length})</h3>
              </div>
              <button 
                className="btn-download-all"
                onClick={downloadAllImages}
                disabled={downloading}
              >
                <i className="fas fa-download"></i>
                <span>Download All</span>
              </button>
            </div>
            <div className="images-grid">
              {report.images.map((imageUrl, index) => {
                const fullUrl = imageUrl.startsWith('http') 
                  ? imageUrl 
                  : `${BASE_URL}${imageUrl}`;
                const isVideo = isVideoFile(imageUrl);

                return (
                  <div key={index} className="image-card">
                    <div className="image-container">
                      {isVideo ? (
                        <video
                          src={fullUrl}
                          controls
                          className="image-video"
                        />
                      ) : (
                        <>
                          <img
                            src={fullUrl}
                            alt={`Site ${index + 1}`}
                            className="image-preview"
                            onClick={() => openImageViewer(imageUrl)}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                            }}
                          />
                          <div className="image-overlay">
                            <i className="fas fa-search-plus"></i>
                          </div>
                          <span className="image-badge">Image {index + 1}</span>
                        </>
                      )}
                    </div>
                    <button 
                      className="image-download-btn"
                      onClick={() => downloadImage(imageUrl, index)}
                      disabled={downloading}
                      title="Download image"
                    >
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="actions-container">
          <div className="action-buttons-group">
            <button 
              className="btn-download pdf"
              onClick={handleDownloadReport}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <div className="spinner-small"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf"></i>
                  <span>PDF</span>
                </>
              )}
            </button>
            <button
              className="btn-download csv"
              onClick={downloadCSV}
              disabled={downloading}
            >
              <i className="fas fa-file-csv"></i>
              <span>CSV</span>
            </button>
            <button
              className="btn-download excel"
              onClick={downloadExcel}
              disabled={downloading}
            >
              <i className="fas fa-file-excel"></i>
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Report Footer */}
        <div className="report-footer">
          <p>
            <i className="fas fa-id-card"></i>
            Report ID: {id}
          </p>
          <p>
            <i className="fas fa-calendar-alt"></i>
            Generated on {new Date(report.created_at).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <div className="modal-overlay" onClick={() => setShowImageViewer(false)}>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-viewer-close" onClick={() => setShowImageViewer(false)}>
              <i className="fas fa-times"></i>
            </button>
            <img src={selectedImage} alt="Full size" className="image-viewer-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetails;