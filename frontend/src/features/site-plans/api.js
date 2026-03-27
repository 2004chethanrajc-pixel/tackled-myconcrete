import apiClient from '../../services/apiClient';

export const sitePlansApi = {
  // Upload site plan
  uploadSitePlan: async (projectId, file) => {
    try {
      const formData = new FormData();
      
      // Add file to FormData with proper structure for React Native
      formData.append('sitePlan', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name || 'site-plan.pdf',
      });

      console.log('Uploading site plan:', {
        projectId,
        fileName: file.name,
        fileUri: file.uri,
        fileType: file.type
      });

      const response = await apiClient.post(
        `/projects/${projectId}/site-plans`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: (data, headers) => {
            // Return FormData as-is for multipart uploads
            return data;
          },
        }
      );
      
      console.log('Upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Get site plans for a project
  getSitePlansByProject: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/site-plans`);
    return response.data;
  },

  // Delete site plan
  deleteSitePlan: async (planId) => {
    const response = await apiClient.delete(`/site-plans/${planId}`);
    return response.data;
  },
};
