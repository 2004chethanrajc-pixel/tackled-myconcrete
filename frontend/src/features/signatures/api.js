import apiClient from '../../services/apiClient';

export const signaturesApi = {
  // POST /api/v1/signatures/:projectId - Upload signature
  uploadSignature: async (projectId, formData) => {
    const response = await apiClient.post(`/signatures/${projectId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds for file upload
    });
    return response.data;
  },

  // GET /api/v1/signatures/:projectId - Get signature
  getSignature: async (projectId) => {
    const response = await apiClient.get(`/signatures/${projectId}`);
    return response.data;
  },

  // DELETE /api/v1/signatures/:projectId - Delete signature
  deleteSignature: async (projectId) => {
    const response = await apiClient.delete(`/signatures/${projectId}`);
    return response.data;
  },
};
