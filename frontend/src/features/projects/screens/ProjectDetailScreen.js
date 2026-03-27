import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  Platform,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Video, Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography } from '../../../theme/typography';
import { useAuth } from '../../../hooks/useAuth';
import { useAssignPM, useAssignSite, useAssignFinance } from '../hooks';
import { useScheduleVisit, useProjectVisits } from '../../visits/hooks';
import VisitsSection from '../../visits/components/VisitsSection';
import { useProjectReports } from '../../reports/hooks';
import { useProjectWorklogs, useCreateWorklog, useAddWorklogImages } from '../../worklogs/hooks';
import { worklogsApi } from '../../worklogs/api';
import { paymentsApi } from '../../payments/api';
import { quotationsApi } from '../../quotations/api';
import { sitePlansApi } from '../../site-plans/api';
import { usersApi } from '../../users/api';
import { projectsApi } from '../api';
import { getWorkStatus, getPaymentStatusFromPayments } from '../../../utils/statusHelpers';
import { getBaseUrl } from '../../../config/api.config';
import { SimpleDatePicker, SimpleTimePicker } from '../../../components/common/SimpleDateTimePicker';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { makeCall, sendEmail } from '../../../utils/contactUtils';
import NetInfo from '@react-native-community/netinfo';
import { enqueueWorklog, enqueueWorklogImages } from '../../../services/offlineQueue';
import { useTheme } from '../../../context/ThemeContext';

const isVideoFile = (path) => /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(path);

const FLOOR_STATUS_META = {
  pending:   { label: 'Pending',   color: '#6B7280', bg: '#F3F4F6' },
  started:   { label: 'Started',   color: '#2563EB', bg: '#EFF6FF' },
  paused:    { label: 'Paused',    color: '#D97706', bg: '#FFFBEB' },
  resumed:   { label: 'Resumed',   color: '#7C3AED', bg: '#EDE9FE' },
  completed: { label: 'Completed', color: '#16A34A', bg: '#F0FDF4' },
};

const FLOOR_STATUS_TRANSITIONS = {
  pending:   ['started'],
  started:   ['paused', 'completed'],
  paused:    ['resumed'],
  resumed:   ['paused', 'completed'],
  completed: [],
};

const { width } = Dimensions.get('window');

const ProjectDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { project: initialProject } = route.params;
  const [project, setProject] = useState(initialProject);
  const [showPMModal, setShowPMModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [projectManagers, setProjectManagers] = useState([]);
  const [siteIncharges, setSiteIncharges] = useState([]);
  const [financeUsers, setFinanceUsers] = useState([]);
  const [siteInchargeName, setSiteInchargeName] = useState('');
  const [loadingPMs, setLoadingPMs] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [sitePlansCount, setSitePlansCount] = useState(0);
  const [loadingSitePlans, setLoadingSitePlans] = useState(false);
  
  // Visit form state
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitValidationErrors, setVisitValidationErrors] = useState({});
  
  const { user } = useAuth();
  const { assignPM, loading: assigningPM } = useAssignPM();
  const { assignSite, loading: assigningSite } = useAssignSite();
  const { assignFinance, loading: assigningFinance } = useAssignFinance();
  const { scheduleVisit, loading: schedulingVisit } = useScheduleVisit();
  const { fetchVisits } = useProjectVisits(project.id);
  const { fetchReports } = useProjectReports(project.id);

  const canAssignPM = user?.role === 'admin' && project.status === 'CREATED';
  const canAssignSite = 
    user?.role === 'project_manager' && 
    project.pm_id === user.id && 
    !project.site_id;
  const canAssignFinance = user?.role === 'admin' && !project.finance_id;
  const canScheduleVisit = 
    user?.role === 'project_manager' && 
    project.pm_id === user.id && 
    project.site_id !== null && 
    project.status === 'PM_ASSIGNED';

  // State for checking completed visits
  const [hasCompletedVisit, setHasCompletedVisit] = useState(false);
  const [checkingVisits, setCheckingVisits] = useState(false);

  const canConfirmVisit = 
    user?.role === 'project_manager' && 
    project.pm_id === user.id && 
    project.status === 'PM_ASSIGNED' &&
    hasCompletedVisit;

  // State for checking existing reports
  const [hasExistingReport, setHasExistingReport] = useState(false);
  const [checkingReports, setCheckingReports] = useState(false);

  const canSubmitReport = 
    user?.role === 'site_incharge' && 
    project.site_id === user.id && 
    project.status === 'VISIT_DONE' &&
    !hasExistingReport;

  const canStartWork = 
    user?.role === 'project_manager' && 
    project.pm_id === user.id && 
    project.status === 'ADVANCE_PAID';

  const canMarkCompleted = 
    user?.role === 'project_manager' && 
    project.pm_id === user.id && 
    project.status === 'WORK_STARTED';

  const canCloseProject = 
    (user?.role === 'admin' || user?.role === 'super_admin') && 
    project.status === 'FINAL_PAID';

  const canPayFinal = 
    user?.role === 'customer' && 
    project.customer_id === user.id && 
    (project.status === 'WORK_STARTED' || project.status === 'COMPLETED');

  // Determine if user can view worklogs
  // Floor-assigned site incharges can also view worklogs
  const isFloorSiteIncharge = user?.role === 'site_incharge' &&
    Array.isArray(floors) &&
    floors.some(f => f.site_incharge_id === user.id);

  const canViewWorklogs = 
    (user?.role === 'super_admin') ||
    (user?.role === 'admin') ||
    (user?.role === 'project_manager' && project.pm_id === user.id) ||
    (user?.role === 'finance' && project.finance_id === user.id) ||
    (user?.role === 'site_incharge' && (project.site_id === user.id || isFloorSiteIncharge)) ||
    (user?.role === 'customer' && project.customer_id === user.id);

  // Site incharge can always add logs when assigned at floor level.
  // Project-level site incharge still follows WORK_STARTED status.
  const canAddWorklogs = 
    user?.role === 'site_incharge' && 
    (
      (project.site_id === user.id && project.status === 'WORK_STARTED') ||
      (isFloorSiteIncharge && project.site_id !== user.id)
    );

  const canManageFloors = ['admin', 'super_admin'].includes(user?.role);
  const canAssignFloorSite = user?.role === 'project_manager' && project?.pm_id === user?.id;

  // Worklog state
  const [showWorklogModal, setShowWorklogModal] = useState(false);
  const [showAddImagesModal, setShowAddImagesModal] = useState(false);
  const [selectedWorklog, setSelectedWorklog] = useState(null);
  const [floorNumber, setFloorNumber] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState(null);
  const [showVideoMetaModal, setShowVideoMetaModal] = useState(false);
  const [videoMetaPreview, setVideoMetaPreview] = useState(null);
  const [worklogValidationErrors, setWorklogValidationErrors] = useState({});
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState(null);

  // Floors state
  const [floors, setFloors] = useState([]);
  const floorList = Array.isArray(floors) ? floors : [];
  const getFloorNumberFromFloor = (floor) => {
    if (Number.isInteger(floor?.floor_number) && floor.floor_number > 0) {
      return floor.floor_number;
    }

    const parsedFromName = parseInt(String(floor?.floor_name || '').match(/\d+/)?.[0], 10);
    if (!isNaN(parsedFromName) && parsedFromName > 0) {
      return parsedFromName;
    }

    const floorIndex = floorList.findIndex(item => item.id === floor?.id);
    return floorIndex >= 0 ? floorIndex + 1 : null;
  };
  const assignedFloors = useMemo(
    () => floorList.filter(f => f.site_incharge_id === user?.id),
    [floorList, user?.id]
  );
  const isFloorRestrictedSiteIncharge =
    user?.role === 'site_incharge' &&
    project.site_id !== user?.id &&
    assignedFloors.length > 0;
  const assignedFloorNumbers = useMemo(
    () =>
      assignedFloors
        .map(getFloorNumberFromFloor)
        .filter(num => Number.isInteger(num) && num > 0),
    [assignedFloors]
  );
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);

  // Rating state
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [existingRating, setExistingRating] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [loadingRating, setLoadingRating] = useState(false);

  const canSubmitRating =
    user?.role === 'customer' &&
    project.customer_id === user.id &&
    project.status === 'CLOSED';

  const canViewRating = project.status === 'CLOSED' && (
    user?.role === 'admin' || user?.role === 'super_admin' ||
    (user?.role === 'customer' && project.customer_id === user.id) ||
    (user?.role === 'project_manager' && project.pm_id === user.id) ||
    (user?.role === 'site_incharge' && project.site_id === user.id) ||
    (user?.role === 'finance' && project.finance_id === user.id)
  );
  const [newFloorName, setNewFloorName] = useState('');
  const [showFloorSiteModal, setShowFloorSiteModal] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [assigningFloorSite, setAssigningFloorSite] = useState(false);
  const [showFloorDetailModal, setShowFloorDetailModal] = useState(false);
  const [floorLogs, setFloorLogs] = useState([]);
  const [loadingFloorLogs, setLoadingFloorLogs] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [updatingFloorStatus, setUpdatingFloorStatus] = useState(false);

  const { worklogs, loading: loadingWorklogs, refetch: refetchWorklogs } = useProjectWorklogs(
    canViewWorklogs && project?.id ? project.id : null
  );
  
  // Debug logging for worklogs
  useEffect(() => {
    console.log('=== WORKLOG DEBUG ===');
    console.log('User role:', user?.role);
    console.log('User ID:', user?.id);
    console.log('Project site_id:', project?.site_id);
    console.log('Project status:', project?.status);
    console.log('canViewWorklogs:', canViewWorklogs);
    console.log('canAddWorklogs:', canAddWorklogs);
    console.log('Worklogs data:', worklogs);
    console.log('Loading worklogs:', loadingWorklogs);
  }, [user, project, canViewWorklogs, canAddWorklogs, worklogs, loadingWorklogs]);
  const { createWorklog, loading: creatingWorklog } = useCreateWorklog();
  const { addImages, loading: addingImages } = useAddWorklogImages();

  // Payment summary state
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [loadingPaymentSummary, setLoadingPaymentSummary] = useState(false);
  const [hasFinalPaymentCompleted, setHasFinalPaymentCompleted] = useState(false);

  const shouldShowPaymentSummary = 
    user?.role === 'customer' && 
    project.customer_id === user.id &&
    (project.status === 'WORK_STARTED' || 
     project.status === 'COMPLETED' ||
     project.status === 'FINAL_PAID' ||
     project.status === 'CLOSED');

  const shouldFetchPaymentData = 
    ((user?.role === 'customer' && project.customer_id === user.id) ||
     (user?.role === 'project_manager' && project.pm_id === user.id) ||
     (user?.role === 'admin') ||
     (user?.role === 'super_admin')) &&
    (project.status === 'CUSTOMER_APPROVED' ||
     project.status === 'WORK_STARTED' || 
     project.status === 'COMPLETED' ||
     project.status === 'FINAL_PAID' ||
     project.status === 'CLOSED');

  // Fetch site incharge name
  useEffect(() => {
    if (project.site_id && user?.role !== 'customer') {
      fetchSiteInchargeName();
    }
  }, [project.site_id, user?.role]);

  // Check for completed visits
  useEffect(() => {
    if (user?.role === 'project_manager' && project.pm_id === user.id && project.status === 'PM_ASSIGNED') {
      checkForCompletedVisits();
    }
  }, [project.id, project.status, user?.role]);

  // Check for existing reports
  useEffect(() => {
    if (user?.role === 'site_incharge' && project.site_id === user.id && project.status === 'VISIT_DONE') {
      checkForExistingReports();
    }
  }, [project.id, project.status, user?.role]);

  // Fetch payment summary
  useEffect(() => {
    if (shouldFetchPaymentData) {
      fetchPaymentSummary();
    }
  }, [project.id, project.status, shouldFetchPaymentData]);

  // Fetch site plans count
  useEffect(() => {
    fetchSitePlansCount();
  }, [project.id]);

  // Fetch rating for closed projects
  useEffect(() => {
    if (project.status === 'CLOSED') fetchProjectRating();
  }, [project.id, project.status]);

  // Refresh data on focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          const response = await projectsApi.getProjectById(project.id);
          if (response.success) {
            setProject(response.data.project);
          }
        } catch (err) {
          console.error('Error refreshing project:', err);
        }

        if (shouldFetchPaymentData) {
          await fetchPaymentSummary();
        }

        // Refresh site plans count
        await fetchSitePlansCount();
        await fetchFloors();
        if (project.status === 'CLOSED') await fetchProjectRating();
      };

      refreshData();
    }, [project.id, shouldFetchPaymentData])
  );

  const fetchProjectDetails = async () => {
    try {
      const response = await projectsApi.getProjectById(project.id);
      if (response.success) {
        setProject(response.data.project);
      }
      
      if (shouldFetchPaymentData) {
        await fetchPaymentSummary();
      }
      await fetchFloors();
      if (project.status === 'CLOSED') await fetchProjectRating();
    } catch (err) {
      console.error('Error refreshing project:', err);
    }
  };

  const fetchFloors = async () => {
    try {
      const res = await projectsApi.getFloors(project.id);
      setFloors(Array.isArray(res?.data?.floors) ? res.data.floors : []);
    } catch (e) {
      console.error('Error fetching floors:', e);
    }
  };

  const fetchProjectRating = async () => {
    try {
      setLoadingRating(true);
      const res = await projectsApi.getProjectRating(project.id);
      if (res?.data?.rating) {
        setExistingRating(res.data.rating);
        setRatingValue(res.data.rating.rating);
        setRatingFeedback(res.data.rating.feedback || '');
      } else {
        setExistingRating(null);
      }
    } catch (e) {
      // no rating yet, that's fine
    } finally {
      setLoadingRating(false);
    }
  };

  const handleSubmitRating = async () => {
    if (ratingValue === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    const wordCount = ratingFeedback.trim().split(/\s+/).filter(Boolean).length;
    if (ratingFeedback.trim() && wordCount > 300) {
      Alert.alert('Feedback Too Long', 'Feedback must not exceed 300 words.');
      return;
    }
    try {
      setSubmittingRating(true);
      const res = await projectsApi.submitRating(project.id, ratingValue, ratingFeedback.trim() || undefined);
      setExistingRating(res.data.rating);
      Alert.alert('Thank You!', 'Your feedback has been submitted successfully.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleAddFloor = async () => {
    if (!newFloorName.trim()) { Alert.alert('Error', 'Floor name is required'); return; }
    try {
      setAssigningFloorSite(true);
      await projectsApi.addFloor(project.id, newFloorName.trim());
      setNewFloorName('');
      setShowAddFloorModal(false);
      await fetchFloors();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add floor');
    } finally {
      setAssigningFloorSite(false);
    }
  };

  const handleDeleteFloor = (floorId) => {
    Alert.alert('Delete Floor', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await projectsApi.deleteFloor(project.id, floorId);
          await fetchFloors();
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message || 'Failed to delete floor');
        }
      }},
    ]);
  };

  const handleAssignFloorSite = async (siteInchargeId) => {
    if (!selectedFloor) return;
    try {
      setAssigningFloorSite(true);
      await projectsApi.assignFloorSite(project.id, selectedFloor.id, siteInchargeId);
      setShowFloorSiteModal(false);
      setSelectedFloor(null);
      await fetchFloors();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to assign site incharge');
    } finally {
      setAssigningFloorSite(false);
    }
  };

  const openFloorDetail = async (floor) => {
    setSelectedFloor(floor);
    setShowFloorDetailModal(true);
    setFloorLogs([]);
    setLoadingFloorLogs(true);
    try {
      const res = await projectsApi.getFloorLogs(project.id, floor.id);
      setFloorLogs(res.data?.logs || []);
    } catch (e) {
      console.error('Error fetching floor logs:', e);
    } finally {
      setLoadingFloorLogs(false);
    }
  };

  const handleUpdateFloorStatus = async (newStatus) => {
    if (!selectedFloor) return;
    try {
      setUpdatingFloorStatus(true);
      await projectsApi.updateFloorStatus(project.id, selectedFloor.id, newStatus, statusNote.trim() || null);
      setShowStatusModal(false);
      setStatusNote('');
      await fetchFloors();
      // Refresh selected floor data and logs
      const res = await projectsApi.getFloorLogs(project.id, selectedFloor.id);
      setFloorLogs(res.data?.logs || []);
      const updatedFloors = await projectsApi.getFloors(project.id);
      const updated = (updatedFloors.data?.floors || []).find(f => f.id === selectedFloor.id);
      if (updated) setSelectedFloor(updated);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingFloorStatus(false);
    }
  };

  const fetchPaymentSummary = async () => {
    try {
      setLoadingPaymentSummary(true);
      
      const quotationResponse = await quotationsApi.getQuotationByProject(project.id);
      const quotation = quotationResponse?.data?.quotation;
      
      if (!quotation) {
        setPaymentSummary(null);
        return;
      }
      
      const paymentsResponse = await paymentsApi.getPaymentsByProject(project.id);
      const payments = paymentsResponse?.data?.payments || [];
      
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
    } catch (err) {
      console.error('Error fetching payment summary:', err);
      setPaymentSummary(null);
      setHasFinalPaymentCompleted(false);
    } finally {
      setLoadingPaymentSummary(false);
    }
  };

  const checkForCompletedVisits = async () => {
    try {
      setCheckingVisits(true);
      const visits = await fetchVisits();
      const hasCompleted = visits?.some(visit => visit.status === 'completed') || false;
      setHasCompletedVisit(hasCompleted);
    } catch (err) {
      console.error('Error checking visits:', err);
    } finally {
      setCheckingVisits(false);
    }
  };

  const checkForExistingReports = async () => {
    try {
      setCheckingReports(true);
      const reports = await fetchReports();
      setHasExistingReport(reports?.length > 0 || false);
    } catch (err) {
      console.error('Error checking reports:', err);
    } finally {
      setCheckingReports(false);
    }
  };

  const fetchSiteInchargeName = async () => {
    try {
      const response = await usersApi.getAllUsers();
      if (response?.success) {
        const siteUser = response.data?.users?.find(u => u.id === project.site_id);
        if (siteUser) {
          setSiteInchargeName(siteUser.name || '');
        }
      }
    } catch (err) {
      // Silently fail
    }
  };

  const fetchSitePlansCount = async () => {
    try {
      setLoadingSitePlans(true);
      const response = await sitePlansApi.getSitePlansByProject(project.id);
      if (response?.success) {
        setSitePlansCount(response.data?.sitePlans?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching site plans:', err);
      setSitePlansCount(0);
    } finally {
      setLoadingSitePlans(false);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      setLoadingPMs(true);
      const response = await usersApi.getAllUsers();
      
      if (response?.success) {
        const pmUsers = response.data?.users?.filter(
          (u) => u.role === 'project_manager' && u.is_active
        ) || [];
        setProjectManagers(pmUsers);
      }
    } catch (err) {
      console.error('Error fetching project managers:', err);
      Alert.alert('Error', 'Failed to load project managers');
    } finally {
      setLoadingPMs(false);
    }
  };

  const fetchSiteIncharges = async () => {
    try {
      setLoadingSites(true);
      const response = await usersApi.getAllUsers();
      
      if (response?.success) {
        const siteUsers = response.data?.users?.filter(
          (u) => u.role === 'site_incharge' && u.is_active
        ) || [];
        setSiteIncharges(siteUsers);
      }
    } catch (err) {
      console.error('Error fetching site incharges:', err);
      Alert.alert('Error', 'Failed to load site incharges');
    } finally {
      setLoadingSites(false);
    }
  };

  const handleAssignPMPress = async () => {
    setShowPMModal(true);
    await fetchProjectManagers();
  };

  const handleAssignSitePress = async () => {
    setShowSiteModal(true);
    await fetchSiteIncharges();
  };

  const handleSelectPM = async (pmId) => {
    try {
      const updatedProject = await assignPM(project.id, pmId);
      setProject(updatedProject);
      setShowPMModal(false);
      Alert.alert('Success', 'Project Manager assigned successfully');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to assign Project Manager');
    }
  };

  const handleSelectSite = async (siteId) => {
    try {
      const updatedProject = await assignSite(project.id, siteId);
      setProject(updatedProject);
      setShowSiteModal(false);
      Alert.alert('Success', 'Site Incharge assigned successfully');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to assign Site Incharge');
    }
  };

  const fetchFinanceUsers = async () => {
    try {
      setLoadingFinance(true);
      const response = await usersApi.getAllUsers();
      
      if (response?.success) {
        const financeList = response.data?.users?.filter(
          (u) => u.role === 'finance' && u.is_active
        ) || [];
        setFinanceUsers(financeList);
      }
    } catch (err) {
      console.error('Error fetching finance users:', err);
      Alert.alert('Error', 'Failed to load finance users');
    } finally {
      setLoadingFinance(false);
    }
  };

  const handleAssignFinancePress = async () => {
    setShowFinanceModal(true);
    await fetchFinanceUsers();
  };

  const handleSelectFinance = async (financeId) => {
    try {
      const updatedProject = await assignFinance(project.id, financeId);
      setProject(updatedProject);
      setShowFinanceModal(false);
      Alert.alert('Success', 'Finance assigned successfully');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to assign Finance');
    }
  };

  const handleScheduleVisitPress = () => {
    setVisitDate('');
    setVisitTime('');
    setVisitValidationErrors({});
    setShowVisitModal(true);
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

    setVisitValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkVisitConflict = async () => {
    try {
      const visits = await fetchVisits();
      
      const conflictingVisit = visits?.find(visit => {
        return visit.site_id === project.site_id && 
               visit.visit_date === visitDate &&
               visit.status !== 'rejected';
      });

      return conflictingVisit;
    } catch (err) {
      console.error('Error checking visit conflict:', err);
      return null;
    }
  };

  const handleScheduleVisit = async (skipConflictCheck = false) => {
    if (!validateVisitForm()) {
      return;
    }

    if (!skipConflictCheck) {
      const conflict = await checkVisitConflict();
      if (conflict) {
        Alert.alert(
          'Schedule Conflict',
          `The selected Site Incharge already has a visit scheduled on ${visitDate}.\n\nAre you sure you want to schedule another visit on the same day?`,
          [
            {
              text: 'Change Date',
              style: 'cancel',
            },
            {
              text: 'Proceed Anyway',
              onPress: () => handleScheduleVisit(true),
            },
          ]
        );
        return;
      }
    }

    try {
      let formattedDate = visitDate;
      let formattedTime = visitTime;
      
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
        Alert.alert('Error', 'Invalid date format. Please select date again.');
        return;
      }
      
      if (!/^\d{2}:\d{2}:\d{2}$/.test(formattedTime)) {
        Alert.alert('Error', 'Invalid time format. Please select time again.');
        return;
      }

      const visitData = {
        projectId: project.id,
        siteId: project.site_id,
        visitDate: formattedDate,
        visitTime: formattedTime,
      };

      await scheduleVisit(visitData);
      
      Alert.alert('Success', 'Visit scheduled successfully');
      setShowVisitModal(false);
      setVisitDate('');
      setVisitTime('');
    } catch (err) {
      const errorMsg = err.message || '';
      if (errorMsg.includes('already has a visit') || errorMsg.includes('scheduled at this date')) {
        Alert.alert(
          'Schedule Conflict',
          'The selected Site Incharge already has a visit scheduled at this date and time.\n\nPlease choose a different date or time.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to schedule visit');
      }
    }
  };

  const handleConfirmVisit = () => {
    Alert.alert(
      'Confirm Visit',
      'Are you sure the visit has been successfully completed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await projectsApi.updateProjectStatus(project.id, 'VISIT_DONE');
              const updatedProject = response.data.project;
              setProject(updatedProject);
              setHasCompletedVisit(false);
              
              const refreshResponse = await projectsApi.getProjectById(project.id);
              if (refreshResponse.success) {
                setProject(refreshResponse.data.project);
              }
              
              Alert.alert('Success', 'Visit confirmed. Project moved to VISIT_DONE.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to confirm visit');
            }
          },
        },
      ]
    );
  };

  const handleSubmitReportPress = () => {
    navigation.navigate('SubmitReport', { project });
  };

  const handleStartWork = () => {
    Alert.alert(
      'Start Work',
      'Are you sure you want to start work on this project?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const response = await projectsApi.updateProjectStatus(project.id, 'WORK_STARTED');
              const updatedProject = response.data.project;
              setProject(updatedProject);
              
              const refreshResponse = await projectsApi.getProjectById(project.id);
              if (refreshResponse.success) {
                setProject(refreshResponse.data.project);
              }
              
              Alert.alert('Success', 'Work started successfully');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to start work');
            }
          },
        },
      ]
    );
  };

  const handleMarkCompleted = () => {
    Alert.alert(
      'Mark Work as Completed',
      'Are you sure the work has been completed? This will notify the customer that the project is ready for final inspection.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark Completed',
          onPress: async () => {
            try {
              const response = await projectsApi.updateProjectStatus(project.id, 'COMPLETED');
              const updatedProject = response.data.project;
              setProject(updatedProject);
              
              const refreshResponse = await projectsApi.getProjectById(project.id);
              if (refreshResponse.success) {
                setProject(refreshResponse.data.project);
              }
              
              Alert.alert('Success', 'Work marked as completed successfully. Customer has been notified.');
            } catch (err) {
              console.error('Error marking completed:', err);
              Alert.alert('Error', err.message || 'Failed to mark work as completed');
            }
          },
        },
      ]
    );
  };

  const handleCloseProject = () => {
    Alert.alert(
      'Close Project',
      'Are you sure you want to close this project? This action marks the project as finished.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close Project',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await projectsApi.updateProjectStatus(project.id, 'CLOSED');
              const updatedProject = response.data.project;
              setProject(updatedProject);
              
              const refreshResponse = await projectsApi.getProjectById(project.id);
              if (refreshResponse.success) {
                setProject(refreshResponse.data.project);
              }
              
              Alert.alert('Success', 'Project closed successfully');
            } catch (err) {
              console.error('Error closing project:', err);
              Alert.alert('Error', err.message || 'Failed to close project');
            }
          },
        },
      ]
    );
  };

  const handlePayFinal = () => {
    navigation.navigate('CreateFinalPayment', { project });
  };

  // Worklog handlers
  const handleAddWorklogPress = () => {
    if (isFloorRestrictedSiteIncharge && assignedFloorNumbers.length === 1) {
      setFloorNumber(String(assignedFloorNumbers[0]));
    } else {
      setFloorNumber('');
    }
    setDescription('');
    setWorklogValidationErrors({});
    setShowWorklogModal(true);
  };

  const validateWorklogForm = () => {
    const errors = {};

    if (!floorNumber) {
      errors.floorNumber = 'Floor number is required';
    } else {
      const floorNum = parseInt(floorNumber);
      if (isNaN(floorNum) || floorNum <= 0 || !Number.isInteger(floorNum)) {
        errors.floorNumber = 'Floor number must be a positive integer';
      } else if (
        isFloorRestrictedSiteIncharge &&
        !assignedFloorNumbers.includes(floorNum)
      ) {
        errors.floorNumber = 'You can add logs only for your assigned floor(s)';
      }
    }

    if (!description || description.trim() === '') {
      errors.description = 'Description is required';
    }

    setWorklogValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateWorklog = async () => {
    if (!validateWorklogForm()) {
      return;
    }

    const worklogData = {
      projectId: project.id,
      floorNumber: parseInt(floorNumber),
      description: description.trim(),
    };

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      try {
        await enqueueWorklog(worklogData);
        Alert.alert(
          'Saved Offline',
          'No internet connection. Your work log has been saved and will be uploaded automatically when you are back online.'
        );
        setShowWorklogModal(false);
      } catch (err) {
        Alert.alert('Error', 'Failed to save work log offline: ' + err.message);
      }
      return;
    }

    try {
      await createWorklog(worklogData);
      Alert.alert('Success', 'Work log created successfully');
      setShowWorklogModal(false);
      await refetchWorklogs();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create work log');
    }
  };

  const handleAddImagesPress = (worklog) => {
    setSelectedWorklog(worklog);
    setSelectedImages([]);
    setShowAddImagesModal(true);
  };

  const pickImages = async () => {
    try {
      const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

      if (mediaStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera and gallery permissions to upload media');
        return;
      }

      Alert.alert(
        'Add Worklog Media',
        'Choose source\n\n📸 Camera Photo = with GPS Watermark\n🎥 Camera Video = record site video\n🎙️ Voice Note = record audio',
        [
          {
            text: '📸 Take Photo (with Watermark)',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.9,
                allowsMultipleSelection: false,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const photo = result.assets[0];

                // Get exact location + timestamp
                let locText = 'Location: Not available';
                try {
                  const locationStatus = await Location.requestForegroundPermissionsAsync();
                  if (locationStatus.status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.High,
                    });
                    
                    const { latitude, longitude } = location.coords;
                    locText = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                  }
                } catch (locError) {
                  console.log('Location error:', locError);
                }

                const timestamp = new Date().toLocaleString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                });

                setWatermarkPreview({
                  uri: photo.uri,
                  origWidth: photo.width,
                  origHeight: photo.height,
                  locText,
                  timestamp,
                });
                setShowWatermarkModal(true);
              }
            },
          },
          {
            text: '🎥 Record Video',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                quality: 1,
                videoMaxDuration: 120,
                allowsEditing: false,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const video = result.assets[0];
                // Get location + timestamp for metadata
                let locText = 'Location: Not available';
                try {
                  const locationStatus = await Location.requestForegroundPermissionsAsync();
                  if (locationStatus.status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    try {
                      const address = await Location.reverseGeocodeAsync({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                      });
                      if (address && address.length > 0) {
                        const addr = address[0];
                        const parts = [addr.street, addr.city, addr.region, addr.country].filter(Boolean);
                        locText = parts.length > 0 ? parts.join(', ') : `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                      } else {
                        locText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                      }
                    } catch {
                      locText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                    }
                  }
                } catch (locErr) {
                  console.log('Location error:', locErr);
                }
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB');
                const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setVideoMetaPreview({ uri: video.uri, timestamp: `${dateStr}   ${timeStr}`, locText });
                setShowVideoMetaModal(true);
              }
            },
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 0.8,
                allowsEditing: false,
              });

              if (!result.canceled && result.assets) {
                const newMedia = result.assets.map(asset => ({ uri: asset.uri, type: asset.type || 'image' }));
                setSelectedImages(prev => [...prev, ...newMedia]);
                Alert.alert('Media Added', `✅ ${result.assets.length} file(s) added.`, [{ text: 'OK' }]);
              }
            },
          },
          {
            text: '🎙️ Record Voice Note',
            onPress: () => setShowVoiceModal(true),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (err) {
      console.error('Media picker error:', err);
      Alert.alert('Error', 'Failed to open media picker');
    }
  };

  const handleWatermarkCapture = async () => {
    if (!watermarkPreview) return;
    
    try {
      // Save watermarked photo to app's document directory
      let savedLocally = false;
      try {
        const fileName = `worklog_watermarked_${Date.now()}.jpg`;
        const newPath = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: watermarkPreview.uri,
          to: newPath,
        });
        
        setSelectedImages((prev) => [...prev, { uri: newPath }]);
        savedLocally = true;
      } catch (error) {
        console.error('Error saving watermarked image:', error);
        // Fallback to original URI
        setSelectedImages((prev) => [...prev, { uri: watermarkPreview.uri }]);
      }
      
      setShowWatermarkModal(false);
      setWatermarkPreview(null);
      
      Alert.alert(
        'Success',
        savedLocally 
          ? '✅ Photo saved with watermark and added to worklog.\n\nWatermarked image saved in app storage.'
          : '✅ Photo added to worklog with watermark.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Watermark capture error:', err);
      Alert.alert('Error', 'Failed to add watermark. Using original photo.');
      
      // Fallback to original
      setSelectedImages((prev) => [...prev, { uri: watermarkPreview.uri }]);
      setShowWatermarkModal(false);
      setWatermarkPreview(null);
    }
  };

  const handleWatermarkSkip = () => {
    if (!watermarkPreview) return;
    
    // Save original photo to app's document directory
    let savedLocally = false;
    try {
      const fileName = `worklog_original_${Date.now()}.jpg`;
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      
      FileSystem.copyAsync({
        from: watermarkPreview.uri,
        to: newPath,
      }).then(() => {
        setSelectedImages((prev) => [...prev, { uri: newPath }]);
      }).catch(() => {
        // Fallback to original URI
        setSelectedImages((prev) => [...prev, { uri: watermarkPreview.uri }]);
      });
      
      savedLocally = true;
    } catch (error) {
      console.error('Error saving original image:', error);
      setSelectedImages((prev) => [...prev, { uri: watermarkPreview.uri }]);
    }
    
    setShowWatermarkModal(false);
    setWatermarkPreview(null);
    
    Alert.alert(
      'Photo Added',
      savedLocally
        ? '✅ Photo saved and added to worklog (without watermark).\n\nImage saved in app storage.'
        : '✅ Photo added to worklog (without watermark).',
      [{ text: 'OK' }]
    );
  };

  const handleRemoveImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record voice notes');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      const timer = setInterval(() => setRecordingDuration(d => d + 1), 1000);
      setRecordingTimer(timer);
    } catch (e) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimer) { clearInterval(recordingTimer); setRecordingTimer(null); }
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      setShowVoiceModal(false);
      setRecordingDuration(0);
      if (uri) {
        setSelectedImages(prev => [...prev, { uri, type: 'audio', name: `voice_${Date.now()}.m4a` }]);
        Alert.alert('Voice Note Added', '🎙️ Voice note added to worklog.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingTimer) { clearInterval(recordingTimer); setRecordingTimer(null); }
      setIsRecording(false);
      if (recording) { await recording.stopAndUnloadAsync(); setRecording(null); }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      setShowVoiceModal(false);
      setRecordingDuration(0);
    } catch (e) {
      setShowVoiceModal(false);
    }
  };

  const handleSubmitImages = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('Error', 'Please add at least one image');
      return;
    }

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      try {
        await enqueueWorklogImages(selectedWorklog.id, selectedImages);
        Alert.alert(
          'Saved Offline',
          'No internet connection. Your images have been saved and will be uploaded automatically when you are back online.'
        );
        setShowAddImagesModal(false);
      } catch (err) {
        Alert.alert('Error', 'Failed to save images offline: ' + err.message);
      }
      return;
    }

    try {
      console.log('Submitting images for worklog:', selectedWorklog.id);
      await addImages(selectedWorklog.id, selectedImages);
      Alert.alert('Success', 'Images added successfully');
      setShowAddImagesModal(false);
      await refetchWorklogs();
    } catch (err) {
      console.error('Error submitting worklog images:', err);
      Alert.alert('Error', err.message || 'Failed to add images');
    }
  };

  const handleRemoveWorklogImage = async (worklogId, imageIndex, imagePath) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image from the worklog?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to remove the image
              await worklogsApi.removeWorklogImage(worklogId, imagePath);
              
              Alert.alert('Success', 'Image removed successfully');
              await refetchWorklogs();
            } catch (err) {
              console.error('Error removing worklog image:', err);
              Alert.alert('Error', err.message || 'Failed to remove image');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'CREATED': colors.warning,
      'PM_ASSIGNED': colors.info,
      'SITE_ASSIGNED': colors.info,
      'VISIT_DONE': colors.success,
      'CUSTOMER_APPROVED': colors.success,
      'WORK_STARTED': colors.primary,
      'COMPLETED': colors.success,
      'FINAL_PAID': colors.success,
      'CLOSED': colors.textSecondary,
    };
    return statusColors[status] || colors.textSecondary;
  };

  const DetailCard = ({ icon, label, value, color }) => (
    <View style={styles.detailCard}>
      <View style={[styles.detailIconContainer, { backgroundColor: color + '20' }]}>
        <FontAwesome5 name={icon} size={16} color={color} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, { color }]} numberOfLines={1}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  const InfoRow = ({ label, value }) => {
    const isEmail = label.toLowerCase().includes('email');
    const isPhone = label.toLowerCase().includes('phone');
    const hasAction = (isEmail || isPhone) && value && value !== 'Not assigned';
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        {hasAction ? (
          <TouchableOpacity onPress={() => isEmail ? sendEmail(value) : makeCall(value)}>
            <Text style={[styles.infoValue, styles.linkText]}>{value}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.infoValue}>{value || 'Not assigned'}</Text>
        )}
      </View>
    );
  };

  const ActionButton = ({ onPress, title, icon, colors: buttonColors = [colors.primary, colors.primaryDark], gradient = false }) => {
    // Ensure buttonColors is always an array with at least 2 colors for gradient
    let safeColors = Array.isArray(buttonColors) ? buttonColors : [buttonColors || colors.primary];
    
    // If gradient is true and we only have 1 color, duplicate it
    if (gradient && safeColors.length < 2) {
      safeColors = [safeColors[0], safeColors[0]];
    }
    
    if (gradient) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <LinearGradient
            colors={safeColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <FontAwesome5 name={icon} size={16} color={colors.surface} solid />
            <Text style={styles.actionButtonText}>{title}</Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: safeColors[0] }]} 
        onPress={onPress}
        activeOpacity={0.8}
      >
        <FontAwesome5 name={icon} size={16} color={colors.surface} solid />
        <Text style={styles.actionButtonText}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderPMItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleSelectPM(item.id)}
        disabled={assigningPM}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || 'Unknown'}</Text>
          <TouchableOpacity onPress={() => item.email && sendEmail(item.email)}>
            <Text style={[styles.userEmail, item.email && styles.linkText]}>{item.email || 'No email'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => item.phone && makeCall(item.phone)}>
            <Text style={[styles.userPhone, item.phone && styles.linkText]}>{item.phone || 'No phone'}</Text>
          </TouchableOpacity>
          <View style={styles.userProjects}>
            <MaterialIcons name="assignment" size={14} color={colors.primary} />
            <Text style={styles.userProjectsText}>
              {(item.active_projects || 0)} active project{(item.active_projects || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderSiteItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleSelectSite(item.id)}
        disabled={assigningSite}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || 'Unknown'}</Text>
          <TouchableOpacity onPress={() => item.email && sendEmail(item.email)}>
            <Text style={[styles.userEmail, item.email && styles.linkText]}>{item.email || 'No email'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => item.phone && makeCall(item.phone)}>
            <Text style={[styles.userPhone, item.phone && styles.linkText]}>{item.phone || 'No phone'}</Text>
          </TouchableOpacity>
          <View style={styles.userProjects}>
            <MaterialIcons name="assignment" size={14} color={colors.primary} />
            <Text style={styles.userProjectsText}>
              {(item.active_projects || 0)} active project{(item.active_projects || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderFinanceItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleSelectFinance(item.id)}
        disabled={assigningFinance}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || 'Unknown'}</Text>
          <TouchableOpacity onPress={() => item.email && sendEmail(item.email)}>
            <Text style={[styles.userEmail, item.email && styles.linkText]}>{item.email || 'No email'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => item.phone && makeCall(item.phone)}>
            <Text style={[styles.userPhone, item.phone && styles.linkText]}>{item.phone || 'No phone'}</Text>
          </TouchableOpacity>
          <View style={styles.userProjects}>
            <MaterialIcons name="assignment" size={14} color={colors.primary} />
            <Text style={styles.userProjectsText}>
              {(item.active_projects || 0)} active project{(item.active_projects || 0) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <AppHeader navigation={navigation} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Gradient */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.projectName}>{project?.name || 'Project'}</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(project?.status) }]} />
              <Text style={styles.statusText}>{getWorkStatus(project?.status) || 'Unknown'}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Key Details Cards */}
        <View style={styles.detailsGrid}>
          <DetailCard 
            icon="map-marker-alt" 
            label="Location" 
            value={project?.location}
            color={colors.info}
          />
          <DetailCard 
            icon="calendar-alt" 
            label="Created" 
            value={project?.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A'}
            color={colors.warning}
          />
          <DetailCard 
            icon="user-tie" 
            label="PM" 
            value={project?.pm_name || 'Not assigned'}
            color={colors.success}
          />
          <DetailCard 
            icon="hard-hat" 
            label="Site" 
            value={project?.site_name || 'Not assigned'}
            color={colors.accent}
          />
        </View>

        {/* Project Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="info-circle" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Project Information</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <InfoRow label="Customer" value={project?.customer_name} />
            {project?.customer_email && (
              <InfoRow label="Email" value={project.customer_email} />
            )}
            {project?.customer_phone && (
              <InfoRow label="Phone" value={project.customer_phone} />
            )}
            <InfoRow label="Project Manager" value={project?.pm_name} />
            {project?.pm_email && (
              <InfoRow label="PM Email" value={project.pm_email} />
            )}
            <InfoRow label="Site Incharge" value={project?.site_name} />
            {project?.site_email && (
              <InfoRow label="Site Email" value={project.site_email} />
            )}
            <InfoRow label="Finance Manager" value={project?.finance_name} />
            {project?.finance_email && (
              <InfoRow label="Finance Email" value={project.finance_email} />
            )}
          </View>
        </View>

        {/* Site Plans Button */}
        <TouchableOpacity
          style={styles.sitePlansButton}
          onPress={() => navigation.navigate('SitePlans', { 
            projectId: project?.id,
            projectName: project?.name 
          })}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sitePlansGradient}
          >
            <FontAwesome5 
              name={sitePlansCount > 0 ? "file-pdf" : "upload"} 
              size={20} 
              color={colors.surface} 
            />
            <Text style={styles.sitePlansButtonText}>
              {sitePlansCount > 0 ? `View Site Plans (${sitePlansCount})` : 'Upload Site Plans'}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.surface} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Orders Button */}
        <TouchableOpacity
          style={styles.sitePlansButton}
          onPress={() => navigation.navigate('OrdersList', {
            projectId: project?.id,
            projectName: project?.name,
          })}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sitePlansGradient}
          >
            <FontAwesome5 name="box" size={20} color={colors.surface} />
            <Text style={styles.sitePlansButtonText}>View Orders</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.surface} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Payment Summary Section */}
        {shouldShowPaymentSummary && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="wallet" size={20} color={colors.success} />
              <Text style={styles.cardTitle}>Payment Summary</Text>
            </View>
            
            {loadingPaymentSummary ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading payment details...</Text>
              </View>
            ) : paymentSummary && paymentSummary.totalCost !== undefined ? (
              <>
                <View style={styles.paymentStats}>
                  <View style={styles.paymentStatItem}>
                    <Text style={styles.paymentStatLabel}>Total Cost</Text>
                    <Text style={styles.paymentStatValue}>₹{Number(paymentSummary.totalCost || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.paymentStatItem}>
                    <Text style={styles.paymentStatLabel}>Paid</Text>
                    <Text style={[styles.paymentStatValue, { color: colors.success }]}>
                      ₹{Number(paymentSummary.totalPaid || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.paymentStatItem}>
                    <Text style={styles.paymentStatLabel}>Balance</Text>
                    <Text style={[styles.paymentStatValue, { color: (paymentSummary.balance || 0) > 0 ? colors.danger : colors.success }]}>
                      ₹{Number(paymentSummary.balance || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
                
                {/* Payment Status Badge */}
                <View style={styles.paymentStatusContainer}>
                  <View style={[styles.paymentStatusBadge, { 
                    backgroundColor: (paymentSummary.balance || 0) === 0 ? colors.success + '20' : 
                                   paymentSummary.hasPendingFinalPayment ? colors.warning + '20' : 
                                   colors.info + '20'
                  }]}>
                    <Text style={[styles.paymentStatusText, { 
                      color: (paymentSummary.balance || 0) === 0 ? colors.success : 
                             paymentSummary.hasPendingFinalPayment ? colors.warning : 
                             colors.info
                    }]}>
                      {(paymentSummary.balance || 0) === 0 ? '✓ Payment Complete' : 
                       paymentSummary.hasPendingFinalPayment ? '⏳ Under Verification' : 
                       'Payment Pending'}
                    </Text>
                  </View>
                </View>
                
                {/* Extra Charges */}
                {paymentSummary.extraCharges && paymentSummary.extraCharges.length > 0 && (
                  <View style={styles.extraChargesContainer}>
                    <Text style={styles.extraChargesTitle}>Extra Charges</Text>
                    {paymentSummary.extraCharges.map((charge, index) => (
                      <View key={charge?.id || index} style={styles.extraChargeItem}>
                        <View style={styles.extraChargeInfo}>
                          <Text style={styles.extraChargeDesc}>{charge?.description || 'Extra charge'}</Text>
                          <Text style={styles.extraChargeAmount}>₹{Number(charge?.amount || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.extraChargeStatus}>
                          <View style={[styles.statusChip, { 
                            backgroundColor: charge?.status === 'completed' ? colors.success + '20' : 
                                           charge?.payment_method ? colors.warning + '20' : 
                                           colors.danger + '20'
                          }]}>
                            <Text style={[styles.statusChipText, { 
                              color: charge?.status === 'completed' ? colors.success : 
                                     charge?.payment_method ? colors.warning : 
                                     colors.danger
                            }]}>
                              {charge?.status === 'completed' ? 'Verified' : 
                               charge?.payment_method ? 'Under Verification' : 
                               'Not Paid'}
                            </Text>
                          </View>
                          
                          {!charge?.payment_method && charge?.status === 'pending' && (
                            <TouchableOpacity
                              style={styles.payExtraButton}
                              onPress={() => navigation.navigate('PayExtraCharge', { project, extraCharge: charge })}
                            >
                              <Text style={styles.payExtraButtonText}>Pay Now</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Action Buttons */}
                {(paymentSummary.balance || 0) > 0 && 
                 !paymentSummary.hasPendingFinalPayment && 
                 (paymentSummary.pendingExtraCharges?.length || 0) === 0 &&
                 (project?.status === 'WORK_STARTED' || project?.status === 'COMPLETED') && (
                  <ActionButton
                    onPress={handlePayFinal}
                    title={`Pay Final (₹${Number(paymentSummary.balance || 0).toFixed(2)})`}
                    icon="credit-card"
                    buttonColors={[colors.success, colors.successDark]}
                    gradient
                  />
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Payment information not available</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          {canAssignPM && !project.pm_id && (
            <ActionButton
              onPress={handleAssignPMPress}
              title="Assign Project Manager"
              icon="user-plus"
              buttonColors={[colors.primary, colors.primaryDark]}
              gradient
            />
          )}

          {canAssignSite && (
            <ActionButton
              onPress={handleAssignSitePress}
              title="Assign Site Incharge"
              icon="hard-hat"
              buttonColors={[colors.success, colors.successDark]}
              gradient
            />
          )}

          {canAssignFinance && (
            <ActionButton
              onPress={handleAssignFinancePress}
              title="Assign Finance"
              icon="chart-line"
              buttonColors={[colors.warning, '#e67e22']}
              gradient
            />
          )}

          {canScheduleVisit && (
            <ActionButton
              onPress={handleScheduleVisitPress}
              title="Schedule Visit"
              icon="calendar-check"
              buttonColors={[colors.warning, '#e67e22']}
              gradient
            />
          )}

          {canAddWorklogs && (
            <ActionButton
              onPress={handleAddWorklogPress}
              title={isFloorRestrictedSiteIncharge ? 'Add Floor Log' : 'Add Work Log'}
              icon="clipboard-list"
              buttonColors={[colors.primary, colors.primaryDark]}
              gradient
            />
          )}

          {canConfirmVisit && (
            <ActionButton
              onPress={handleConfirmVisit}
              title="Confirm Visit"
              icon="check-circle"
              buttonColors={[colors.success, colors.successDark]}
              gradient
            />
          )}

          {canSubmitReport && (
            <ActionButton
              onPress={handleSubmitReportPress}
              title="Submit Site Report"
              icon="file-alt"
              buttonColors={[colors.primary, colors.primaryDark]}
              gradient
            />
          )}

          {canStartWork && (
            <ActionButton
              onPress={handleStartWork}
              title="Start Work"
              icon="play"
              buttonColors={[colors.success, colors.successDark]}
              gradient
            />
          )}

          {canMarkCompleted && (
            <ActionButton
              onPress={handleMarkCompleted}
              title="Mark Work Completed"
              icon="check-double"
              buttonColors={[colors.primary, colors.primaryDark]}
              gradient
            />
          )}

          {canCloseProject && (
            <>
              <ActionButton
                onPress={() => navigation.navigate('ViewSignature', { projectId: project.id, project })}
                title="View Signature"
                icon="signature"
                buttonColors={[colors.primary, colors.primaryDark]}
                gradient
              />
              
              <ActionButton
                onPress={handleCloseProject}
                title="Close Project"
                icon="archive"
                buttonColors={[colors.danger, '#c0392b']}
                gradient
              />
            </>
          )}

          {canPayFinal && (
            <ActionButton
              onPress={handlePayFinal}
              title="Pay Final Amount"
              icon="credit-card"
              buttonColors={[colors.primary, colors.primaryDark]}
              gradient
            />
          )}

          {user?.role === 'customer' && project?.customer_id === user?.id && (
            <ActionButton
              onPress={() => navigation.navigate('Signature', { projectId: project.id, project })}
              title="Add/View Signature"
              icon="signature"
              buttonColors={[colors.primary, colors.primaryDark]}
              gradient
            />
          )}
        </View>

        {/* Floors Section */}
        {(canManageFloors || canAssignFloorSite || floorList.length > 0) ? (
          <View style={styles.worklogsContainer}>
            <View style={styles.worklogsHeader}>
              <View style={styles.cardHeader}>
                <FontAwesome5 name="building" size={20} color="#8B5CF6" />
                <Text style={styles.cardTitle}>Floors</Text>
              </View>
              {canManageFloors ? (
                <TouchableOpacity
                  style={styles.addWorklogButton}
                  onPress={() => { setNewFloorName(''); setShowAddFloorModal(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={24} color="#8B5CF6" />
                  <Text style={[styles.addWorklogButtonText, { color: '#8B5CF6' }]}>Add</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {floorList.length === 0 ? (
              <View style={styles.emptyWorklogs}>
                <FontAwesome5 name="building" size={40} color="#D1D5DB" />
                <Text style={styles.emptyWorklogsText}>
                  {canManageFloors ? 'No floors added yet.' : 'No floors defined for this project.'}
                </Text>
              </View>
            ) : (
              <View style={styles.worklogsList}>
                {floorList.map(floor => {
                  const statusMeta = FLOOR_STATUS_META[floor.status] || FLOOR_STATUS_META.pending;
                  return (
                    <TouchableOpacity
                      key={floor.id}
                      style={[styles.worklogCard, { borderLeftColor: statusMeta.color, borderLeftWidth: 4 }]}
                      onPress={() => openFloorDetail(floor)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.worklogHeader}>
                        <View style={[styles.worklogFloorBadge, { backgroundColor: '#EDE9FE' }]}>
                          <Text style={[styles.worklogFloorText, { color: '#7C3AED' }]}>{floor.floor_name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.floorStatusBadge, { backgroundColor: statusMeta.bg }]}>
                            <Text style={[styles.floorStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                          </View>
                          {canManageFloors ? (
                            <TouchableOpacity onPress={() => handleDeleteFloor(floor.id)} style={{ marginLeft: 8 }}>
                              <FontAwesome5 name="trash" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ marginTop: 10 }}>
                        {floor.site_incharge_name ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                              <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 13 }}>{floor.site_incharge_name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>{floor.site_incharge_name}</Text>
                              {floor.site_incharge_phone ? (
                                <TouchableOpacity onPress={() => makeCall(floor.site_incharge_phone)}>
                                  <Text style={{ fontSize: 11, color: '#2563EB' }}>{floor.site_incharge_phone}</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                            {canAssignFloorSite ? (
                              <TouchableOpacity
                                style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                                onPress={() => { setSelectedFloor(floor); fetchSiteIncharges(); setShowFloorSiteModal(true); }}
                              >
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Change</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>No site incharge assigned</Text>
                            {canAssignFloorSite ? (
                              <TouchableOpacity
                                style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                                onPress={() => { setSelectedFloor(floor); fetchSiteIncharges(); setShowFloorSiteModal(true); }}
                              >
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Assign</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Tap to view details & logs</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* Visits Section */}
        {(user?.role === 'customer' || user?.role === 'site_incharge' || 
          user?.role === 'admin' || user?.role === 'super_admin' || 
          user?.role === 'project_manager') && (
          <VisitsSection 
            projectId={project?.id} 
            userRole={user?.role} 
            userId={user?.id}
            customerId={project?.customer_id}
            onRefresh={fetchProjectDetails}
          />
        )}

        {/* Work Logs Section */}
        {canViewWorklogs && (
          <View style={styles.worklogsContainer}>
            <View style={styles.worklogsHeader}>
              <View style={styles.cardHeader}>
                <FontAwesome5 name="clipboard-list" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Work Logs</Text>
              </View>
              {canAddWorklogs && (
                <TouchableOpacity
                  style={styles.addWorklogButton}
                  onPress={handleAddWorklogPress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                  <Text style={styles.addWorklogButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingWorklogs ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading work logs...</Text>
              </View>
            ) : !worklogs || worklogs.length === 0 ? (
              <View style={styles.emptyWorklogs}>
                <MaterialIcons name="assignment" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyWorklogsText}>
                  {canAddWorklogs 
                    ? 'No work logs yet. Add your first work log!' 
                    : 'No work logs available yet.'}
                </Text>
              </View>
            ) : (
              <View style={styles.worklogsList}>
                {worklogs.map((worklog) => (
                  <View key={worklog?.id || Math.random()} style={styles.worklogCard}>
                    <View style={styles.worklogHeader}>
                      <View style={styles.worklogHeaderLeft}>
                        <View style={styles.worklogFloorBadge}>
                          <Text style={styles.worklogFloorText}>Floor {worklog?.floor_number || '?'}</Text>
                        </View>
                        <View style={styles.worklogDateContainer}>
                          <Text style={styles.worklogDate}>
                            {worklog?.created_at ? new Date(worklog.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Unknown date'}
                          </Text>
                          <Text style={styles.worklogTime}>
                            {worklog?.created_at ? new Date(worklog.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : ''}
                          </Text>
                        </View>
                      </View>
                      {worklog?.images && worklog.images.length > 0 && (
                        <View style={styles.imageCount}>
                          <Ionicons name="images" size={16} color={colors.primary} />
                          <Text style={styles.imageCountText}>{worklog.images.length}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Description Section */}
                    <View style={styles.worklogDescriptionContainer}>
                      <Text style={styles.worklogDescriptionLabel}>Work Description:</Text>
                      <Text style={styles.worklogDescription}>{worklog?.description || 'No description'}</Text>
                    </View>
                    
                    {/* Images Section */}
                    {worklog?.images && worklog.images.length > 0 && (
                      <View style={styles.worklogImages}>
                        <Text style={styles.worklogImagesLabel}>
                          Media ({worklog.images.length}):
                        </Text>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.imagesScrollContent}
                        >
                          {worklog.images.map((imagePath, index) => {
                            // Handle different image path formats
                            let imageUrl;
                            
                            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                              imageUrl = imagePath;
                            } else if (imagePath.startsWith('file://')) {
                              imageUrl = imagePath;
                            } else if (imagePath.startsWith('/uploads/')) {
                              const baseURL = getBaseUrl();
                              imageUrl = `${baseURL}${imagePath}`;
                            } else {
                              const baseURL = getBaseUrl();
                              imageUrl = `${baseURL}/uploads/${imagePath}`;
                            }
                            
                            const isVideo = isVideoFile(imagePath);
                            
                            return (
                              <View key={index} style={styles.worklogImageContainer}>
                                {isVideo ? (
                                  <Video
                                    source={{ uri: imageUrl }}
                                    style={styles.worklogImage}
                                    useNativeControls
                                    resizeMode="cover"
                                    isLooping={false}
                                  />
                                ) : (
                                  <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.worklogImage}
                                    resizeMode="cover"
                                    onError={(error) => {
                                      console.error('Failed to load worklog image:', imageUrl, error);
                                    }}
                                  />
                                )}
                                {canAddWorklogs ? (
                                  <TouchableOpacity
                                    style={styles.removeWorklogImageButton}
                                    onPress={() => handleRemoveWorklogImage(worklog.id, index, imagePath)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                    
                    {/* Add Images Button - Only for site incharge */}
                    {canAddWorklogs && (
                      <TouchableOpacity
                        style={styles.addImagesButton}
                        onPress={() => handleAddImagesPress(worklog)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera" size={16} color={colors.surface} />
                        <Text style={styles.addImagesButtonText}>
                          {worklog?.images && worklog.images.length > 0 ? 'Add More Photos' : 'Add Photos'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Feedback & Rating Section */}
        {canViewRating && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="star" size={20} color="#F59E0B" />
              <Text style={styles.cardTitle}>Customer Feedback</Text>
            </View>

            {loadingRating ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
            ) : existingRating ? (
              /* Read-only view for everyone once submitted */
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10, gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FontAwesome5
                      key={star}
                      name="star"
                      size={28}
                      color={star <= existingRating.rating ? '#F59E0B' : '#D1D5DB'}
                      solid={star <= existingRating.rating}
                    />
                  ))}
                </View>
                <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 }}>
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][existingRating.rating]}
                </Text>
                {existingRating.feedback ? (
                  <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginTop: 10 }}>
                    <Text style={{ fontSize: 14, color: '#374151', lineHeight: 22, fontStyle: 'italic' }}>
                      "{existingRating.feedback}"
                    </Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 8 }}>
                  {existingRating.customer_name} · {new Date(existingRating.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ) : user?.role === 'customer' && project.customer_id === user.id ? (
              /* Submit form — only for the customer, only before submitting */
              <>
                <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
                  How was your experience with this project?
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12, gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRatingValue(star)} activeOpacity={0.7}>
                      <FontAwesome5
                        name="star"
                        size={36}
                        color={star <= ratingValue ? '#F59E0B' : '#D1D5DB'}
                        solid={star <= ratingValue}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {ratingValue > 0 && (
                  <Text style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][ratingValue]}
                  </Text>
                )}

                <TextInput
                  style={[styles.modalInput, styles.textArea, { marginBottom: 6 }]}
                  value={ratingFeedback}
                  onChangeText={setRatingFeedback}
                  placeholder="Share your experience (optional, max 300 words)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                />
                <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 14 }}>
                  {ratingFeedback.trim().split(/\s+/).filter(Boolean).length} / 300 words
                </Text>

                <TouchableOpacity
                  style={[styles.modalSubmitButton, submittingRating && styles.submitButtonDisabled]}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                  activeOpacity={0.8}
                >
                  {submittingRating
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.modalSubmitButtonText}>Submit Feedback</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              /* No feedback yet — visible to other roles */
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <FontAwesome5 name="star" size={32} color="#D1D5DB" />
                <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 10 }}>No feedback submitted yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      
      {/* Add Floor Modal */}
      <Modal visible={showAddFloorModal} animationType="slide" transparent onRequestClose={() => setShowAddFloorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Floor</Text>
              <TouchableOpacity onPress={() => setShowAddFloorModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Floor Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newFloorName}
                onChangeText={setNewFloorName}
                placeholder="e.g. Ground Floor, 1st Floor, Basement"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.modalSubmitButton, { backgroundColor: '#8B5CF6' }]}
                onPress={handleAddFloor}
                disabled={assigningFloorSite}
              >
                {assigningFloorSite
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalSubmitButtonText}>Add Floor</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Floor Detail Modal */}
      <Modal visible={showFloorDetailModal} animationType="slide" transparent onRequestClose={() => setShowFloorDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedFloor?.floor_name}</Text>
              <TouchableOpacity onPress={() => setShowFloorDetailModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {selectedFloor ? (() => {
                const sm = FLOOR_STATUS_META[selectedFloor.status] || FLOOR_STATUS_META.pending;
                const transitions = FLOOR_STATUS_TRANSITIONS[selectedFloor.status] || [];
                const canChangeStatus = canManageFloors || (user?.role === 'site_incharge' && selectedFloor.site_incharge_id === user?.id);
                const canQuickAddFloorLog =
                  user?.role === 'site_incharge' &&
                  selectedFloor.site_incharge_id === user?.id;
                return (
                  <View>
                    <View style={styles.floorDetailRow}>
                      <Text style={styles.floorDetailLabel}>Status</Text>
                      <View style={[styles.floorStatusBadge, { backgroundColor: sm.bg }]}>
                        <Text style={[styles.floorStatusText, { color: sm.color }]}>{sm.label}</Text>
                      </View>
                    </View>
                    {selectedFloor.status_updated_at ? (
                      <Text style={styles.floorDetailMeta}>
                        Updated {new Date(selectedFloor.status_updated_at).toLocaleString('en-IN')}
                        {selectedFloor.status_updated_by_name ? ` by ${selectedFloor.status_updated_by_name}` : ''}
                      </Text>
                    ) : null}
                    {canQuickAddFloorLog ? (
                      <TouchableOpacity
                        style={[styles.addWorklogButton, { marginTop: 10, alignSelf: 'flex-start' }]}
                        onPress={() => {
                          const selectedFloorNum = getFloorNumberFromFloor(selectedFloor);
                          setFloorNumber(selectedFloorNum ? String(selectedFloorNum) : '');
                          setDescription('');
                          setWorklogValidationErrors({});
                          setShowFloorDetailModal(false);
                          setShowWorklogModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle" size={20} color={colors.primary} />
                        <Text style={styles.addWorklogButtonText}>+ Add</Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={[styles.floorDetailRow, { marginTop: 14 }]}>
                      <Text style={styles.floorDetailLabel}>Site Incharge</Text>
                    </View>
                    {selectedFloor.site_incharge_name ? (
                      <View style={styles.floorSiteRow}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>{selectedFloor.site_incharge_name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>{selectedFloor.site_incharge_name}</Text>
                          {selectedFloor.site_incharge_email ? <Text style={styles.userEmail}>{selectedFloor.site_incharge_email}</Text> : null}
                          {selectedFloor.site_incharge_phone ? (
                            <TouchableOpacity onPress={() => makeCall(selectedFloor.site_incharge_phone)}>
                              <Text style={{ fontSize: 13, color: '#2563EB' }}>{selectedFloor.site_incharge_phone}</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        {selectedFloor.site_incharge_phone ? (
                          <TouchableOpacity style={styles.callBtn} onPress={() => makeCall(selectedFloor.site_incharge_phone)}>
                            <MaterialIcons name="call" size={18} color="#fff" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>No site incharge assigned</Text>
                    )}
                    {canChangeStatus && transitions.length > 0 ? (
                      <View style={{ marginTop: 16 }}>
                        <Text style={styles.floorDetailLabel}>Update Status</Text>
                        <View style={styles.statusButtonsRow}>
                          {transitions.map(t => {
                            const tm = FLOOR_STATUS_META[t];
                            return (
                              <TouchableOpacity
                                key={t}
                                style={[styles.statusActionBtn, { backgroundColor: tm.color }]}
                                onPress={() => { setStatusNote(''); setShowStatusModal(t); }}
                              >
                                <Text style={styles.statusActionBtnText}>{tm.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                    <View style={{ marginTop: 20 }}>
                      <Text style={[styles.floorDetailLabel, { marginBottom: 10 }]}>Activity Log</Text>
                      {loadingFloorLogs ? (
                        <ActivityIndicator color="#8B5CF6" />
                      ) : floorLogs.length === 0 ? (
                        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>No activity yet</Text>
                      ) : (
                        floorLogs.map(log => {
                          const lm = FLOOR_STATUS_META[log.status] || FLOOR_STATUS_META.pending;
                          return (
                            <View key={log.id} style={styles.floorLogItem}>
                              <View style={[styles.floorLogDot, { backgroundColor: lm.color }]} />
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <Text style={[styles.floorLogStatus, { color: lm.color }]}>{lm.label}</Text>
                                  <Text style={styles.floorLogBy}> • {log.created_by_name}</Text>
                                </View>
                                {log.note ? <Text style={styles.floorLogNote}>{log.note}</Text> : null}
                                <Text style={styles.floorLogTime}>{new Date(log.created_at).toLocaleString('en-IN')}</Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                );
              })() : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floor Status Confirm Modal */}
      <Modal visible={!!showStatusModal} animationType="fade" transparent onRequestClose={() => setShowStatusModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', paddingHorizontal: 24 }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24 }}>
            {showStatusModal ? (() => {
              const tm = FLOOR_STATUS_META[showStatusModal];
              return (
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
                    Mark as {tm.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                    {selectedFloor?.floor_name}
                  </Text>
                  <Text style={styles.inputLabel}>Note (optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { marginBottom: 20 }]}
                    value={statusNote}
                    onChangeText={setStatusNote}
                    placeholder="Add a note..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={[styles.modalSubmitButton, { flex: 1, marginRight: 8, backgroundColor: '#F3F4F6' }]}
                      onPress={() => setShowStatusModal(false)}
                    >
                      <Text style={[styles.modalSubmitButtonText, { color: '#374151' }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalSubmitButton, { flex: 1, backgroundColor: tm.color }]}
                      onPress={() => handleUpdateFloorStatus(showStatusModal)}
                      disabled={updatingFloorStatus}
                    >
                      {updatingFloorStatus
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.modalSubmitButtonText}>{tm.label}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })() : null}
          </View>
        </View>
      </Modal>

      {/* Assign Floor Site Incharge Modal */}
      <Modal visible={showFloorSiteModal} animationType="slide" transparent onRequestClose={() => setShowFloorSiteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={[colors.success, colors.successDark]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Site — {selectedFloor?.floor_name}</Text>
              <TouchableOpacity onPress={() => setShowFloorSiteModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ paddingBottom: 20 }}>
              {loadingSites ? (
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10B981" /></View>
              ) : siteIncharges.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No site incharges available</Text>
                </View>
              ) : (
                <FlatList
                  data={siteIncharges}
                  keyExtractor={item => item.id}
                  style={styles.modalList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.userItem}
                      onPress={() => handleAssignFloorSite(item.id)}
                      disabled={assigningFloorSite}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                        {item.phone ? (
                          <Text style={styles.userPhone}>{item.phone}</Text>
                        ) : null}
                      </View>
                      {item.phone ? (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => makeCall(item.phone)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons name="call" size={18} color="#fff" />
                        </TouchableOpacity>
                      ) : null}
                      <MaterialIcons name="chevron-right" size={24} color="#6B7280" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* PM Selection Modal */}
      <Modal
        visible={showPMModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPMModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Select Project Manager</Text>
              <TouchableOpacity
                onPress={() => setShowPMModal(false)}
                disabled={assigningPM}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.surface} />
              </TouchableOpacity>
            </LinearGradient>

            {loadingPMs ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading project managers...</Text>
              </View>
            ) : !projectManagers || projectManagers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No project managers available</Text>
              </View>
            ) : (
              <FlatList
                data={projectManagers}
                renderItem={renderPMItem}
                keyExtractor={(item) => item?.id || Math.random().toString()}
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
              />
            )}

            {assigningPM && (
              <View style={styles.assigningOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.assigningText}>Assigning...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Site Incharge Selection Modal */}
      <Modal
        visible={showSiteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSiteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.success, colors.successDark]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Select Site Incharge</Text>
              <TouchableOpacity
                onPress={() => setShowSiteModal(false)}
                disabled={assigningSite}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.surface} />
              </TouchableOpacity>
            </LinearGradient>

            {loadingSites ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.success} />
                <Text style={styles.loadingText}>Loading site incharges...</Text>
              </View>
            ) : !siteIncharges || siteIncharges.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="hard-hat" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No site incharges available</Text>
              </View>
            ) : (
              <FlatList
                data={siteIncharges}
                renderItem={renderSiteItem}
                keyExtractor={(item) => item?.id || Math.random().toString()}
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
              />
            )}

            {assigningSite && (
              <View style={styles.assigningOverlay}>
                <ActivityIndicator size="large" color={colors.success} />
                <Text style={styles.assigningText}>Assigning...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Finance Selection Modal */}
      <Modal
        visible={showFinanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFinanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.warning, '#e67e22']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Select Finance Manager</Text>
              <TouchableOpacity
                onPress={() => setShowFinanceModal(false)}
                disabled={assigningFinance}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.surface} />
              </TouchableOpacity>
            </LinearGradient>

            {loadingFinance ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.warning} />
                <Text style={styles.loadingText}>Loading finance users...</Text>
              </View>
            ) : !financeUsers || financeUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="account-balance" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No finance users available</Text>
              </View>
            ) : (
              <FlatList
                data={financeUsers}
                renderItem={renderFinanceItem}
                keyExtractor={(item) => item?.id || Math.random().toString()}
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
              />
            )}

            {assigningFinance && (
              <View style={styles.assigningOverlay}>
                <ActivityIndicator size="large" color={colors.warning} />
                <Text style={styles.assigningText}>Assigning...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Schedule Visit Modal */}
      <Modal
        visible={showVisitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVisitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.warning, '#e67e22']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Schedule Visit</Text>
              <TouchableOpacity
                onPress={() => setShowVisitModal(false)}
                disabled={schedulingVisit}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.surface} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.infoSection}>
                <MaterialIcons name="person" size={20} color={colors.warning} />
                <Text style={styles.infoSectionText}>
                  Site Incharge: {siteInchargeName || 'Loading...'}
                </Text>
              </View>

              <SimpleDatePicker
                label="Visit Date *"
                value={visitDate}
                onChange={(date) => {
                  setVisitDate(date);
                  if (visitValidationErrors.visitDate) {
                    setVisitValidationErrors({ ...visitValidationErrors, visitDate: null });
                  }
                }}
                error={visitValidationErrors.visitDate}
              />

              <SimpleTimePicker
                label="Visit Time *"
                value={visitTime}
                onChange={(time) => {
                  setVisitTime(time);
                  if (visitValidationErrors.visitTime) {
                    setVisitValidationErrors({ ...visitValidationErrors, visitTime: null });
                  }
                }}
                error={visitValidationErrors.visitTime}
              />

              <TouchableOpacity
                style={[styles.modalSubmitButton, schedulingVisit && styles.submitButtonDisabled]}
                onPress={() => handleScheduleVisit(false)}
                disabled={schedulingVisit}
                activeOpacity={0.8}
              >
                {schedulingVisit ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <>
                    <Ionicons name="calendar" size={20} color={colors.surface} />
                    <Text style={styles.modalSubmitButtonText}>Schedule Visit</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowVisitModal(false)}
                disabled={schedulingVisit}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Worklog Modal */}
      <Modal
        visible={showWorklogModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorklogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Add Work Log</Text>
              <TouchableOpacity
                onPress={() => setShowWorklogModal(false)}
                disabled={creatingWorklog}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.surface} />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Floor *</Text>
                {isFloorRestrictedSiteIncharge ? (
                  // Floor-assigned site incharge: show only their assigned floors
                  <View>
                    {assignedFloors.map((f) => {
                      const selectedFloorNumber = getFloorNumberFromFloor(f);
                      const selectedFloorValue = selectedFloorNumber ? String(selectedFloorNumber) : '';
                      const isSelected = floorNumber === selectedFloorValue;

                      return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => {
                          if (!selectedFloorValue) return;
                          setFloorNumber(selectedFloorValue);
                          if (worklogValidationErrors.floorNumber) {
                            setWorklogValidationErrors({ ...worklogValidationErrors, floorNumber: null });
                          }
                        }}
                        style={{
                          padding: 12, borderRadius: 8, marginBottom: 6,
                          backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                          borderWidth: 1, borderColor: isSelected ? colors.primary : colors.border,
                          opacity: selectedFloorValue ? 1 : 0.6,
                        }}
                      >
                        <Text style={{ color: isSelected ? colors.surface : colors.text, fontWeight: '600' }}>
                          {f.floor_name} {selectedFloorNumber ? `(#${selectedFloorNumber})` : ''}
                        </Text>
                      </TouchableOpacity>
                    )})}
                  </View>
                ) : (
                  // Project-level site incharge: free text input
                  <TextInput
                    style={[styles.modalInput, worklogValidationErrors.floorNumber && styles.inputError]}
                    value={floorNumber}
                    onChangeText={(text) => {
                      setFloorNumber(text);
                      if (worklogValidationErrors.floorNumber) {
                        setWorklogValidationErrors({ ...worklogValidationErrors, floorNumber: null });
                      }
                    }}
                    placeholder="Enter floor number (e.g., 1, 2, 3)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                )}
                {worklogValidationErrors.floorNumber && (
                  <Text style={styles.errorText}>{worklogValidationErrors.floorNumber}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea, worklogValidationErrors.description && styles.inputError]}
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    if (worklogValidationErrors.description) {
                      setWorklogValidationErrors({ ...worklogValidationErrors, description: null });
                    }
                  }}
                  placeholder="Describe the work completed on this floor"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {worklogValidationErrors.description && (
                  <Text style={styles.errorText}>{worklogValidationErrors.description}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitButton, creatingWorklog && styles.submitButtonDisabled]}
                onPress={handleCreateWorklog}
                disabled={creatingWorklog}
                activeOpacity={0.8}
              >
                {creatingWorklog ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color={colors.surface} />
                    <Text style={styles.modalSubmitButtonText}>Create Work Log</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowWorklogModal(false)}
                disabled={creatingWorklog}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Images Modal */}
      <Modal
        visible={showAddImagesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddImagesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.success, colors.successDark]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Add Images</Text>
              <TouchableOpacity
                onPress={() => setShowAddImagesModal(false)}
                disabled={addingImages}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.surface} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalHelperText}>
                Add worklog photos/videos for Floor {selectedWorklog?.floor_number || '?'}
              </Text>

              {/* Selected Media Preview */}
              {selectedImages.length > 0 && (
                <View style={styles.selectedImagesContainer}>
                  <Text style={styles.selectedImagesTitle}>
                    Selected Media ({selectedImages.length}):
                  </Text>
                  <FlatList
                    data={selectedImages}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => {
                      const ext = item.uri.split('.').pop().toLowerCase();
                      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext) || item.type === 'video';
                      const isAudio = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus'].includes(ext) || item.type === 'audio';
                      return (
                        <View style={styles.imagePreviewContainer}>
                          {isAudio ? (
                            <View style={[styles.imagePreview, { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }]}>
                              <FontAwesome5 name="microphone" size={28} color="#7C3AED" />
                              <Text style={{ fontSize: 9, color: '#7C3AED', marginTop: 4, fontWeight: '600' }}>VOICE</Text>
                            </View>
                          ) : (
                            <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                          )}
                          {isVideo ? (
                            <View style={styles.videoThumbOverlay}>
                              <Ionicons name="play-circle" size={28} color="#FFFFFF" />
                              {item.timestamp ? (
                                <View style={styles.videoThumbMeta}>
                                  <Text style={styles.videoThumbMetaText}>{item.timestamp.split('   ')[0]}</Text>
                                  <Text style={styles.videoThumbMetaText}>{item.timestamp.split('   ')[1]}</Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => handleRemoveImage(index)}
                          >
                            <Ionicons name="close-circle" size={20} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      );
                    }}
                  />
                </View>
              )}

              {/* Add Media Button */}
              <TouchableOpacity
                style={styles.pickImagesButton}
                onPress={pickImages}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.pickImagesGradient}
                >
                  <FontAwesome5 name="camera" size={32} color="#FFFFFF" />
                  <Text style={styles.pickImagesText}>
                    {selectedImages.length === 0 ? 'Add Photos / Videos' : 'Add More Media'}
                  </Text>
                  <Text style={styles.pickImagesHint}>
                    {selectedImages.length} file(s) selected • Max 10
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitButton, (addingImages || selectedImages.length === 0) && styles.submitButtonDisabled]}
                onPress={handleSubmitImages}
                disabled={addingImages || selectedImages.length === 0}
                activeOpacity={0.8}
              >
                {addingImages ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color={colors.surface} />
                    <Text style={styles.modalSubmitButtonText}>
                      Upload {selectedImages.length} File{selectedImages.length !== 1 ? 's' : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddImagesModal(false)}
                disabled={addingImages}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Watermark Modal - Camera photos only */}
      <Modal
        visible={showWatermarkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWatermarkModal(false)}
      >
        <View style={styles.watermarkModalOverlay}>
          <View style={styles.watermarkModalContent}>
            <Text style={styles.watermarkTitle}>📸 Add Watermark?</Text>
            <Text style={styles.watermarkSubtitle}>
              Add date, time & GPS location to your photo for better documentation
            </Text>
            
            {watermarkPreview && (
              <View style={styles.watermarkPreviewContainer}>
                <Image 
                  source={{ uri: watermarkPreview.uri }} 
                  style={styles.watermarkPreviewImage}
                  resizeMode="contain"
                />
                <View style={styles.watermarkOverlay}>
                  <Text style={styles.watermarkText}>{watermarkPreview.timestamp}</Text>
                  <Text style={styles.watermarkText}>{watermarkPreview.locText}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.watermarkActions}>
              <TouchableOpacity
                style={styles.watermarkSkipButton}
                onPress={handleWatermarkSkip}
              >
                <Text style={styles.watermarkSkipText}>Skip Watermark</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.watermarkAddButton}
                onPress={handleWatermarkCapture}
              >
                <Text style={styles.watermarkAddText}>✅ Add Watermark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Video Metadata Modal */}
      <Modal
        visible={showVideoMetaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVideoMetaModal(false)}
      >
        <View style={styles.watermarkModalOverlay}>
          <View style={styles.watermarkModalContent}>
            <Text style={styles.watermarkTitle}>🎥 Video Recorded</Text>
            <Text style={styles.watermarkSubtitle}>
              Timestamp & location will be saved with this video
            </Text>

            {videoMetaPreview && (
              <View style={styles.videoMetaInfoBox}>
                <View style={styles.videoMetaRow}>
                  <FontAwesome5 name="calendar-alt" size={13} color="#3B82F6" />
                  <Text style={styles.videoMetaText}>
                    {videoMetaPreview.timestamp.split('   ')[0]}
                  </Text>
                </View>
                <View style={styles.videoMetaRow}>
                  <FontAwesome5 name="clock" size={13} color="#3B82F6" />
                  <Text style={styles.videoMetaText}>
                    {videoMetaPreview.timestamp.split('   ')[1]}
                  </Text>
                </View>
                <View style={styles.videoMetaRow}>
                  <FontAwesome5 name="map-marker-alt" size={13} color="#3B82F6" />
                  <Text style={styles.videoMetaText}>{videoMetaPreview.locText}</Text>
                </View>
              </View>
            )}

            <View style={styles.watermarkActions}>
              <TouchableOpacity
                style={styles.watermarkSkipButton}
                onPress={() => {
                  if (videoMetaPreview) {
                    setSelectedImages(prev => [...prev, { uri: videoMetaPreview.uri, type: 'video' }]);
                  }
                  setShowVideoMetaModal(false);
                  setVideoMetaPreview(null);
                }}
              >
                <Text style={styles.watermarkSkipText}>Add Without Info</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.watermarkAddButton}
                onPress={() => {
                  if (videoMetaPreview) {
                    setSelectedImages(prev => [...prev, {
                      uri: videoMetaPreview.uri,
                      type: 'video',
                      timestamp: videoMetaPreview.timestamp,
                      locText: videoMetaPreview.locText,
                    }]);
                  }
                  setShowVideoMetaModal(false);
                  setVideoMetaPreview(null);
                  Alert.alert('Video Added', '✅ Video added with timestamp & location.', [{ text: 'OK' }]);
                }}
              >
                <Text style={styles.watermarkAddText}>✅ Add with Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Voice Note Recording Modal */}
      <Modal visible={showVoiceModal} animationType="fade" transparent onRequestClose={cancelRecording}>
        <View style={[styles.watermarkModalOverlay, { justifyContent: 'center', paddingHorizontal: 24 }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 }}>🎙️ Voice Note</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Record a voice note for this worklog</Text>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isRecording ? '#FEE2E2' : '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <FontAwesome5 name="microphone" size={32} color={isRecording ? '#DC2626' : '#7C3AED'} />
            </View>
            {isRecording ? (
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#DC2626', marginBottom: 24 }}>
                {`${Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:${(recordingDuration % 60).toString().padStart(2, '0')}`}
              </Text>
            ) : (
              <Text style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 24 }}>Tap to start recording</Text>
            )}
            <View style={{ flexDirection: 'row', width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', marginRight: 8 }}
                onPress={cancelRecording}
              >
                <Text style={{ fontWeight: '600', color: '#374151' }}>Cancel</Text>
              </TouchableOpacity>
              {isRecording ? (
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center' }}
                  onPress={stopRecording}
                >
                  <Text style={{ fontWeight: '700', color: '#fff' }}>⏹ Stop & Save</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#7C3AED', alignItems: 'center' }}
                  onPress={startRecording}
                >
                  <Text style={{ fontWeight: '700', color: '#fff' }}>⏺ Start</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavigation navigation={navigation} activeRoute="ProjectsList" />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 20 : StatusBar.currentHeight + 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    marginTop: 10,
  },
  projectName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.surface,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -20,
    paddingHorizontal: 16,
    gap: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.surface,
    margin: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  sitePlansButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sitePlansGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  sitePlansButtonText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '600',
    flex: 1,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '600',
  },
  paymentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  paymentStatItem: {
    alignItems: 'center',
  },
  paymentStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paymentStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  paymentStatusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  extraChargesContainer: {
    marginBottom: 20,
  },
  extraChargesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  extraChargeItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  extraChargeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  extraChargeDesc: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  extraChargeAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.warning,
  },
  extraChargeStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  payExtraButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payExtraButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  worklogsContainer: {
    backgroundColor: colors.surface,
    margin: 16,
    marginTop: 0,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  worklogsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addWorklogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addWorklogButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyWorklogs: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyWorklogsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  worklogsList: {
    gap: 16,
  },
  worklogCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  worklogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  worklogHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  worklogFloorBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  worklogFloorText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  worklogDateContainer: {
    alignItems: 'flex-start',
  },
  worklogDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  worklogTime: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  imageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  worklogDescriptionContainer: {
    marginBottom: 12,
  },
  worklogDescriptionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  worklogDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  worklogImagesLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  worklogImages: {
    marginBottom: 12,
  },
  imagesScrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  worklogImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  worklogImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  removeWorklogImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  addImagesButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.surface,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    maxHeight: 500,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  callBtn: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 7,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userProjects: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userProjectsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  modalForm: {
    padding: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoSectionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  modalSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  modalSubmitButtonText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '600',
  },
  modalCancelButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  assigningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  assigningText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 12,
  },
  modalHelperText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  imageInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imageInput: {
    flex: 1,
  },
  addUrlButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addUrlButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  imageUrlsList: {
    marginTop: 16,
    marginBottom: 20,
  },
  imageUrlsTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  imageUrlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageUrlText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  removeUrlButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  
  // Image picker styles
  selectedImagesContainer: {
    marginBottom: 16,
  },
  selectedImagesTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  videoThumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  videoThumbMeta: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 3,
  },
  videoThumbMetaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickImagesButton: {
    marginBottom: 16,
  },
  pickImagesGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed',
  },
  pickImagesText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  pickImagesHint: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Watermark modal styles
  watermarkModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  watermarkModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  watermarkTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  watermarkSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  watermarkPreviewContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  watermarkPreviewImage: {
    width: 250,
    height: 200,
    borderRadius: 12,
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  watermarkActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  watermarkSkipButton: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  watermarkSkipText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  watermarkAddButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  watermarkAddText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  videoMetaInfoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  videoMetaText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  floorStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  floorStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  floorDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  floorDetailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  floorDetailMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  floorSiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statusActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  statusActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  floorLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  floorLogDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 10,
  },
  floorLogStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  floorLogBy: {
    fontSize: 12,
    color: '#6B7280',
  },
  floorLogNote: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
  },
  floorLogTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export default ProjectDetailScreen;