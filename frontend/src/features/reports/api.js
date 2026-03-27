import apiClient from '../../services/apiClient';

export const reportsApi = {
  // POST /api/v1/reports/upload-images - Upload report images
  uploadImages: async (formData) => {
    const response = await apiClient.post('/reports/upload-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // POST /api/v1/reports - Submit site report
  submitReport: async (reportData) => {
    const response = await apiClient.post('/reports', reportData);
    return response.data;
  },

  // GET /api/v1/reports/project/:projectId - Get reports by project
  getReportsByProject: async (projectId) => {
    const response = await apiClient.get(`/reports/project/${projectId}`);
    return response.data;
  },

  // GET /api/v1/reports/project/:projectId/final - Get final project report
  getFinalProjectReport: async (projectId) => {
    const response = await apiClient.get(`/reports/project/${projectId}/final`);
    return response.data;
  },

  // GET /api/v1/reports - Get all reports
  getAllReports: async () => {
    const response = await apiClient.get('/reports');
    return response.data;
  },
};
