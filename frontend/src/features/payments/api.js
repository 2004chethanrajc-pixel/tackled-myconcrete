import apiClient from '../../services/apiClient';

export const paymentsApi = {
  // POST /api/v1/payments - Create payment
  createPayment: async (paymentData) => {
    const response = await apiClient.post('/payments', paymentData);
    return response.data;
  },

  // POST /api/v1/payments/extra-charge - Create extra charge (Finance only)
  createExtraCharge: async (chargeData) => {
    const response = await apiClient.post('/payments/extra-charge', chargeData);
    return response.data;
  },

  // PATCH /api/v1/payments/:id/pay-extra - Pay extra charge (Customer only)
  payExtraCharge: async (paymentId, paymentData) => {
    const response = await apiClient.patch(`/payments/${paymentId}/pay-extra`, paymentData);
    return response.data;
  },

  // GET /api/v1/payments/:id - Get payment by ID
  getPaymentById: async (paymentId) => {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data;
  },

  // GET /api/v1/payments/project/:projectId - Get payments by project
  getPaymentsByProject: async (projectId) => {
    const response = await apiClient.get(`/payments/project/${projectId}`);
    return response.data;
  },

  // PATCH /api/v1/payments/:id/verify - Verify payment
  verifyPayment: async (paymentId) => {
    const response = await apiClient.patch(`/payments/${paymentId}/verify`);
    return response.data;
  },
};
