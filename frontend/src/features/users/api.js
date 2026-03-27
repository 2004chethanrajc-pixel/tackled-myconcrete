import apiClient from '../../services/apiClient';

export const usersApi = {
  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  updateUserDetails: async (userId, details) => {
    const response = await apiClient.patch(`/users/${userId}/details`, details);
    return response.data;
  },

  deactivateUser: async (userId, reason) => {
    const response = await apiClient.patch(`/users/${userId}/deactivate`, { reason });
    return response.data;
  },

  activateUser: async (userId) => {
    const response = await apiClient.patch(`/users/${userId}/activate`);
    return response.data;
  },
};
