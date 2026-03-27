import apiClient from '../../services/apiClient';

export const auditApi = {
  // GET /api/v1/audit - Get audit logs (super_admin only)
  getAuditLogs: async (limit = 50, page = 1, excludeLogin = false) => {
    const response = await apiClient.get('/audit', {
      params: { limit, page, excludeLogin },
    });
    return response.data;
  },

  // POST /api/v1/audit/log-share - Log a share/export event
  logShare: async (format, resource_type, resource_id, resource_name) => {
    try {
      await apiClient.post('/audit/log-share', { format, resource_type, resource_id, resource_name });
    } catch (e) {
      // Non-critical — don't block the download
      console.warn('Failed to log share event:', e.message);
    }
  },
};
