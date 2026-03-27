import { asyncHandler } from '../../utils/asyncHandler.js';
import * as visitService from './service.js';

export const createVisit = asyncHandler(async (req, res) => {
  console.log('=== CREATE VISIT REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User ID:', req.user.id);
  console.log('User Role:', req.user.role);
  
  const visit = await visitService.createVisit(req.body, req.user.id);

  console.log('Visit created successfully:', visit.id);
  
  res.status(201).json({
    success: true,
    message: 'Visit scheduled successfully',
    data: { visit }
  });
});

export const getVisitsByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const visits = await visitService.getVisitsByProject(projectId, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Visits retrieved successfully',
    data: { visits }
  });
});

export const rejectVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('=== REJECT VISIT REQUEST ===');
  console.log('Visit ID:', id);
  console.log('User ID:', req.user.id);
  console.log('User Role:', req.user.role);
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Body Keys:', Object.keys(req.body));
  console.log('rejectionReason:', req.body.rejectionReason);
  console.log('rejectionDescription:', req.body.rejectionDescription);
  
  const { rejectionReason, rejectionDescription } = req.body;

  // Manual validation
  if (!rejectionReason || rejectionReason.trim().length < 3) {
    console.log('❌ Validation failed: rejectionReason');
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Rejection reason must be at least 3 characters']
    });
  }

  if (!rejectionDescription || rejectionDescription.trim().length < 10) {
    console.log('❌ Validation failed: rejectionDescription');
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Rejection description must be at least 10 characters']
    });
  }

  console.log('✅ Validation passed');

  const visit = await visitService.rejectVisit(
    id, 
    { rejectionReason, rejectionDescription }, 
    req.user.role, 
    req.user.id
  );

  console.log('Visit rejected successfully:', visit.id);

  res.status(200).json({
    success: true,
    message: 'Visit rejected successfully',
    data: { visit }
  });
});

export const completeVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const visit = await visitService.completeVisit(id, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Visit marked as completed successfully',
    data: { visit }
  });
});
