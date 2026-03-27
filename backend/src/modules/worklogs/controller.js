import { asyncHandler } from '../../utils/asyncHandler.js';
import * as worklogService from './service.js';

export const createWorklog = asyncHandler(async (req, res) => {
  const worklog = await worklogService.createWorklog(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Work log created successfully',
    data: { worklog }
  });
});

export const addWorklogImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('=== WORKLOG IMAGE UPLOAD DEBUG ===');
  console.log('Worklog ID:', id);
  console.log('Files received:', req.files?.length || 0);
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  if (!req.files || req.files.length === 0) {
    console.log('❌ No files received');
    return res.status(400).json({
      success: false,
      message: 'No images uploaded'
    });
  }

  console.log('✅ Files received:', req.files.map(f => ({ 
    filename: f.filename, 
    originalname: f.originalname,
    size: f.size,
    mimetype: f.mimetype 
  })));

  // Get the file paths from uploaded files
  const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
  console.log('Generated image paths:', imagePaths);

  const worklog = await worklogService.addWorklogImages(id, imagePaths, req.user.id);

  console.log('✅ Images added successfully to worklog');

  res.status(200).json({
    success: true,
    message: 'Images added to work log successfully',
    data: { worklog }
  });
});

export const removeWorklogImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { imagePath } = req.body;
  
  console.log('=== WORKLOG IMAGE REMOVAL DEBUG ===');
  console.log('Worklog ID:', id);
  console.log('Image path to remove:', imagePath);
  
  if (!imagePath) {
    return res.status(400).json({
      success: false,
      message: 'Image path is required'
    });
  }

  const result = await worklogService.removeWorklogImage(id, imagePath, req.user.id);

  console.log('✅ Image removed successfully from worklog');

  res.status(200).json({
    success: true,
    message: 'Image removed from work log successfully',
    data: result
  });
});

export const getWorklogsByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const worklogs = await worklogService.getWorklogsByProject(projectId, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Work logs retrieved successfully',
    data: { worklogs }
  });
});
