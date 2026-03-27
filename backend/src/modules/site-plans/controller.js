import * as sitePlanService from './service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

export const uploadSitePlan = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const uploadedBy = req.user.id;
  
  console.log('=== SITE PLAN UPLOAD REQUEST ===');
  console.log('Project ID:', projectId);
  console.log('Uploaded by:', uploadedBy);
  console.log('Has file:', !!req.file);
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  if (req.file) {
    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      destination: req.file.destination
    });
  }
  
  if (!req.file) {
    console.error('No file in request!');
    throw new ApiError(400, 'No file uploaded');
  }
  
  // Validate file type (PDF only)
  if (req.file.mimetype !== 'application/pdf') {
    console.error('Invalid file type:', req.file.mimetype);
    throw new ApiError(400, 'Only PDF files are allowed');
  }
  
  console.log('Calling service to save to database...');
  const sitePlan = await sitePlanService.uploadSitePlan(projectId, uploadedBy, req.file);
  
  console.log('Site plan uploaded successfully:', sitePlan);
  console.log('=== UPLOAD COMPLETE ===');
  
  res.status(201).json({
    success: true,
    message: 'Site plan uploaded successfully',
    data: { sitePlan },
  });
});

export const getSitePlansByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  const sitePlans = await sitePlanService.getSitePlansByProject(projectId);
  
  res.status(200).json({
    success: true,
    data: { sitePlans },
  });
});

export const deleteSitePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  const result = await sitePlanService.deleteSitePlan(planId, userId, userRole);
  
  res.status(200).json({
    success: true,
    message: result.message,
  });
});
