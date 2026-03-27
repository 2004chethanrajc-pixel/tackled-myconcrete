import apiClient from '../../services/apiClient';

export const authApi = {
  login: async (identifier, password, forceLogout = false) => {
    const response = await apiClient.post('/auth/login', {
      identifier,
      password,
      forceLogout,
    });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  signup: async (userData) => {
    const response = await apiClient.post('/auth/signup', userData);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};
