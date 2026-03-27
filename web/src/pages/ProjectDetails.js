import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ProjectDetails.css';

const BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace('/api/v1', '');
const isVideoFile = (path) => /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(path);

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [worklogs, setWorklogs] = useState([]);
  const [visits, setVisits] = useState([]);
  const [sitePlans, setSitePlans] = useState([]);
  
  // Modal states
  const [showPMModal, setShowPMModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showWorklogModal, setShowWorklogModal] = useState(false);
  const [showAddImagesModal, setShowAddImagesModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Quotation modal state
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationForm, setQuotationForm] = useState({ materialCost: '', labourCost: '', transportCost: '', otherCost: '', totalCost: '', advanceAmount: '' });
  const [quotationErrors, setQuotationErrors] = useState({});
  const [submittingQuotation, setSubmittingQuotation] = useState(false);
  
  // User lists
  const [projectManagers, setProjectManagers] = useState([]);
  const [siteIncharges, setSiteIncharges] = useState([]);
  const [financeUsers, setFinanceUsers] = useState([]);
  
  // Form states
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [worklogDescription, setWorklogDescription] = useState('');
  const [selectedWorklog, setSelectedWorklog] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  
  // UI states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [siteInchargeName, setSiteInchargeName] = useState('');

  // State for checking completed visits
  const [hasCompletedVisit, setHasCompletedVisit] = useState(false);
  const [hasExistingReport, setHasExistingReport] = useState(false);
  const [hasFinalPaymentCompleted, setHasFinalPaymentCompleted] = useState(false);

  // Floors state
  const [floors, setFloors] = useState([]);
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [showFloorSiteModal, setShowFloorSiteModal] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Rating state
  const [projectRating, setProjectRating] = useState(null);
  const [loadingRating, setLoadingRating] = useState(false);

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
    fetchProjectDetails();
  }, [id]);

  useEffect(() => {
    if (project?.site_id && user?.role !== 'customer') {
      fetchSiteInchargeName();
    }
  }, [project?.site_id]);

  const fetchProjectDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {};

      // Fetch project
      const projectResponse = await api.get(`/projects/${id}`);
      const projectData = projectResponse.data.data.project;
      setProject(projectData);

      // Fetch payment summary if applicable
      if (shouldFetchPaymentData(projectData)) {
        await fetchPaymentSummary(projectData.id);
      }

      // Fetch worklogs if work started
      if (['WORK_STARTED', 'COMPLETED', 'FINAL_PAID', 'CLOSED'].includes(projectData.status)) {
        await fetchWorklogs(projectData.id);
      }

      // Fetch visits
      await fetchVisits(projectData.id);

      // Fetch site plans
      await fetchSitePlans(projectData.id);

      // Fetch floors
      await fetchFloors(projectData.id);

      // Fetch rating if project is closed
      if (projectData.status === 'CLOSED') {
        await fetchProjectRating(projectData.id);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      alert('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const shouldFetchPaymentData = (projectData) => {
    return (
      (user?.role === 'customer' && projectData.customer_id === user.id) ||
      (user?.role === 'project_manager' && projectData.pm_id === user.id) ||
      (user?.role === 'admin') ||
      (user?.role === 'super_admin')
    ) && (
      projectData.status === 'CUSTOMER_APPROVED' ||
      projectData.status === 'WORK_STARTED' || 
      projectData.status === 'COMPLETED' ||
      projectData.status === 'FINAL_PAID' ||
      projectData.status === 'CLOSED'
    );
  };

  const fetchPaymentSummary = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {};

      const [quotationRes, paymentsRes] = await Promise.all([
        api.get(`/quotations/project/${projectId}`),
        api.get(`/payments/project/${projectId}`)
      ]);

      const quotation = quotationRes.data.data.quotation;
      const payments = paymentsRes.data.data.payments;

      if (!quotation) {
        setPaymentSummary(null);
        return;
      }

      const regularPayments = payments.filter(p => p.type !== 'extra');
      const extraCharges = payments.filter(p => p.type === 'extra');
      
      const totalPaid = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const extraChargesTotal = extraCharges
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const pendingExtraCharges = extraCharges.filter(p => p.status === 'pending' && p.payment_method !== null);
      const pendingExtraTotal = pendingExtraCharges
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      const totalCost = parseFloat(quotation.total_cost || 0);
      const totalCostWithExtras = totalCost + extraChargesTotal;
      const balance = totalCostWithExtras - totalPaid;

      const hasPendingFinalPayment = payments.some(
        p => p.type === 'final' && p.status === 'pending'
      );

      const finalPaymentCompleted = payments.some(
        p => p.type === 'final' && p.status === 'completed'
      );

      setHasFinalPaymentCompleted(finalPaymentCompleted);

      setPaymentSummary({
        totalCost,
        extraChargesTotal,
        totalCostWithExtras,
        totalPaid,
        balance,
        payments,
        extraCharges,
        pendingExtraCharges,
        hasPendingFinalPayment,
      });
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      setPaymentSummary(null);
    }
  };

  const fetchWorklogs = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/worklogs/project/${projectId}`);
      setWorklogs(response.data.data.worklogs || []);
    } catch (error) {
      console.error('Error fetching worklogs:', error);
    }
  };

  const fetchVisits = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/visits/project/${projectId}`);
      const visitsData = response.data.data.visits || [];
      setVisits(visitsData);
      
      // Check if there's a completed visit
      const hasCompleted = visitsData.some(visit => visit.status === 'completed');
      setHasCompletedVisit(hasCompleted);
    } catch (error) {
      console.error('Error fetching visits:', error);
    }
  };

  const fetchSitePlans = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/projects/${projectId}/site-plans`);
      setSitePlans(response.data.data.sitePlans || []);
    } catch (error) {
      console.error('Error fetching site plans:', error);
    }
  };

  const fetchFloors = async (projectId) => {
    try {
      const res = await api.get(`/projects/${projectId}/floors`);
      setFloors(res.data.data?.floors || []);
    } catch (e) {
      console.error('Error fetching floors:', e);
    }
  };

  const fetchProjectRating = async (projectId) => {
    try {
      setLoadingRating(true);
      const res = await api.get(`/projects/${projectId}/ratings`);
      setProjectRating(res.data.data?.rating || null);
    } catch (e) {
      console.error('Error fetching rating:', e);
    } finally {
      setLoadingRating(false);
    }
  };

  const handleAddFloor = async () => {
    if (!newFloorName.trim()) return alert('Floor name is required');
    try {
      setSubmitting(true);
      await api.post(`/projects/${id}/floors`, { floorName: newFloorName.trim() });
      setNewFloorName('');
      setShowAddFloorModal(false);
      await fetchFloors(id);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to add floor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFloor = async (floorId) => {
    if (!window.confirm('Delete this floor?')) return;
    try {
      await api.delete(`/projects/${id}/floors/${floorId}`);
      await fetchFloors(id);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete floor');
    }
  };

  const handleAssignFloorSite = async (siteInchargeId) => {
    if (!selectedFloor) return;
    try {
      setSubmitting(true);
      await api.patch(`/projects/${id}/floors/${selectedFloor.id}/assign-site`, { siteInchargeId });
      setShowFloorSiteModal(false);
      setSelectedFloor(null);
      await fetchFloors(id);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to assign site incharge');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchSiteInchargeName = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/users/${project.site_id}`);
      setSiteInchargeName(response.data.data.user.name || '');
    } catch (error) {
      console.error('Error fetching site incharge name:', error);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/users`);
      const pmUsers = response.data.data.users.filter(
        u => u.role === 'project_manager' && u.is_active
      );
      setProjectManagers(pmUsers);
    } catch (error) {
      console.error('Error fetching PMs:', error);
      alert('Failed to load project managers');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSiteIncharges = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/users`);
      const siteUsers = response.data.data.users.filter(
        u => u.role === 'site_incharge' && u.is_active
      );
      setSiteIncharges(siteUsers);
    } catch (error) {
      console.error('Error fetching site incharges:', error);
      alert('Failed to load site incharges');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchFinanceUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/users`);
      const financeList = response.data.data.users.filter(
        u => u.role === 'finance' && u.is_active
      );
      setFinanceUsers(financeList);
    } catch (error) {
      console.error('Error fetching finance users:', error);
      alert('Failed to load finance users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignPM = async (pmId) => {
    try {
      setSubmitting(true);
      const response = await api.patch(
        `/projects/${id}/assign-pm`,
        { pmId }
      );
      setProject(response.data.data.project);
      setShowPMModal(false);
      alert('Project Manager assigned successfully!');
      fetchProjectDetails();
    } catch (error) {
      console.error('Error assigning PM:', error);
      alert(error.response?.data?.message || 'Failed to assign Project Manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSite = async (siteId) => {
    try {
      setSubmitting(true);
      const response = await api.patch(
        `/projects/${id}/assign-site`,
        { siteId }
      );
      setProject(response.data.data.project);
      setShowSiteModal(false);
      alert('Site Incharge assigned successfully!');
      fetchProjectDetails();
    } catch (error) {
      console.error('Error assigning site:', error);
      alert(error.response?.data?.message || 'Failed to assign Site Incharge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignFinance = async (financeId) => {
    try {
      setSubmitting(true);
      const response = await api.patch(
        `/projects/${id}/assign-finance`,
        { financeId }
      );
      setProject(response.data.data.project);
      setShowFinanceModal(false);
      alert('Finance Manager assigned successfully!');
      fetchProjectDetails();
    } catch (error) {
      console.error('Error assigning finance:', error);
      alert(error.response?.data?.message || 'Failed to assign Finance Manager');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-calculate quotation total
  useEffect(() => {
    const m = parseFloat(quotationForm.materialCost) || 0;
    const l = parseFloat(quotationForm.labourCost) || 0;
    const t = parseFloat(quotationForm.transportCost) || 0;
    const o = parseFloat(quotationForm.otherCost) || 0;
    const calc = m + l + t + o;
    setQuotationForm(prev => ({ ...prev, totalCost: calc > 0 ? calc.toFixed(2) : '' }));
  }, [quotationForm.materialCost, quotationForm.labourCost, quotationForm.transportCost, quotationForm.otherCost]);

  const handleSubmitQuotation = async () => {
    const errors = {};
    ['materialCost', 'labourCost', 'transportCost', 'otherCost'].forEach(f => {
      if (quotationForm[f] === '') errors[f] = 'Required (enter 0 if none)';
      else if (parseFloat(quotationForm[f]) < 0) errors[f] = 'Cannot be negative';
    });
    if (quotationForm.advanceAmount && parseFloat(quotationForm.advanceAmount) > parseFloat(quotationForm.totalCost)) {
      errors.advanceAmount = 'Cannot exceed total cost';
    }
    setQuotationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmittingQuotation(true);
      await api.post('/quotations', {
        projectId: id,
        materialCost: parseFloat(quotationForm.materialCost) || 0,
        labourCost: parseFloat(quotationForm.labourCost) || 0,
        transportCost: parseFloat(quotationForm.transportCost) || 0,
        otherCost: parseFloat(quotationForm.otherCost) || 0,
        totalCost: parseFloat(quotationForm.totalCost) || 0,
        advanceAmount: quotationForm.advanceAmount ? parseFloat(quotationForm.advanceAmount) : 0,
      });
      alert('Quotation generated successfully!');
      setShowQuotationModal(false);
      fetchProjectDetails();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to generate quotation');
    } finally {
      setSubmittingQuotation(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!validateVisitForm()) return;

    try {
      setSubmitting(true);
      const visitData = {
        projectId: id,
        siteId: project.site_id,
        visitDate,
        visitTime: visitTime.length === 5 ? `${visitTime}:00` : visitTime,
      };
      await api.post(`/visits`, visitData);

      alert('Visit scheduled successfully!');
      setShowVisitModal(false);
      setVisitDate('');
      setVisitTime('');
      setValidationErrors({});
      fetchVisits(id);
    } catch (error) {
      console.error('Error scheduling visit:', error);
      const errorMsg = error.response?.data?.message || 'Failed to schedule visit';
      if (errorMsg.includes('already has a visit')) {
        alert('The selected Site Incharge already has a visit scheduled at this date and time.');
      } else {
        alert(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validateVisitForm = () => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!visitDate) {
      errors.visitDate = 'Visit date is required';
    } else {
      const selectedDate = new Date(visitDate);
      if (selectedDate < today) {
        errors.visitDate = 'Cannot select past date';
      }
    }

    if (!visitTime) {
      errors.visitTime = 'Visit time is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmVisit = () => {
    if (!window.confirm('Are you sure the visit has been successfully completed?')) return;
    handleUpdateStatus('VISIT_DONE', 'Visit confirmed successfully!');
  };

  const handleUpdateStatus = async (newStatus, successMessage) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await api.patch(
        `/projects/${id}/status`,
        { status: newStatus }
      );
      setProject(response.data.data.project);
      alert(successMessage);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const validateWorklogForm = () => {
    const errors = {};

    if (!floorNumber) {
      errors.floorNumber = 'Floor number is required';
    } else {
      const floorNum = parseInt(floorNumber);
      if (isNaN(floorNum) || floorNum <= 0 || !Number.isInteger(floorNum)) {
        errors.floorNumber = 'Floor number must be a positive integer';
      }
    }

    if (!worklogDescription || worklogDescription.trim() === '') {
      errors.description = 'Description is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateWorklog = async () => {
    if (!validateWorklogForm()) return;

    try {
      setSubmitting(true);
      const worklogData = {
        projectId: id,
        floorNumber: parseInt(floorNumber),
        description: worklogDescription.trim(),
      };
      await api.post(`/worklogs`, worklogData);

      alert('Work log created successfully!');
      setShowWorklogModal(false);
      setFloorNumber('');
      setWorklogDescription('');
      setValidationErrors({});
      fetchWorklogs(id);
    } catch (error) {
      console.error('Error creating worklog:', error);
      alert(error.response?.data?.message || 'Failed to create work log');
    } finally {
      setSubmitting(false);
    }
  };

  // Image upload handlers
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Convert files to object URLs for preview
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setSelectedImages([...selectedImages, ...newImages]);
  };

  const handleRemoveImage = (index) => {
    // Revoke object URL to free memory
    if (selectedImages[index].preview) {
      URL.revokeObjectURL(selectedImages[index].preview);
    }
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleSubmitImages = async () => {
    if (selectedImages.length === 0) {
      alert('Please select at least one image');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const formData = new FormData();
      selectedImages.forEach((img, index) => {
        formData.append('images', img.file);
      });

      await api.post(
        `/worklogs/${selectedWorklog.id}/images`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      alert('Images added successfully!');
      
      // Clean up object URLs
      selectedImages.forEach(img => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
      
      setShowAddImagesModal(false);
      setSelectedImages([]);
      fetchWorklogs(id);
    } catch (error) {
      console.error('Error adding images:', error);
      alert(error.response?.data?.message || 'Failed to add images');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveWorklogImage = async (worklogId, imagePath) => {
    if (!window.confirm('Are you sure you want to remove this image?')) return;

    try {
      await api.delete(
        `/worklogs/${worklogId}/images`,
        { data: { imagePath } }
      );
      alert('Image removed successfully');
      fetchWorklogs(id);
    } catch (error) {
      console.error('Error removing image:', error);
      alert(error.response?.data?.message || 'Failed to remove image');
    }
  };

  const openImageViewer = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageViewer(true);
  };

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
    return statusColors[status] || '#757575';
  };

  const getWorkStatus = (status) => {
    return status.replace(/_/g, ' ');
  };

  // Filter visits by status
  const scheduledVisits = visits.filter(visit => visit.status === 'scheduled');
  const rejectedVisits = visits.filter(visit => visit.status === 'rejected');
  const completedVisits = visits.filter(visit => visit.status === 'completed');

  // Permission checks
  const canAssignPM = user?.role === 'admin' && project?.status === 'CREATED';
  const canAssignSite = user?.role === 'project_manager' && project?.pm_id === user.id && !project?.site_id;
  const canAssignFinance = user?.role === 'admin' && !project?.finance_id;
  
  const canScheduleVisit = user?.role === 'project_manager' && 
    project?.pm_id === user.id && 
    project?.site_id !== null && 
    project?.status === 'PM_ASSIGNED';

  const canConfirmVisit = user?.role === 'project_manager' && 
    project?.pm_id === user.id && 
    project?.status === 'PM_ASSIGNED' &&
    hasCompletedVisit;

  const canSubmitReport = user?.role === 'site_incharge' && 
    project?.site_id === user.id && 
    project?.status === 'VISIT_DONE';

  const canStartWork = user?.role === 'project_manager' && 
    project?.pm_id === user.id && 
    project?.status === 'ADVANCE_PAID';

  const canMarkCompleted = user?.role === 'project_manager' && 
    project?.pm_id === user.id && 
    project?.status === 'WORK_STARTED';

  const canCloseProject = (user?.role === 'admin' || user?.role === 'super_admin') && 
    project?.status === 'FINAL_PAID';

  const canPayFinal = user?.role === 'customer' && 
    project?.customer_id === user.id && 
    (project?.status === 'WORK_STARTED' || project?.status === 'COMPLETED');

  const canAddExtraCharge = user?.role === 'finance' && 
    ['CUSTOMER_APPROVED', 'ADVANCE_PENDING', 'ADVANCE_PAID', 'WORK_STARTED', 'COMPLETED'].includes(project?.status);

  const canGenerateQuotation = user?.role === 'finance' &&
    project?.finance_id === user?.id &&
    project?.status === 'REPORT_SUBMITTED';

  const canManageFloors = ['admin', 'super_admin'].includes(user?.role);
  const canAssignFloorSite = user?.role === 'project_manager' && project?.pm_id === user?.id;

  const canViewWorklogs =
    (user?.role === 'super_admin') ||
    (user?.role === 'admin') ||
    (user?.role === 'finance' && project?.finance_id === user?.id);

  const canAddWorklogs =
    (
      user?.role === 'super_admin' ||
      user?.role === 'admin' ||
      (user?.role === 'finance' && project?.finance_id === user?.id)
    ) &&
    project?.status === 'WORK_STARTED';

  const shouldShowPaymentSummary = user?.role === 'customer' && 
    project?.customer_id === user.id &&
    (project?.status === 'WORK_STARTED' || 
     project?.status === 'COMPLETED' ||
     project?.status === 'FINAL_PAID' ||
     project?.status === 'CLOSED');

  if (loading) {
    return (
      <div className={isDarkMode ? "dark-theme page-container" : "light-theme page-container"}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={isDarkMode ? "dark-theme page-container" : "light-theme page-container"}>
        <div className="error-container">
          <i className="fas fa-exclamation-circle"></i>
          <p>Project not found</p>
          <button className="btn-primary" onClick={() => navigate('/projects')}>
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? "dark-theme page-container" : "light-theme page-container"}>
      {/* Modern Project Header */}
      <div className="project-hero">
        <div className="project-hero-left">
          <button className="btn-back-modern" onClick={() => navigate('/projects')}>
            <i className="fas fa-arrow-left"></i>
          </button>

          <div>
            <h1 className="project-title">{project.name}</h1>
            <p className="project-location">
              <i className="fas fa-map-marker-alt"></i> {project.location}
            </p>
          </div>
        </div>

        <div 
          className="project-status-badge"
          style={{ backgroundColor: getStatusColor(project.status) }}
        >
          {getWorkStatus(project.status)}
        </div>
      </div>

      {/* Status Stepper */}
      <div className="status-stepper">
        {[
          "CREATED",
          "PM_ASSIGNED",
          "VISIT_DONE",
          "REPORT_SUBMITTED",
          "CUSTOMER_APPROVED",
          "ADVANCE_PAID",
          "WORK_STARTED",
          "COMPLETED",
          "CLOSED"
        ].map((step, index) => {
          const stepIndex = [
            "CREATED",
            "PM_ASSIGNED",
            "VISIT_DONE",
            "REPORT_SUBMITTED",
            "CUSTOMER_APPROVED",
            "ADVANCE_PAID",
            "WORK_STARTED",
            "COMPLETED",
            "CLOSED"
          ].indexOf(project.status);
          
          const isActive = index <= stepIndex;
          const isCurrent = project.status === step;
          
          return (
            <div 
              key={index}
              className={`step ${isActive ? "active" : ""} ${isCurrent ? "current" : ""}`}
            >
              <div className="step-dot"></div>
              <span>{step.replace(/_/g, ' ')}</span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons Grid */}
      <div className="action-buttons-grid">
        {canAssignPM && (
          <button 
            className="action-card primary"
            onClick={() => {
              setShowPMModal(true);
              fetchProjectManagers();
            }}
          >
            <i className="fas fa-user-tie"></i>
            <span>Assign PM</span>
          </button>
        )}

        {canAssignSite && (
          <button 
            className="action-card success"
            onClick={() => {
              setShowSiteModal(true);
              fetchSiteIncharges();
            }}
          >
            <i className="fas fa-hard-hat"></i>
            <span>Assign Site</span>
          </button>
        )}

        {canAssignFinance && (
          <button 
            className="action-card warning"
            onClick={() => {
              setShowFinanceModal(true);
              fetchFinanceUsers();
            }}
          >
            <i className="fas fa-chart-line"></i>
            <span>Assign Finance</span>
          </button>
        )}

        {canScheduleVisit && (
          <button 
            className="action-card warning"
            onClick={() => setShowVisitModal(true)}
          >
            <i className="fas fa-calendar-check"></i>
            <span>Schedule Visit</span>
          </button>
        )}

        {canConfirmVisit && (
          <button 
            className="action-card success"
            onClick={handleConfirmVisit}
          >
            <i className="fas fa-check-circle"></i>
            <span>Confirm Visit</span>
          </button>
        )}

        {canSubmitReport && (
          <button 
            className="action-card primary"
            onClick={() => navigate(`/projects/${id}/submit-report`)}
          >
            <i className="fas fa-file-alt"></i>
            <span>Submit Report</span>
          </button>
        )}

        {canStartWork && (
          <button 
            className="action-card success"
            onClick={() => {
              if (window.confirm('Are you sure you want to start work on this project?')) {
                handleUpdateStatus('WORK_STARTED', 'Work started successfully!');
              }
            }}
          >
            <i className="fas fa-play"></i>
            <span>Start Work</span>
          </button>
        )}

        {canMarkCompleted && (
          <button 
            className="action-card success"
            onClick={() => {
              if (window.confirm('Are you sure the work has been completed?')) {
                handleUpdateStatus('COMPLETED', 'Work marked as completed!');
              }
            }}
          >
            <i className="fas fa-check-double"></i>
            <span>Mark Completed</span>
          </button>
        )}

        {canCloseProject && (
          <>
            <button 
              className="action-card primary"
              onClick={() => navigate(`/projects/${id}/signature`)}
            >
              <i className="fas fa-signature"></i>
              <span>View Signature</span>
            </button>
            
            <button 
              className="action-card danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to close this project?')) {
                  handleUpdateStatus('CLOSED', 'Project closed successfully!');
                }
              }}
            >
              <i className="fas fa-archive"></i>
              <span>Close Project</span>
            </button>
          </>
        )}

        {canPayFinal && paymentSummary && paymentSummary.balance > 0 && (
          <button 
            className="action-card success"
            onClick={() => navigate(`/projects/${id}/pay-final`, { state: { paymentSummary } })}
          >
            <i className="fas fa-credit-card"></i>
            <span>Pay Final (₹{paymentSummary.balance.toFixed(2)})</span>
          </button>
        )}

        {canGenerateQuotation && (
          <button
            className="action-card primary"
            onClick={() => {
              setQuotationForm({ materialCost: '', labourCost: '', transportCost: '', otherCost: '', totalCost: '', advanceAmount: '' });
              setQuotationErrors({});
              setShowQuotationModal(true);
            }}
          >
            <i className="fas fa-file-invoice-dollar"></i>
            <span>Generate Quotation</span>
          </button>
        )}

        {canAddExtraCharge && (
          <button 
            className="action-card warning"
            onClick={() => navigate(`/projects/${id}/add-extra-charge`, { state: { project } })}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Add Extra Charge</span>
          </button>
        )}

        {user?.role === 'customer' && project?.customer_id === user?.id && (
          <button 
            className="action-card primary"
            onClick={() => navigate(`/projects/${id}/signature`)}
          >
            <i className="fas fa-signature"></i>
            <span>Add Signature</span>
          </button>
        )}

        {/* View Site Plans Button - Always Visible */}
        <button 
          className="action-card info"
          onClick={() => navigate(`/projects/${id}/site-plans`, { 
            state: { sitePlans, projectName: project.name } 
          })}
        >
          <i className="fas fa-map"></i>
          <span>View Site Plans {sitePlans.length > 0 ? `(${sitePlans.length})` : ''}</span>
        </button>
      </div>

      {/* Project Details Grid */}
      <div className="details-grid">
        {/* Project Information Card */}
        <div className="details-card">
          <h3 className="card-title">
            <i className="fas fa-info-circle"></i>
            Project Information
          </h3>
          <div className="detail-row">
            <span className="detail-label">Project ID</span>
            <span className="detail-value">{project.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Project Name</span>
            <span className="detail-value">{project.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Location</span>
            <span className="detail-value">{project.location}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status</span>
            <span className="detail-value status-badge" style={{ backgroundColor: getStatusColor(project.status) + '20', color: getStatusColor(project.status) }}>
              {getWorkStatus(project.status)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created Date</span>
            <span className="detail-value">
              {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Team Members Card */}
        <div className="details-card">
          <h3 className="card-title">
            <i className="fas fa-users"></i>
            Team Members
          </h3>
          <div className="team-member-row">
            <div className="member-avatar customer">
              <i className="fas fa-user"></i>
            </div>
            <div className="member-info">
              <span className="member-role">Customer</span>
              <span className="member-name">{project.customer_name || 'Not assigned'}</span>
              {project.customer_email && (
                <span className="member-contact"><a href={`mailto:${project.customer_email}`}>{project.customer_email}</a></span>
              )}
              {project.customer_phone && (
                <span className="member-contact"><a href={`tel:${project.customer_phone}`}>{project.customer_phone}</a></span>
              )}
            </div>
          </div>

          <div className="team-member-row">
            <div className="member-avatar pm">
              <i className="fas fa-user-tie"></i>
            </div>
            <div className="member-info">
              <span className="member-role">Project Manager</span>
              <span className="member-name">{project.pm_name || 'Not assigned'}</span>
              {project.pm_email && (
                <span className="member-contact">{project.pm_email}</span>
              )}
            </div>
          </div>

          <div className="team-member-row">
            <div className="member-avatar site">
              <i className="fas fa-hard-hat"></i>
            </div>
            <div className="member-info">
              <span className="member-role">Site Incharge</span>
              <span className="member-name">{project.site_name || 'Not assigned'}</span>
              {project.site_email && (
                <span className="member-contact">{project.site_email}</span>
              )}
            </div>
          </div>

          <div className="team-member-row">
            <div className="member-avatar finance">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="member-info">
              <span className="member-role">Finance Manager</span>
              <span className="member-name">{project.finance_name || 'Not assigned'}</span>
              {project.finance_email && (
                <span className="member-contact">{project.finance_email}</span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Summary Card */}
        {shouldShowPaymentSummary && paymentSummary && (
          <div className="details-card payment-card">
            <h3 className="card-title">
              <i className="fas fa-wallet"></i>
              Payment Summary
            </h3>
            
            <div className="payment-stats">
              <div className="payment-stat">
                <span className="payment-stat-label">Total Cost</span>
                <span className="payment-stat-value">₹{paymentSummary.totalCost.toFixed(2)}</span>
              </div>
              <div className="payment-stat">
                <span className="payment-stat-label">Paid</span>
                <span className="payment-stat-value success">₹{paymentSummary.totalPaid.toFixed(2)}</span>
              </div>
              <div className="payment-stat">
                <span className="payment-stat-label">Balance</span>
                <span className={`payment-stat-value ${paymentSummary.balance > 0 ? 'danger' : 'success'}`}>
                  ₹{paymentSummary.balance.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="payment-status">
              <div className={`status-chip ${paymentSummary.balance === 0 ? 'success' : paymentSummary.hasPendingFinalPayment ? 'warning' : 'info'}`}>
                {paymentSummary.balance === 0 ? '✓ Payment Complete' : 
                 paymentSummary.hasPendingFinalPayment ? '⏳ Under Verification' : 
                 'Payment Pending'}
              </div>
            </div>

            {paymentSummary.extraCharges && paymentSummary.extraCharges.length > 0 && (
              <div className="extra-charges">
                <h4>Extra Charges</h4>
                {paymentSummary.extraCharges.map((charge, index) => (
                  <div key={charge.id || index} className="extra-charge-item">
                    <div className="extra-charge-info">
                      <span className="extra-charge-desc">{charge.description || 'Extra charge'}</span>
                      <span className="extra-charge-amount">₹{Number(charge.amount).toFixed(2)}</span>
                    </div>
                    <div className="extra-charge-status">
                      <span className={`status-badge ${charge.status === 'completed' ? 'success' : charge.payment_method ? 'warning' : 'danger'}`}>
                        {charge.status === 'completed' ? 'Verified' : 
                         charge.payment_method ? 'Under Verification' : 
                         'Not Paid'}
                      </span>
                      {!charge.payment_method && charge.status === 'pending' && (
                        <button 
                          className="btn-small btn-warning"
                          onClick={() => navigate(`/projects/${id}/pay-extra`, { state: { project, extraCharge: charge } })}
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floors Section */}
      {(canManageFloors || canAssignFloorSite || floors.length > 0) && (
        <div className="worklogs-section">
          <div className="worklogs-header">
            <h3 className="section-title">
              <i className="fas fa-building"></i>
              Floors
            </h3>
            {canManageFloors && (
              <button className="btn-add-worklog" onClick={() => { setNewFloorName(''); setShowAddFloorModal(true); }}>
                <i className="fas fa-plus"></i> Add Floor
              </button>
            )}
          </div>

          {floors.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-building"></i>
              <p>{canManageFloors ? 'No floors added yet. Add floors to assign site incharges.' : 'No floors defined for this project.'}</p>
            </div>
          ) : (
            <div className="worklogs-grid">
              {floors.map(floor => (
                <div key={floor.id} className="worklog-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
                  <div className="worklog-header">
                    <div className="worklog-header-left">
                      <span className="worklog-floor-badge" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                        <i className="fas fa-layer-group" style={{ marginRight: 4 }}></i>
                        {floor.floor_name}
                      </span>
                    </div>
                    {canManageFloors && (
                      <button
                        onClick={() => handleDeleteFloor(floor.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14 }}
                        title="Delete floor"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    {floor.site_incharge_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065F46', fontWeight: 700, fontSize: 13 }}>
                          {floor.site_incharge_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{floor.site_incharge_name}</div>
                          {floor.site_incharge_email && <div style={{ fontSize: 11, color: '#6B7280' }}>{floor.site_incharge_email}</div>}
                        </div>
                        {canAssignFloorSite && (
                          <button
                            className="btn-assign success"
                            style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setSelectedFloor(floor); fetchSiteIncharges(); setShowFloorSiteModal(true); }}
                          >
                            Change
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                          <i className="fas fa-user-slash" style={{ marginRight: 6 }}></i>No site incharge assigned
                        </span>
                        {canAssignFloorSite && (
                          <button
                            className="btn-assign success"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setSelectedFloor(floor); fetchSiteIncharges(); setShowFloorSiteModal(true); }}
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visits Section */}
      <div className="visits-section">
        <h3 className="section-title">
          <i className="fas fa-calendar-alt"></i>
          Visits
        </h3>
        
        {/* Scheduled Visits */}
        {scheduledVisits.length > 0 && (
          <div className="visits-subsection">
            <h4 className="subsection-title">
              <i className="fas fa-clock text-warning"></i> Scheduled Visits ({scheduledVisits.length})
            </h4>
            <div className="visits-grid">
              {scheduledVisits.map((visit) => (
                <div key={visit.id} className="visit-card scheduled">
                  <div className="visit-header">
                    <span className="visit-type">{visit.visit_type || 'Site Visit'}</span>
                    <span className="visit-date">
                      {new Date(visit.scheduled_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="visit-details">
                    <p><strong>Purpose:</strong> {visit.purpose || 'Not specified'}</p>
                    <p><strong>Scheduled By:</strong> {visit.scheduled_by_name || 'Unknown'}</p>
                    <p><strong>Status:</strong> <span className="status-badge scheduled">Scheduled</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Visits */}
        {rejectedVisits.length > 0 && (
          <div className="visits-subsection">
            <h4 className="subsection-title">
              <i className="fas fa-times-circle text-danger"></i> Rejected Visits ({rejectedVisits.length})
            </h4>
            <div className="visits-grid">
              {rejectedVisits.map((visit) => (
                <div key={visit.id} className="visit-card rejected">
                  <div className="visit-header">
                    <span className="visit-type">{visit.visit_type || 'Site Visit'}</span>
                    <span className="visit-date">
                      {new Date(visit.scheduled_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="visit-details">
                    <p><strong>Purpose:</strong> {visit.purpose || 'Not specified'}</p>
                    <p><strong>Rejected By:</strong> {visit.rejected_by_name || 'Unknown'}</p>
                    <p><strong>Reason:</strong> {visit.rejection_reason || 'No reason provided'}</p>
                    <p><strong>Status:</strong> <span className="status-badge rejected">Rejected</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Visits */}
        {completedVisits.length > 0 && (
          <div className="visits-subsection">
            <h4 className="subsection-title">
              <i className="fas fa-check-circle text-success"></i> Completed Visits ({completedVisits.length})
            </h4>
            <div className="visits-grid">
              {completedVisits.map((visit) => (
                <div key={visit.id} className="visit-card completed">
                  <div className="visit-header">
                    <span className="visit-type">{visit.visit_type || 'Site Visit'}</span>
                    <span className="visit-date">
                      {new Date(visit.visit_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="visit-details">
                    <p><strong>Purpose:</strong> {visit.purpose || 'Not specified'}</p>
                    <p><strong>Visited By:</strong> {visit.visited_by_name || 'Unknown'}</p>
                    <p><strong>Observations:</strong> {visit.observations || 'No observations'}</p>
                    <p><strong>Status:</strong> <span className="status-badge completed">Completed</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {visits.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-calendar-times"></i>
            <p>No visits scheduled for this project</p>
          </div>
        )}
      </div>

      {/* Worklogs Section */}
      {canViewWorklogs && (
        <div className="worklogs-section">
          <div className="worklogs-header">
            <h3 className="section-title">
              <i className="fas fa-clipboard-list"></i>
              Work Logs
            </h3>
            {canAddWorklogs && (
              <button 
                className="btn-add-worklog"
                onClick={() => {
                  setFloorNumber('');
                  setWorklogDescription('');
                  setValidationErrors({});
                  setShowWorklogModal(true);
                }}
              >
                <i className="fas fa-plus"></i>
                Add Work Log
              </button>
            )}
          </div>

          {worklogs.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-clipboard-list"></i>
              <p>
                {canAddWorklogs 
                  ? 'No work logs yet. Add your first work log!' 
                  : 'No work logs available yet.'}
              </p>
            </div>
          ) : (
            <div className="worklogs-grid">
              {worklogs.map((worklog) => (
                <div key={worklog.id} className="worklog-card">
                  <div className="worklog-header">
                    <div className="worklog-header-left">
                      <span className="worklog-floor-badge">
                        Floor {worklog.floor_number}
                      </span>
                      <span className="worklog-date">
                        {new Date(worklog.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {worklog.images && worklog.images.length > 0 && (
                      <div className="image-count">
                        <i className="fas fa-images"></i>
                        <span>{worklog.images.length}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="worklog-description">{worklog.description}</p>
                  
                  {worklog.images && worklog.images.length > 0 && (
                    <div className="worklog-images">
                      {worklog.images.map((img, idx) => {
                        const mediaUrl = img.startsWith('http') ? img : `${BASE_URL}${img}`;
                        const isVideo = isVideoFile(img);
                        
                        return (
                          <div key={idx} className="worklog-image-container">
                            {isVideo ? (
                              <video
                                src={mediaUrl}
                                className="worklog-image"
                                controls
                                style={{ objectFit: 'cover', backgroundColor: '#000' }}
                              />
                            ) : (
                              <img 
                                src={mediaUrl}
                                alt={`Floor ${worklog.floor_number} - Image ${idx + 1}`}
                                className="worklog-image"
                                onClick={() => openImageViewer(mediaUrl)}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'https://via.placeholder.com/150?text=Image+Error';
                                }}
                              />
                            )}
                            {canAddWorklogs && (
                              <button
                                className="remove-worklog-image"
                                onClick={() => handleRemoveWorklogImage(worklog.id, img)}
                                title="Remove media"
                              >
                                <i className="fas fa-times-circle"></i>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="worklog-footer">
                    <span className="worklog-author">
                      <i className="fas fa-user"></i> {worklog.created_by_name || 'Unknown'}
                    </span>
                    <span className="worklog-time">
                      <i className="fas fa-clock"></i> {new Date(worklog.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {canAddWorklogs && (
                    <button 
                      className="btn-add-images"
                      onClick={() => {
                        setSelectedWorklog(worklog);
                        setSelectedImages([]);
                        setShowAddImagesModal(true);
                      }}
                    >
                      <i className="fas fa-image"></i>
                      {worklog.images && worklog.images.length > 0 ? 'Add More Photos' : 'Add Photos'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Feedback Section */}
      {project?.status === 'CLOSED' && (
        <div className="feedback-section">
          <div className="feedback-header">
            <i className="fas fa-star" style={{ color: '#f59e0b' }}></i>
            <h3>Customer Feedback</h3>
          </div>

          {loadingRating ? (
            <div className="loading-container" style={{ padding: '20px' }}>
              <div className="spinner"></div>
            </div>
          ) : projectRating ? (
            <div className="feedback-card">
              <div className="feedback-stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <i
                    key={star}
                    className={star <= projectRating.rating ? 'fas fa-star' : 'far fa-star'}
                    style={{ color: star <= projectRating.rating ? '#f59e0b' : '#d1d5db', fontSize: '24px', marginRight: '4px' }}
                  ></i>
                ))}
                <span className="feedback-label">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][projectRating.rating]}
                </span>
              </div>
              {projectRating.feedback && (
                <blockquote className="feedback-text">
                  "{projectRating.feedback}"
                </blockquote>
              )}
              <p className="feedback-meta">
                {projectRating.customer_name} &middot;{' '}
                {new Date(projectRating.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px' }}>
              <i className="far fa-star" style={{ fontSize: '40px', color: '#d1d5db', marginBottom: '10px', display: 'block' }}></i>
              <p>No feedback submitted yet</p>
            </div>
          )}
        </div>
      )}

      {/* Assign PM Modal */}
      {showPMModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowPMModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header primary">
              <h2>Select Project Manager</h2>
              <button className="modal-close" onClick={() => !submitting && setShowPMModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {loadingUsers ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading project managers...</p>
                </div>
              ) : projectManagers.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-users"></i>
                  <p>No project managers available</p>
                </div>
              ) : (
                <div className="user-list">
                  {projectManagers.map((pm) => (
                    <div key={pm.id} className="user-item">
                      <div className="user-avatar">
                        {pm.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{pm.name}</div>
                        <div className="user-email"><a href={`mailto:${pm.email}`}>{pm.email}</a></div>
                        <div className="user-projects">
                          <i className="fas fa-tasks"></i>
                          <span>{pm.active_projects || 0} active projects</span>
                        </div>
                      </div>
                      <button
                        className="btn-assign"
                        onClick={() => handleAssignPM(pm.id)}
                        disabled={submitting}
                      >
                        {submitting ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Site Modal */}
      {showSiteModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowSiteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header success">
              <h2>Select Site Incharge</h2>
              <button className="modal-close" onClick={() => !submitting && setShowSiteModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {loadingUsers ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading site incharges...</p>
                </div>
              ) : siteIncharges.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-hard-hat"></i>
                  <p>No site incharges available</p>
                </div>
              ) : (
                <div className="user-list">
                  {siteIncharges.map((site) => (
                    <div key={site.id} className="user-item">
                      <div className="user-avatar success">
                        {site.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{site.name}</div>
                        <div className="user-email"><a href={`mailto:${site.email}`}>{site.email}</a></div>
                        <div className="user-projects">
                          <i className="fas fa-tasks"></i>
                          <span>{site.active_projects || 0} active projects</span>
                        </div>
                      </div>
                      <button
                        className="btn-assign success"
                        onClick={() => handleAssignSite(site.id)}
                        disabled={submitting}
                      >
                        {submitting ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Finance Modal */}
      {showFinanceModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowFinanceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header warning">
              <h2>Select Finance Manager</h2>
              <button className="modal-close" onClick={() => !submitting && setShowFinanceModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {loadingUsers ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading finance managers...</p>
                </div>
              ) : financeUsers.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-chart-line"></i>
                  <p>No finance managers available</p>
                </div>
              ) : (
                <div className="user-list">
                  {financeUsers.map((finance) => (
                    <div key={finance.id} className="user-item">
                      <div className="user-avatar warning">
                        {finance.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{finance.name}</div>
                        <div className="user-email"><a href={`mailto:${finance.email}`}>{finance.email}</a></div>
                        <div className="user-projects">
                          <i className="fas fa-tasks"></i>
                          <span>{finance.active_projects || 0} active projects</span>
                        </div>
                      </div>
                      <button
                        className="btn-assign warning"
                        onClick={() => handleAssignFinance(finance.id)}
                        disabled={submitting}
                      >
                        {submitting ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {showVisitModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowVisitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header warning">
              <h2>Schedule Visit</h2>
              <button className="modal-close" onClick={() => !submitting && setShowVisitModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <i className="fas fa-hard-hat"></i>
                <span>Site Incharge: {siteInchargeName || 'Loading...'}</span>
              </div>

              <div className="form-group">
                <label>Visit Date *</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => {
                    setVisitDate(e.target.value);
                    if (validationErrors.visitDate) {
                      setValidationErrors({ ...validationErrors, visitDate: null });
                    }
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className={validationErrors.visitDate ? 'error' : ''}
                />
                {validationErrors.visitDate && (
                  <span className="error-text">{validationErrors.visitDate}</span>
                )}
              </div>

              <div className="form-group">
                <label>Visit Time *</label>
                <input
                  type="time"
                  value={visitTime}
                  onChange={(e) => {
                    setVisitTime(e.target.value);
                    if (validationErrors.visitTime) {
                      setValidationErrors({ ...validationErrors, visitTime: null });
                    }
                  }}
                  className={validationErrors.visitTime ? 'error' : ''}
                />
                {validationErrors.visitTime && (
                  <span className="error-text">{validationErrors.visitTime}</span>
                )}
              </div>

              <button
                className="btn-submit warning"
                onClick={handleScheduleVisit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <i className="fas fa-calendar-check"></i>
                    Schedule Visit
                  </>
                )}
              </button>

              <button
                className="btn-cancel"
                onClick={() => setShowVisitModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Worklog Modal */}
      {showWorklogModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowWorklogModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header primary">
              <h2>Add Work Log</h2>
              <button className="modal-close" onClick={() => !submitting && setShowWorklogModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Floor Number *</label>
                <input
                  type="number"
                  value={floorNumber}
                  onChange={(e) => {
                    setFloorNumber(e.target.value);
                    if (validationErrors.floorNumber) {
                      setValidationErrors({ ...validationErrors, floorNumber: null });
                    }
                  }}
                  placeholder="Enter floor number (e.g., 1, 2, 3)"
                  min="1"
                  step="1"
                  className={validationErrors.floorNumber ? 'error' : ''}
                />
                {validationErrors.floorNumber && (
                  <span className="error-text">{validationErrors.floorNumber}</span>
                )}
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={worklogDescription}
                  onChange={(e) => {
                    setWorklogDescription(e.target.value);
                    if (validationErrors.description) {
                      setValidationErrors({ ...validationErrors, description: null });
                    }
                  }}
                  placeholder="Describe the work completed on this floor"
                  rows="4"
                  className={validationErrors.description ? 'error' : ''}
                />
                {validationErrors.description && (
                  <span className="error-text">{validationErrors.description}</span>
                )}
              </div>

              <button
                className="btn-submit primary"
                onClick={handleCreateWorklog}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Create Work Log
                  </>
                )}
              </button>

              <button
                className="btn-cancel"
                onClick={() => setShowWorklogModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Images Modal */}
      {showAddImagesModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowAddImagesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header success">
              <h2>Add Images</h2>
              <button className="modal-close" onClick={() => !submitting && setShowAddImagesModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-helper">
                Add worklog images for Floor {selectedWorklog?.floor_number}
              </p>

              <div className="image-upload-section">
                <label className="image-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div className="image-upload-box">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <span>Click to select images</span>
                    <span className="upload-hint">You can select multiple images</span>
                  </div>
                </label>
              </div>

              {selectedImages.length > 0 && (
                <div className="selected-images-preview">
                  <h4>Selected Images ({selectedImages.length}):</h4>
                  <div className="image-preview-grid">
                    {selectedImages.map((img, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={img.preview} alt={`Preview ${index + 1}`} />
                        <button
                          className="remove-preview"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <i className="fas fa-times-circle"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn-submit success"
                onClick={handleSubmitImages}
                disabled={submitting || selectedImages.length === 0}
              >
                {submitting ? (
                  <>
                    <div className="spinner-small"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt"></i>
                    Upload {selectedImages.length} Image{selectedImages.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>

              <button
                className="btn-cancel"
                onClick={() => {
                  // Clean up object URLs
                  selectedImages.forEach(img => {
                    if (img.preview) URL.revokeObjectURL(img.preview);
                  });
                  setShowAddImagesModal(false);
                  setSelectedImages([]);
                }}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Add Floor Modal */}
      {showAddFloorModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowAddFloorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header primary">
              <h2>Add Floor</h2>
              <button className="modal-close" onClick={() => setShowAddFloorModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Floor Name *</label>
                <input
                  type="text"
                  value={newFloorName}
                  onChange={e => setNewFloorName(e.target.value)}
                  placeholder="e.g. Ground Floor, 1st Floor, Basement"
                  autoFocus
                />
              </div>
              <button className="btn-submit primary" onClick={handleAddFloor} disabled={submitting}>
                {submitting ? <><div className="spinner-small"></div> Adding...</> : <><i className="fas fa-plus"></i> Add Floor</>}
              </button>
              <button className="btn-cancel" onClick={() => setShowAddFloorModal(false)} disabled={submitting}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Floor Site Incharge Modal */}
      {showFloorSiteModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowFloorSiteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header success">
              <h2>Assign Site Incharge — {selectedFloor?.floor_name}</h2>
              <button className="modal-close" onClick={() => setShowFloorSiteModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              {loadingUsers ? (
                <div className="loading-container"><div className="spinner"></div><p>Loading...</p></div>
              ) : siteIncharges.length === 0 ? (
                <div className="empty-state"><i className="fas fa-hard-hat"></i><p>No site incharges available</p></div>
              ) : (
                <div className="user-list">
                  {siteIncharges.map(site => (
                    <div key={site.id} className="user-item">
                      <div className="user-avatar success">{site.name?.charAt(0).toUpperCase()}</div>
                      <div className="user-info">
                        <div className="user-name">{site.name}</div>
                        <div className="user-email"><a href={`mailto:${site.email}`}>{site.email}</a></div>
                      </div>
                      <button className="btn-assign success" onClick={() => handleAssignFloorSite(site.id)} disabled={submitting}>
                        {submitting ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate Quotation Modal */}
      {showQuotationModal && (
        <div className="modal-overlay" onClick={() => !submittingQuotation && setShowQuotationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2><i className="fas fa-file-invoice-dollar"></i> Generate Quotation</h2>
              <button className="modal-close" onClick={() => setShowQuotationModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-form">
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Project: <strong>{project?.name}</strong></p>

              {[
                { key: 'materialCost', label: 'Material Cost (₹)' },
                { key: 'labourCost', label: 'Labour Cost (₹)' },
                { key: 'transportCost', label: 'Transport Cost (₹)' },
                { key: 'otherCost', label: 'Other Cost (₹) — enter 0 if none' },
              ].map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label>{label} *</label>
                  <input
                    type="number"
                    min="0"
                    value={quotationForm[key]}
                    onChange={e => setQuotationForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="0.00"
                    className={quotationErrors[key] ? 'error' : ''}
                  />
                  {quotationErrors[key] && <span className="error-text">{quotationErrors[key]}</span>}
                </div>
              ))}

              <div className="form-group">
                <label>Total Cost (₹) — auto-calculated</label>
                <input
                  type="number"
                  value={quotationForm.totalCost}
                  readOnly
                  style={{ backgroundColor: '#F9FAFB', fontWeight: 700, color: '#2563EB' }}
                />
              </div>

              <div className="form-group">
                <label>Advance Amount (₹) — optional</label>
                <input
                  type="number"
                  min="0"
                  value={quotationForm.advanceAmount}
                  onChange={e => setQuotationForm(f => ({ ...f, advanceAmount: e.target.value }))}
                  placeholder="0.00"
                  className={quotationErrors.advanceAmount ? 'error' : ''}
                />
                {quotationErrors.advanceAmount && <span className="error-text">{quotationErrors.advanceAmount}</span>}
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowQuotationModal(false)} disabled={submittingQuotation}>Cancel</button>
                <button className="btn-primary" onClick={handleSubmitQuotation} disabled={submittingQuotation}>
                  {submittingQuotation ? <><i className="fas fa-spinner fa-spin"></i> Generating...</> : <><i className="fas fa-check"></i> Generate Quotation</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;