import { useState, useEffect, useCallback } from 'react';
import { ordersApi } from './api';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ordersApi.getOrders();
      setOrders(res.data.data?.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
};

export const useOrderActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async (fn) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fn();
      return res.data.data?.order || res.data.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Action failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createOrder: (data) => run(() => ordersApi.createOrder(data)),
    approveOrder: (id, data) => run(() => ordersApi.approveOrder(id, data)),
    updateOrder: (id, data) => run(() => ordersApi.updateOrder(id, data)),
    payAdvance: (id, data) => run(() => ordersApi.payAdvance(id, data)),
    payBalance: (id, data) => run(() => ordersApi.payBalance(id, data)),
    verifyPayment: (id, type) => run(() => ordersApi.verifyPayment(id, type)),
    cancelOrder: (id) => run(() => ordersApi.cancelOrder(id)),
  };
};
