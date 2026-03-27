import { asyncHandler } from '../../utils/asyncHandler.js';
import * as signatureService from './service.js';

export const uploadSignature = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { signatureType } = req.body;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Signature file is required'
    });
  }

  const signature = await signatureService.uploadSignature(
    projectId,
    req.user.id,
    req.file,
    signatureType || 'uploaded'
  );

  res.status(201).json({
    success: true,
    message: 'Signature uploaded successfully',
    data: { signature }
  });
});

export const getSignature = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const signature = await signatureService.getSignatureByProject(
    projectId,
    req.user.id,
    req.user.role
  );

  if (!signature) {
    return res.status(404).json({
      success: false,
      message: 'No signature found for this project'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Signature retrieved successfully',
    data: { signature }
  });
});

export const deleteSignature = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const result = await signatureService.deleteSignature(
    projectId,
    req.user.id,
    req.user.role
  );

  res.status(200).json({
    success: true,
    message: result.message
  });
});
