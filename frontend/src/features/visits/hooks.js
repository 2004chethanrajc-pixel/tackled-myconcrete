import { useState } from 'react';
import { visitsApi } from './api';

export const useScheduleVisit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scheduleVisit = async (visitData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('useScheduleVisit - Sending data:', visitData);
      
      const response = await visitsApi.scheduleVisit(visitData);
      
      if (response.success) {
        return response.data.visit;
      }
    } catch (err) {
      console.error('useScheduleVisit - Full error:', err);
      console.error('useScheduleVisit - Error response:', err.response);
      console.error('useScheduleVisit - Error response data:', err.response?.data);
      console.error('useScheduleVisit - Error response status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to schedule visit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { scheduleVisit, loading, error };
};

export const useProjectVisits = (projectId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitsApi.getVisitsByProject(projectId);
      
      if (response.success) {
        return response.data.visits;
      }
      return [];
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch visits';
      setError(errorMessage);
      console.error('Error fetching visits:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { fetchVisits, loading, error };
};

export const useRejectVisit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const rejectVisit = async (visitId, rejectionData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== useRejectVisit - Sending data ===');
      console.log('Visit ID:', visitId);
      console.log('Rejection Data:', JSON.stringify(rejectionData, null, 2));
      console.log('Data keys:', Object.keys(rejectionData));
      console.log('rejectionReason:', rejectionData.rejectionReason);
      console.log('rejectionDescription:', rejectionData.rejectionDescription);
      
      const response = await visitsApi.rejectVisit(visitId, rejectionData);
      
      console.log('=== useRejectVisit - Response ===');
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        return response.data.visit;
      }
    } catch (err) {
      console.error('=== useRejectVisit - Error ===');
      console.error('Full error:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error message:', err.response?.data?.message);
      console.error('Error errors:', err.response?.data?.errors);
      
      const errorMessage = err.response?.data?.message || 'Failed to reject visit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { rejectVisit, loading, error };
};

export const useCompleteVisit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const completeVisit = async (visitId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitsApi.completeVisit(visitId);
      
      if (response.success) {
        return response.data.visit;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to complete visit';
      setError(errorMessage);
      console.error('Error completing visit:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { completeVisit, loading, error };
};
