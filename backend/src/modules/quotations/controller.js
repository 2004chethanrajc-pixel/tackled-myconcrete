import { asyncHandler } from '../../utils/asyncHandler.js';
import * as quotationService from './service.js';

export const createQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationService.createQuotation(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Quotation generated successfully',
    data: { quotation }
  });
});

export const getQuotationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await quotationService.getQuotationById(id, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Quotation retrieved successfully',
    data: result
  });
});

export const approveQuotation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quotation = await quotationService.approveQuotation(id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Quotation approved successfully',
    data: { quotation }
  });
});

export const getQuotationsByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const quotations = await quotationService.getQuotationsByProject(projectId, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Quotations retrieved successfully',
    data: { quotations }
  });
});
