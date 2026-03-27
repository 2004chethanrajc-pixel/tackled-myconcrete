import apiClient from '../../services/apiClient';

export const ordersApi = {
  getOrders: () => apiClient.get('/orders'),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  createOrder: (data) => apiClient.post('/orders', data),
  approveOrder: (id, data) => apiClient.post(`/orders/${id}/approve`, data),
  updateOrder: (id, data) => apiClient.patch(`/orders/${id}`, data),
  payAdvance: (id, data) => apiClient.post(`/orders/${id}/pay-advance`, data),
  payBalance: (id, data) => apiClient.post(`/orders/${id}/pay-balance`, data),
  verifyPayment: (id, paymentType) => apiClient.post(`/orders/${id}/verify/${paymentType}`),
  cancelOrder: (id) => apiClient.patch(`/orders/${id}/cancel`),
};
