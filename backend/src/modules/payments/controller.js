import { asyncHandler } from '../../utils/asyncHandler.js';
import * as paymentService from './service.js';

export const createPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.createPayment(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Payment created successfully',
    data: { payment }
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await paymentService.verifyPayment(id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    data: { payment }
  });
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { payment, quotation } = await paymentService.getPaymentById(id, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Payment retrieved successfully',
    data: { 
      payment,
      quotation
    }
  });
});

export const getPaymentsByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const payments = await paymentService.getPaymentsByProject(projectId, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Payments retrieved successfully',
    data: { payments }
  });
});


export const createExtraCharge = asyncHandler(async (req, res) => {
  const payment = await paymentService.createExtraCharge(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Extra charge created successfully',
    data: { payment }
  });
});


export const payExtraCharge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await paymentService.payExtraCharge(id, req.body, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Extra charge payment submitted successfully',
    data: { payment }
  });
});
