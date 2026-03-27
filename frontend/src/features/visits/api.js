import apiClient from '../../services/apiClient';

export const visitsApi = {
  // POST /api/v1/visits - Schedule a visit
  scheduleVisit: async (visitData) => {
    const response = await apiClient.post('/visits', visitData);
    return response.data;
  },

  // GET /api/v1/visits/project/:projectId - Get visits by project
  getVisitsByProject: async (projectId) => {
    const response = await apiClient.get(`/visits/project/${projectId}`);
    return response.data;
  },
 
  // PATCH /api/v1/visits/:id/reject - Reject a visit
  rejectVisit: async (visitId, rejectionData) => {
    const response = await apiClient.patch(`/visits/${visitId}/reject`, rejectionData);
    return response.data;
  },

  // PATCH /api/v1/visits/:id/complete - Complete a visit
  completeVisit: async (visitId) => {
    const response = await apiClient.patch(`/visits/${visitId}/complete`);
    return response.data;
  },
};
