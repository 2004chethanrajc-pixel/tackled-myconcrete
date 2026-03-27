import { useState, useEffect } from 'react';
import { worklogsApi } from './api';

export const useProjectWorklogs = (projectId) => {
  const [worklogs, setWorklogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorklogs = async () => {
    if (!projectId) {
      // Prevent accidental calls like /worklogs/project/null during intermediate renders.
      setWorklogs([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching worklogs for project:', projectId);
      const response = await worklogsApi.getWorklogsByProject(projectId);
      
      console.log('Worklogs API response:', response);
      
      if (response.success) {
        console.log('Worklogs fetched successfully:', response.data.worklogs);
        setWorklogs(response.data.worklogs);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch work logs';
      setError(errorMessage);
      console.error('Error fetching work logs:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      console.log('useProjectWorklogs: Project ID changed to:', projectId);
      fetchWorklogs();
    } else {
      console.log('useProjectWorklogs: No project ID provided');
      setLoading(false);
    }
  }, [projectId]);

  return { worklogs, loading, error, refetch: fetchWorklogs };
};

export const useCreateWorklog = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createWorklog = async (worklogData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await worklogsApi.createWorklog(worklogData);
      
      if (response.success) {
        return response.data.worklog;
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const status = err.response?.status;
      let errorMessage;

      if (serverMsg) {
        errorMessage = serverMsg;
      } else if (status === 403) {
        errorMessage = 'You are not authorised to create work logs for this project.';
      } else if (status === 400) {
        errorMessage = 'Invalid work log data. Please check all fields.';
      } else {
        errorMessage = err.message || 'Failed to create work log';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createWorklog, loading, error };
};

export const useAddWorklogImages = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addImages = async (worklogId, images) => {
    try {
      setLoading(true);
      setError(null);
      const response = await worklogsApi.addWorklogImages(worklogId, images);
      
      if (response.success) {
        return response.data.worklog;
      }
    } catch (err) {
      // Extract the most specific error message available
      const serverMsg = err.response?.data?.message;
      const status = err.response?.status;
      let errorMessage;

      if (serverMsg) {
        errorMessage = serverMsg;
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Upload timed out. The file may be too large or your connection is slow.';
      } else if (status === 413) {
        errorMessage = 'File too large. Maximum allowed size is 100MB per file.';
      } else if (status === 415) {
        errorMessage = 'Unsupported file type. Only images, videos, and audio files are allowed.';
      } else if (status === 403) {
        errorMessage = 'You are not authorised to add media to this work log.';
      } else {
        errorMessage = err.message || 'Failed to add media';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { addImages, loading, error };
};
