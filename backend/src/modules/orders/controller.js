import { asyncHandler } from '../../utils/asyncHandler.js';
import * as orderService from './service.js';

export const getOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getOrders(req.user.role, req.user.id);
  res.json({ success: true, data: { orders } });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user.role, req.user.id);
  res.json({ success: true, data: { order } });
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body, req.user.id, req.user.role);
  res.status(201).json({ success: true, message: 'Order created successfully', data: { order } });
});

export const approveOrder = asyncHandler(async (req, res) => {
  const order = await orderService.approveOrder(req.params.id, req.body, req.user.id);
  res.json({ success: true, message: 'Order approved', data: { order } });
});

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(req.params.id, req.body, req.user.id, req.user.role);
  res.json({ success: true, message: 'Order updated successfully', data: { order } });
});

export const payAdvance = asyncHandler(async (req, res) => {
  const order = await orderService.payAdvance(req.params.id, req.body, req.user.id);
  res.json({ success: true, message: 'Advance payment recorded', data: { order } });
});

export const payBalance = asyncHandler(async (req, res) => {
  const order = await orderService.payBalance(req.params.id, req.body, req.user.id);
  res.json({ success: true, message: 'Balance payment recorded', data: { order } });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentType } = req.params; // 'advance' or 'balance'
  const order = await orderService.verifyPayment(req.params.id, paymentType, req.user.id);
  res.json({ success: true, message: `${paymentType} payment verified`, data: { order } });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user.id, req.user.role);
  res.json({ success: true, message: 'Order cancelled', data: { order } });
});
