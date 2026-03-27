import apiClient from '../../services/apiClient';

export const projectsApi = {
  // GET /api/v1/projects - Get all projects (filtered by role)
  getAllProjects: async () => {
    const response = await apiClient.get('/projects');
    return response.data;
  },

  // GET /api/v1/projects/:id - Get project by ID
  getProjectById: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data;
  },

  // POST /api/v1/projects - Create new project
  createProject: async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
  },

  // PATCH /api/v1/projects/:id/assign-pm - Assign Project Manager
  assignPM: async (projectId, pmId) => {
    const response = await apiClient.patch(`/projects/${projectId}/assign-pm`, { pmId });
    return response.data;
  },

  // PATCH /api/v1/projects/:id/assign-site - Assign Site Incharge
  assignSite: async (projectId, siteId) => {
    const response = await apiClient.patch(`/projects/${projectId}/assign-site`, { siteId });
    return response.data;
  },

  // PATCH /api/v1/projects/:id/assign-finance - Assign Finance
  assignFinance: async (projectId, financeId) => {
    const response = await apiClient.patch(`/projects/${projectId}/assign-finance`, { financeId });
    return response.data;
  },

  // PATCH /api/v1/projects/:id/status - Update project status
  updateProjectStatus: async (projectId, status) => {
    const response = await apiClient.patch(`/projects/${projectId}/status`, { status });
    return response.data;
  },

  // DELETE /api/v1/projects/:id - Delete project
  deleteProject: async (projectId) => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response.data;
  },

  // PATCH /api/v1/projects/:id/close - Close project
  closeProject: async (projectId) => {
    const response = await apiClient.patch(`/projects/${projectId}/close`);
    return response.data;
  },

  // --- Floors ---
  getFloors: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/floors`);
    return response.data;
  },
  addFloor: async (projectId, floorName) => {
    const response = await apiClient.post(`/projects/${projectId}/floors`, { floorName });
    return response.data;
  },
  deleteFloor: async (projectId, floorId) => {
    const response = await apiClient.delete(`/projects/${projectId}/floors/${floorId}`);
    return response.data;
  },
  assignFloorSite: async (projectId, floorId, siteInchargeId) => {
    const response = await apiClient.patch(`/projects/${projectId}/floors/${floorId}/assign-site`, { siteInchargeId });
    return response.data;
  },
  updateFloorStatus: async (projectId, floorId, status, note) => {
    const response = await apiClient.patch(`/projects/${projectId}/floors/${floorId}/status`, { status, note });
    return response.data;
  },
  getFloorLogs: async (projectId, floorId) => {
    const response = await apiClient.get(`/projects/${projectId}/floors/${floorId}/logs`);
    return response.data;
  },

  // --- Ratings ---
  submitRating: async (projectId, rating, feedback) => {
    const response = await apiClient.post(`/projects/${projectId}/ratings`, { rating, feedback });
    return response.data;
  },
  getProjectRating: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/ratings`);
    return response.data;
  },
};
