import { useState } from 'react';
import { reportsApi } from './api';

export const useSubmitReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitReport = async (reportData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.submitReport(reportData);
      return response.data.report;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit report';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { submitReport, loading, error };
};

export const useProjectReports = (projectId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.getReportsByProject(projectId);
      return response.data.reports;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch reports';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { fetchReports, loading, error };
};
