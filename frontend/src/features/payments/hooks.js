import { useState } from 'react';
import { paymentsApi } from './api';

export const useCreatePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPayment = async (paymentData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentsApi.createPayment(paymentData);
      return response.data.payment;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createPayment, loading, error };
};

export const useVerifyPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const verifyPayment = async (paymentId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentsApi.verifyPayment(paymentId);
      return response.data.payment;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to verify payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { verifyPayment, loading, error };
};

export const useProjectPayments = (projectId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentsApi.getPaymentsByProject(projectId);
      return response.data.payments;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch payments';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { fetchPayments, loading, error };
};
