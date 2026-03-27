import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import jsPDF from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { getLogoBase64, getPdfTimestamp, addPdfLogo, addPdfFooter } from '../utils/pdfUtils';
import './ViewQuotation.css';

const ViewQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  
  // Quotation data
  const [quotation, setQuotation] = useState(null);
  const [report, setReport] = useState(null);
  const [project, setProject] = useState(null);
  const [generatedBy, setGeneratedBy] = useState('');
  
  // Payment data
  const [extraCharges, setExtraCharges] = useState([]);
  const [pendingExtraCharges, setPendingExtraCharges] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [isAdvancePaid, setIsAdvancePaid] = useState(false);
  const [advancePayment, setAdvancePayment] = useState(null);
  
  // Loading states
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const config = {};

      // If we have projectId from state, fetch by project
      if (location.state?.projectId) {
        console.log('Fetching quotation by project ID:', location.state.projectId);
        const response = await api.get(`/quotations/project/${location.state.projectId}`);
        console.log('Project quotations response:', response.data);
        
        if (response.data.success && response.data.data.quotations && response.data.data.quotations.length > 0) {
          const quotationData = response.data.data.quotations[0];
          setQuotation(quotationData);
          
          // Fetch detailed quotation to get report and generated_by info
          console.log('Fetching detailed quotation for ID:', quotationData.id);
          const detailResponse = await api.get(`/quotations/${quotationData.id}`);
          console.log('Detail response:', detailResponse.data);
          
          if (detailResponse.data.success) {
            setReport(detailResponse.data.data.report);
            if (detailResponse.data.data.generated_by_name) {
              setGeneratedBy(detailResponse.data.data.generated_by_name);
            }
          }

          // Fetch project details
          console.log('Fetching project details for ID:', location.state.projectId);
          const projectResponse = await api.get(`/projects/${location.state.projectId}`);
          console.log('Project response:', projectResponse.data);
          
          if (projectResponse.data.success) {
            setProject(projectResponse.data.data.project);
          }

          // Fetch payment data
          await fetchPaymentData(location.state.projectId, quotationData);
        } else {
          setError('No quotation found for this project');
        }
      } else {
        // Fetch by quotation ID
        console.log('Fetching quotation by ID:', id);
        const response = await api.get(`/quotations/${id}`);
        console.log('Quotation response:', response.data);
        
        if (response.data.success) {
          setQuotation(response.data.data.quotation);
          setReport(response.data.data.report);
          if (response.data.data.generated_by_name) {
            setGeneratedBy(response.data.data.generated_by_name);
          }

          // Fetch project details
          if (response.data.data.quotation?.project_id) {
            console.log('Fetching project details for ID:', response.data.data.quotation.project_id);
            const projectResponse = await api.get(`/projects/${response.data.data.quotation.project_id}`);
            console.log('Project response:', projectResponse.data);
            
            if (projectResponse.data.success) {
              setProject(projectResponse.data.data.project);
            }

            // Fetch payment data
            await fetchPaymentData(response.data.data.quotation.project_id, response.data.data.quotation);
          }
        } else {
          setError('Quotation not found');
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to load quotation');
      setLoading(false);
    }
  };

  const fetchPaymentData = async (projectId, quotationData) => {
    try {
      setLoadingPayments(true);
      
      // Fetch payments for this project
      const paymentsResponse = await api.get(`/payments/project/${projectId}`);
      const payments = paymentsResponse.data.data.payments || [];
      
      // Filter extra charges
      const extraPayments = payments.filter(p => p.type === 'extra');
      setExtraCharges(extraPayments);
      
      // Filter pending extra charges (only show if payment_method exists and status is pending)
      const pendingExtra = extraPayments.filter(p => 
        p.status === 'pending' && p.payment_method !== null
      );
      setPendingExtraCharges(pendingExtra);
      
      // Check for advance payment
      const advancePayments = payments.filter(p => 
        p.type === 'advance' || (p.type === 'regular' && p.description?.toLowerCase().includes('advance'))
      );
      
      const paidAdvance = advancePayments.find(p => p.status === 'completed');
      if (paidAdvance) {
        setIsAdvancePaid(true);
        setAdvancePayment(paidAdvance);
      } else {
        setIsAdvancePaid(false);
        setAdvancePayment(null);
      }
      
      // Build payment summary
      if (quotationData) {
        const regularPayments = payments.filter(p => p.type !== 'extra');
        const extraChargesList = payments.filter(p => p.type === 'extra');
        
        const totalPaid = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        const extraChargesTotal = extraChargesList
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        const totalCostWithExtras = parseFloat(quotationData.total_cost || 0) + extraChargesTotal;
        const balance = totalCostWithExtras - totalPaid;
        
        const hasPendingFinalPayment = payments.some(
          p => p.type === 'final' && p.status === 'pending'
        );
        
        setPaymentSummary({
          totalCost: parseFloat(quotationData.total_cost || 0),
          extraChargesTotal,
          totalCostWithExtras,
          totalPaid,
          balance,
          payments,
          extraCharges: extraChargesList,
          pendingExtraCharges: pendingExtra,
          hasPendingFinalPayment,
        });
      }
      
    } catch (err) {
      console.error('Error fetching payment data:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleViewReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {};

      // Fetch reports for this project
      const response = await api.get(`/reports/project/${project?.id || quotation?.project_id}`);
      
      if (!response.data.success || !response.data.data.reports || response.data.data.reports.length === 0) {
        alert('No site report has been submitted for this project yet.');
        return;
      }

      // Sort reports by created_at date (newest first)
      const sortedReports = [...response.data.data.reports].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Get the latest report
      const latestReport = sortedReports[0];
      
      // Navigate to ViewReport
      navigate(`/reports/${latestReport.id}`, { 
        state: { report: latestReport } 
      });
    } catch (err) {
      console.error('Error fetching reports:', err);
      alert('Failed to fetch site report. Please try again.');
    }
  };

  const handlePayAdvance = () => {
    if (!project?.id && !quotation?.project_id) {
      alert('Project information is missing');
      return;
    }
    
    navigate(`/projects/${project?.id || quotation?.project_id}/pay-advance`, { 
      state: { 
        project: {
          id: project?.id || quotation?.project_id,
          name: project?.name || `Project ${quotation?.project_id}`,
          location: project?.location,
          customer_id: user?.id
        },
        advanceAmount: quotation?.advance_amount
      } 
    });
  };

  const handlePayExtraCharge = (extraCharge) => {
    navigate(`/projects/${project?.id || quotation?.project_id}/pay-extra`, { 
      state: { 
        project: {
          id: project?.id || quotation?.project_id,
          name: project?.name || `Project ${quotation?.project_id}`,
          location: project?.location,
          customer_id: user?.id
        },
        extraCharge 
      } 
    });
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this quotation?')) {
      return;
    }

    try {
      setApproving(true);
      const token = localStorage.getItem('token');
      
      await api.patch(`/quotations/${quotation.id}/approve`, {});
      
      alert('Quotation approved successfully!');
      
      // Refresh data
      await loadData();
      
      // Navigate to projects after approval
      if (user?.role === 'customer') {
        navigate('/projects');
      }
    } catch (err) {
      console.error('Error approving quotation:', err);
      alert(err.response?.data?.message || 'Failed to approve quotation');
    } finally {
      setApproving(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `Rs. ${num.toFixed(2)}`; // Changed from ₹ to Rs. to avoid encoding issues
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const downloadPDF = async () => {
    if (!quotation) return;

    try {
      setDownloading(true);
      
      const logoBase64 = await getLogoBase64();
      const timestamp = getPdfTimestamp();
      
      const displayProjectName = project?.name || `Project ${quotation?.project_id}`;
      const isApproved = quotation?.approved || false;
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      
      // Set font to avoid encoding issues
      pdf.setFont('helvetica', 'normal');
      
      // Helper function to add section
      const addSection = (title, y, color = '#3B82F6') => {
        pdf.setFillColor(parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16));
        pdf.rect(margin, y - 5, pageWidth - (2 * margin), 0.5, 'F');
        pdf.setFontSize(16);
        pdf.setTextColor(59, 130, 246);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, y);
        return y + 8;
      };

      // Helper function to add row
      const addRow = (label, value, y) => {
        pdf.setFontSize(11);
        pdf.setTextColor(100, 116, 139); // #64748B
        pdf.setFont('helvetica', 'normal');
        pdf.text(label, margin, y);
        pdf.setTextColor(30, 41, 59); // #1E293B
        pdf.setFont('helvetica', 'bold');
        
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
      
      // Logo top-left in header
      addPdfLogo(pdf, logoBase64, margin, 6);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('QUOTATION', pageWidth / 2, 20, { align: 'center' });

      yPos = 60;

      // Project Info Header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin - 5, yPos - 20, pageWidth - (2 * margin) + 10, 45, 'F');
      
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(displayProjectName, margin, yPos);
      yPos += 8;

      if (project?.location) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 116, 139);
        pdf.text(project.location, margin, yPos);
        yPos += 15;
      } else {
        yPos += 15;
      }

      // Status Badge
      const statusColor = isApproved ? [16, 185, 129] : [245, 158, 11]; // #10B981 or #F59E0B
      pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.roundedRect(pageWidth - margin - 100, yPos - 20, 100, 20, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      const statusText = isApproved ? 'APPROVED' : 'PENDING';
      pdf.text(statusText, pageWidth - margin - 50, yPos - 8, { align: 'center' });

      // Advance Paid Badge if applicable
      if (isAdvancePaid) {
        pdf.setFillColor(16, 185, 129); // #10B981
        pdf.roundedRect(pageWidth - margin - 100, yPos - 45, 100, 20, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ADVANCE PAID', pageWidth - margin - 50, yPos - 33, { align: 'center' });
      }

      yPos += 10;

      // Project Information Section
      yPos = addSection('Project Information', yPos);
      
      const projectDetails = [
        { label: 'Project ID:', value: project?.id || quotation?.project_id },
        { label: 'Project Name:', value: project?.name || displayProjectName },
        { label: 'Location:', value: project?.location || 'N/A' },
        { label: 'Created:', value: formatDate(quotation?.created_at) }
      ];

      if (isApproved && quotation?.approved_at) {
        projectDetails.push({ label: 'Approved:', value: formatDate(quotation.approved_at) });
      }

      projectDetails.forEach(item => {
        yPos = addRow(item.label, item.value, yPos);
      });

      yPos += 5;

      // Cost Breakdown Section
      yPos = addSection('Cost Breakdown', yPos);
      
      const costItems = [
        { label: 'Material Cost:', value: formatCurrency(quotation?.material_cost) },
        { label: 'Labour Cost:', value: formatCurrency(quotation?.labour_cost) },
        { label: 'Transport Cost:', value: formatCurrency(quotation?.transport_cost) },
        { label: 'Other Cost:', value: formatCurrency(quotation?.other_cost) }
      ];

      costItems.forEach(item => {
        yPos = addRow(item.label, item.value, yPos);
      });

      // Divider
      yPos += 5;
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
      
      // Total Cost
      pdf.setFontSize(16);
      pdf.setTextColor(59, 130, 246);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Cost:', margin, yPos + 5);
      pdf.setTextColor(30, 41, 59);
      pdf.text(formatCurrency(quotation?.total_cost), pageWidth - margin - 80, yPos + 5);
      yPos += 15;

      // Advance Amount
      if (quotation?.advance_amount > 0) {
        pdf.setFontSize(14);
        if (isAdvancePaid) {
          pdf.setTextColor(16, 185, 129); // Green for paid
          pdf.text('Advance Paid:', margin, yPos);
          pdf.text(formatCurrency(quotation.advance_amount), pageWidth - margin - 80, yPos);
          
          // Show payment details
          yPos += 8;
          pdf.setFontSize(10);
          pdf.setTextColor(100, 116, 139);
          pdf.setFont('helvetica', 'italic');
          if (advancePayment) {
            pdf.text(`Paid on: ${formatDate(advancePayment.paid_at || advancePayment.created_at)}`, margin, yPos);
            if (advancePayment.payment_method) {
              pdf.text(`via ${advancePayment.payment_method}`, margin + 80, yPos);
            }
          }
          yPos += 8;
        } else {
          pdf.setTextColor(245, 158, 11); // Amber for pending
          pdf.text('Advance Required:', margin, yPos);
          pdf.text(formatCurrency(quotation.advance_amount), pageWidth - margin - 80, yPos);
          yPos += 8;
        }
      }

      // Extra Charges Section
      if (extraCharges && extraCharges.length > 0) {
        yPos += 5;
        yPos = addSection('Extra Charges', yPos, '#F59E0B');
        
        extraCharges.forEach(charge => {
          const status = charge.status === 'completed' ? 'Paid' : 'Pending';
          const statusColor = charge.status === 'completed' ? '#10B981' : '#F59E0B';
          
          pdf.setFontSize(11);
          pdf.setTextColor(30, 41, 59);
          pdf.setFont('helvetica', 'normal');
          pdf.text(charge.description || 'Extra Charge', margin, yPos);
          
          pdf.setTextColor(parseInt(statusColor.slice(1,3),16), parseInt(statusColor.slice(3,5),16), parseInt(statusColor.slice(5,7),16));
          pdf.setFont('helvetica', 'bold');
          pdf.text(formatCurrency(charge.amount), pageWidth - margin - 120, yPos);
          
          pdf.setTextColor(100, 116, 139);
          pdf.setFont('helvetica', 'italic');
          pdf.text(status, pageWidth - margin - 60, yPos);
          
          yPos += 8;
        });
        
        // Extra Charges Total
        yPos += 2;
        pdf.setDrawColor(245, 158, 11);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        
        pdf.setFontSize(12);
        pdf.setTextColor(245, 158, 11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Total Extra Charges:', margin, yPos + 4);
        pdf.text(formatCurrency(extraCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)), pageWidth - margin - 80, yPos + 4);
        yPos += 12;
      }

      // Payment Summary
      if (paymentSummary) {
        yPos += 5;
        yPos = addSection('Payment Summary', yPos, '#10B981');
        
        pdf.setFontSize(11);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Total Paid:', margin, yPos);
        pdf.setTextColor(16, 185, 129);
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatCurrency(paymentSummary.totalPaid), pageWidth - margin - 80, yPos);
        yPos += 8;
        
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Balance Due:', margin, yPos);
        pdf.setTextColor(paymentSummary.balance > 0 ? 239 : 16, paymentSummary.balance > 0 ? 68 : 185, paymentSummary.balance > 0 ? 68 : 129);
        pdf.setFont('helvetica', 'bold');
        pdf.text(formatCurrency(paymentSummary.balance), pageWidth - margin - 80, yPos);
        yPos += 8;
      }

      // Generated By
      if (generatedBy) {
        pdf.setFontSize(11);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Generated by: ${generatedBy}`, margin, pageHeight - 25);
      }

      // Footer
      addPdfFooter(pdf, pageWidth, pageHeight, margin, timestamp, `Quotation ID: ${quotation?.id?.slice(0, 8)}`);
      
      // Save the PDF
      pdf.save(`quotation-${displayProjectName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const downloadCSV = () => {
    if (!quotation) return;
    const displayProjectName = project?.name || `Project ${quotation.project_id}`;
    const isApproved = quotation.approved || false;
    const rows = [
      ['Field', 'Value'],
      ['Project', displayProjectName],
      ['Location', project?.location || ''],
      ['Status', isApproved ? 'Approved' : 'Pending'],
      ['Created', quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-IN') : ''],
      ['Approved At', quotation.approved_at ? new Date(quotation.approved_at).toLocaleDateString('en-IN') : ''],
      ['Material Cost', quotation.material_cost || 0],
      ['Labour Cost', quotation.labour_cost || 0],
      ['Transport Cost', quotation.transport_cost || 0],
      ['Other Cost', quotation.other_cost || 0],
      ['Total Cost', quotation.total_cost || 0],
      ['Advance Required', quotation.advance_amount || 0],
      ...extraCharges.map(e => [`Extra: ${e.description || 'Charge'}`, e.amount]),
      ['Total Paid', paymentSummary?.totalPaid || ''],
      ['Balance Due', paymentSummary?.balance || ''],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotation-${displayProjectName.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!quotation) return;
    const displayProjectName = project?.name || `Project ${quotation.project_id}`;
    const isApproved = quotation.approved || false;
    const rows = [
      ['Field', 'Value'],
      ['Project', displayProjectName],
      ['Location', project?.location || ''],
      ['Status', isApproved ? 'Approved' : 'Pending'],
      ['Created', quotation.created_at ? new Date(quotation.created_at).toLocaleDateString('en-IN') : ''],
      ['Approved At', quotation.approved_at ? new Date(quotation.approved_at).toLocaleDateString('en-IN') : ''],
      ['Material Cost', quotation.material_cost || 0],
      ['Labour Cost', quotation.labour_cost || 0],
      ['Transport Cost', quotation.transport_cost || 0],
      ['Other Cost', quotation.other_cost || 0],
      ['Total Cost', quotation.total_cost || 0],
      ['Advance Required', quotation.advance_amount || 0],
      ...extraCharges.map(e => [`Extra: ${e.description || 'Charge'}`, e.amount]),
      ['Total Paid', paymentSummary?.totalPaid || ''],
      ['Balance Due', paymentSummary?.balance || ''],
    ];
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Quotation"><Table>${
      rows.map(r => `<Row>${r.map(v => `<Cell><Data ss:Type="String">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>`).join('')
    }</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotation-${displayProjectName.replace(/\s+/g, '-')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading quotation...</p>
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
          <button className="btn-primary" onClick={() => navigate('/quotations')}>
            Back to Quotations
          </button>
          <button className="btn-secondary" onClick={loadData}>
            <i className="fas fa-sync-alt"></i> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="page-container">
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <p>Quotation not found</p>
          <button className="btn-primary" onClick={() => navigate('/quotations')}>
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  const canApprove = user?.role === 'customer' && !quotation.approved;
  const canPayAdvance = user?.role === 'customer' && quotation.approved && quotation.advance_amount > 0 && !isAdvancePaid;
  const isApproved = quotation.approved || false;
  const displayProjectName = project?.name || `Project ${quotation.project_id}`;

  return (
    <div className="quotation-details-page">
      {/* Back Button */}
      <button className="btn-back" onClick={() => navigate('/quotations')}>
        <i className="fas fa-arrow-left"></i> Back to Quotations
      </button>

      {/* Hero Section */}
      <div className="quotation-hero" style={{ background: 'linear-gradient(135deg, #3B82F6, #1E3A8A)' }}>
        <div className="hero-content">
          <div className="hero-top">
            <div className="hero-badge">
              <i className="fas fa-indian-rupee-sign"></i>
              <span>Quotation</span>
            </div>
            <div className="status-badge-group">
              <div className={`status-badge ${isApproved ? 'approved' : 'pending'}`}>
                <i className={`fas ${isApproved ? 'fa-check-circle' : 'fa-clock'}`}></i>
                <span>{isApproved ? 'APPROVED' : 'PENDING'}</span>
              </div>
              {isAdvancePaid && (
                <div className="status-badge advance-paid">
                  <i className="fas fa-check-circle"></i>
                  <span>ADVANCE PAID</span>
                </div>
              )}
            </div>
          </div>

          <h1 className="project-title">{displayProjectName}</h1>
          
          {project?.location && (
            <div className="project-location">
              <i className="fas fa-map-marker-alt"></i>
              <span>{project.location}</span>
            </div>
          )}
          
          <div className="project-meta">
            <div className="meta-item">
              <i className="fas fa-calendar-alt"></i>
              <span>Created: {formatDate(quotation.created_at)}</span>
            </div>
            {generatedBy && (
              <div className="meta-item">
                <i className="fas fa-user"></i>
                <span>Generated by: {generatedBy}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="hero-decoration-1"></div>
        <div className="hero-decoration-2"></div>
      </div>

      {/* Action Buttons Grid */}
      <div className="action-buttons-grid">
        {/* Pay Advance Button - Only if advance not paid */}
        {canPayAdvance && (
          <button 
            className="action-card advance"
            onClick={handlePayAdvance}
          >
            <i className="fas fa-bank"></i>
            <span>Pay Advance ({formatCurrency(quotation.advance_amount)})</span>
            <i className="fas fa-chevron-right arrow"></i>
          </button>
        )}

        {/* View Site Report Button */}
        <button 
          className="action-card report"
          onClick={handleViewReport}
        >
          <i className="fas fa-file-alt"></i>
          <span>View Site Report</span>
          <i className="fas fa-chevron-right arrow"></i>
        </button>

        {/* Download Buttons */}
        <button 
          className="action-card download"
          onClick={downloadPDF}
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
          className="action-card download"
          style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)' }}
          onClick={downloadCSV}
          disabled={downloading}
        >
          <i className="fas fa-file-csv"></i>
          <span>CSV</span>
        </button>
        <button 
          className="action-card download"
          style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
          onClick={downloadExcel}
          disabled={downloading}
        >
          <i className="fas fa-file-excel"></i>
          <span>Excel</span>
        </button>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Project Summary Card */}
        <div className="info-card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-clipboard-list" style={{ color: '#3B82F6' }}></i>
              <h3>Project Summary</h3>
            </div>
          </div>
          <div className="card-content">
            <div className="info-row">
              <span className="info-label">Project ID</span>
              <span className="info-value">{project?.id || quotation.project_id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Project Name</span>
              <span className="info-value">{project?.name || displayProjectName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Location</span>
              <span className="info-value">{project?.location || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <div className={`status-chip ${isApproved ? 'approved' : 'pending'}`}>
                {isApproved ? 'CUSTOMER APPROVED' : 'QUOTATION GENERATED'}
              </div>
            </div>
          </div>
        </div>

        {/* Site Report Details Card */}
        {report && (
          <div className="info-card">
            <div className="card-header">
              <div className="card-title">
                <i className="fas fa-hard-hat" style={{ color: '#8B5CF6' }}></i>
                <h3>Site Report Details</h3>
              </div>
            </div>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Total Floors</span>
                <span className="info-value">{report.total_floors}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Dimensions</span>
                <span className="info-value">{report.dimensions || 'N/A'}</span>
              </div>
              {report.remarks && (
                <div className="remarks-container">
                  <span className="remarks-label">Remarks</span>
                  <div className="remarks-box">
                    <p className="remarks-text">{report.remarks}</p>
                  </div>
                </div>
              )}
              {report.images && report.images.length > 0 && (
                <div className="images-preview">
                  <span className="images-label">
                    <i className="fas fa-images"></i>
                    {report.images.length} Site Image{report.images.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quotation Breakdown Card */}
        <div className="info-card quotation-card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-calculator" style={{ color: '#3B82F6' }}></i>
              <h3>Quotation Breakdown</h3>
            </div>
          </div>
          <div className="card-content">
            <div className="breakdown-row">
              <span className="breakdown-label">Material Cost</span>
              <span className="breakdown-value">{formatCurrency(quotation.material_cost)}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Labour Cost</span>
              <span className="breakdown-value">{formatCurrency(quotation.labour_cost)}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Transport Cost</span>
              <span className="breakdown-value">{formatCurrency(quotation.transport_cost)}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Other Cost</span>
              <span className="breakdown-value">{formatCurrency(quotation.other_cost)}</span>
            </div>
            
            <div className="divider"></div>
            
            <div className="total-row">
              <span className="total-label">Total Cost</span>
              <span className="total-value">{formatCurrency(quotation.total_cost)}</span>
            </div>
            
            {quotation.advance_amount > 0 && (
              <div className={`advance-row ${isAdvancePaid ? 'paid' : ''}`}>
                <span className="advance-label">
                  {isAdvancePaid ? 'Advance Paid' : 'Advance Required'}
                </span>
                <span className="advance-value">{formatCurrency(quotation.advance_amount)}</span>
              </div>
            )}
            
            {isAdvancePaid && advancePayment && (
              <div className="advance-payment-info">
                <span className="advance-payment-date">
                  Paid on {formatDate(advancePayment.paid_at || advancePayment.created_at)}
                </span>
                {advancePayment.payment_method && (
                  <span className="advance-payment-method">
                    via {advancePayment.payment_method}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Extra Charges Card */}
        {extraCharges && extraCharges.length > 0 && (
          <div className="info-card extra-charges-card">
            <div className="card-header">
              <div className="card-title">
                <i className="fas fa-exclamation-triangle" style={{ color: '#F59E0B' }}></i>
                <h3>Extra Charges</h3>
              </div>
            </div>
            <div className="card-content">
              {extraCharges.map((charge, index) => {
                const isPending = charge.status === 'pending' && charge.payment_method !== null;
                
                return (
                  <div key={charge.id || index} className="extra-charge-item">
                    <div className="extra-charge-header">
                      <span className="extra-charge-description">
                        {charge.description || 'Extra Charge'}
                      </span>
                      <div className={`extra-charge-status ${charge.status}`}>
                        {charge.status === 'completed' ? 'Paid' : 'Pending'}
                      </div>
                    </div>
                    
                    <div className="extra-charge-details">
                      <span className={`extra-charge-amount ${charge.status}`}>
                        {formatCurrency(charge.amount)}
                      </span>
                      
                      {/* Only show Pay Now button for pending charges */}
                      {isPending && (
                        <button
                          className="pay-extra-button"
                          onClick={() => handlePayExtraCharge(charge)}
                        >
                          Pay Now
                          <i className="fas fa-arrow-right"></i>
                        </button>
                      )}
                      
                      {/* Show paid badge for completed charges */}
                      {charge.status === 'completed' && (
                        <div className="paid-badge">
                          <i className="fas fa-check-circle"></i>
                          <span>Paid</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <div className="divider"></div>
              
              <div className="extra-charge-total">
                <span className="extra-charge-total-label">Total Extra Charges</span>
                <span className="extra-charge-total-value">
                  {formatCurrency(extraCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary Card */}
        {paymentSummary && (
          <div className="info-card payment-card">
            <div className="card-header">
              <div className="card-title">
                <i className="fas fa-wallet" style={{ color: '#10B981' }}></i>
                <h3>Payment Summary</h3>
              </div>
            </div>
            <div className="card-content">
              <div className="payment-row">
                <span className="payment-label">Total Paid</span>
                <span className="payment-value success">{formatCurrency(paymentSummary.totalPaid)}</span>
              </div>
              
              <div className="payment-row">
                <span className="payment-label">Balance Due</span>
                <span className={`payment-value ${paymentSummary.balance > 0 ? 'danger' : 'success'}`}>
                  {formatCurrency(paymentSummary.balance)}
                </span>
              </div>
              
              {paymentSummary.hasPendingFinalPayment && (
                <div className="pending-payment-badge">
                  <i className="fas fa-clock" style={{ color: '#F59E0B' }}></i>
                  <span>Final Payment Under Verification</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quotation Status Card */}
        <div className="info-card">
          <div className="card-header">
            <div className="card-title">
              <i className="fas fa-info-circle" style={{ color: '#3B82F6' }}></i>
              <h3>Quotation Status</h3>
            </div>
          </div>
          <div className="card-content">
            <div className="info-row">
              <span className="info-label">Approved</span>
              <div className="approved-indicator">
                <i className={`fas ${isApproved ? 'fa-check-circle' : 'fa-times-circle'}`} 
                   style={{ color: isApproved ? '#10B981' : '#EF4444', marginRight: '6px' }}></i>
                <span style={{ color: isApproved ? '#10B981' : '#EF4444', fontWeight: '600' }}>
                  {isApproved ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            {isApproved && quotation.approved_at && (
              <div className="info-row">
                <span className="info-label">Approved At</span>
                <span className="info-value date-value">{formatDate(quotation.approved_at)}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Created At</span>
              <span className="info-value date-value">{formatDate(quotation.created_at)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Generated By</span>
              <span className="info-value">{generatedBy || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Button */}
      {canApprove && (
        <div className="approve-section">
          <button 
            className="btn-approve"
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? (
              <>
                <div className="spinner-small"></div>
                <span>Approving...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check-circle"></i>
                <span>Approve Quotation</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Approved Badge */}
      {isApproved && (
        <div className="approved-badge-container">
          <div className="approved-badge">
            <i className="fas fa-check-circle"></i>
            <span>APPROVED QUOTATION</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewQuotation;