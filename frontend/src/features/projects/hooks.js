import { useState, useEffect } from 'react';
import { projectsApi } from './api';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.getAllProjects();
      
      if (response.success) {
        setProjects(response.data.projects);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, loading, error, refetch: fetchProjects };
};

export const useCreateProject = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createProject = async (projectData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.createProject(projectData);
      
      if (response.success) {
        return response.data.project;
      }
    } catch (err) {
      let errorMessage;
      
      // Handle different types of errors
      if (err.message === 'Network Error' || err.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection lost. The project may have been created successfully. Please check your projects list and try again if needed.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else {
        errorMessage = 'Failed to create project';
      }
      
      setError(errorMessage);
      console.error('Error creating project:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createProject, loading, error };
};

export const useAssignPM = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const assignPM = async (projectId, pmId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.assignPM(projectId, pmId);
      
      if (response.success) {
        return response.data.project;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to assign Project Manager';
      setError(errorMessage);
      console.error('Error assigning PM:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { assignPM, loading, error };
};

export const useAssignSite = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const assignSite = async (projectId, siteId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.assignSite(projectId, siteId);
      
      if (response.success) {
        return response.data.project;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to assign Site Incharge';
      setError(errorMessage);
      console.error('Error assigning Site Incharge:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { assignSite, loading, error };
};

export const useAssignFinance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const assignFinance = async (projectId, financeId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsApi.assignFinance(projectId, financeId);
      
      if (response.success) {
        return response.data.project;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to assign Finance';
      setError(errorMessage);
      console.error('Error assigning Finance:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { assignFinance, loading, error };
};
