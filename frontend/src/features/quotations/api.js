import apiClient from '../../services/apiClient';

export const quotationsApi = {
  // POST /api/v1/quotations - Generate quotation
  generateQuotation: async (quotationData) => {
    const response = await apiClient.post('/quotations', quotationData);
    return response.data;
  },

  // GET /api/v1/quotations/:id - Get quotation by ID
  getQuotationById: async (quotationId) => {
    const response = await apiClient.get(`/quotations/${quotationId}`);
    return response.data;
  },

  // GET /api/v1/quotations/project/:projectId - Get quotations by project
  getQuotationsByProject: async (projectId) => {
    const response = await apiClient.get(`/quotations/project/${projectId}`);
    return response.data;
  },

  // GET /api/v1/quotations/project/:projectId - Get quotation by project (single)
  getQuotationByProject: async (projectId) => {
    const response = await apiClient.get(`/quotations/project/${projectId}`);
    // Return first quotation if exists
    if (response.data.data.quotations && response.data.data.quotations.length > 0) {
      return { data: { quotation: response.data.data.quotations[0] } };
    }
    throw new Error('No quotation found for this project');
  },

  // PATCH /api/v1/quotations/:id/approve - Approve quotation
  approveQuotation: async (quotationId) => {
    const response = await apiClient.patch(`/quotations/${quotationId}/approve`);
    return response.data;
  },
};
