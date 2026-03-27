import { asyncHandler } from '../../utils/asyncHandler.js';
import * as reportService from './service.js';

export const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No images uploaded'
    });
  }

  // Return the file paths
  const imagePaths = req.files.map(file => `/uploads/${file.filename}`);

  res.status(200).json({
    success: true,
    message: 'Images uploaded successfully',
    data: { images: imagePaths }
  });
});

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Site report submitted successfully',
    data: { report }
  });
});

export const getReportsByProjectBeforeApproving = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const reports = await reportService.getReportsByProjectBeforeApproving(projectId, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Reports retrieved successfully',
    data: { reports }
  });
});

export const getReportsByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const reports = await reportService.getReportsByProject(projectId, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Reports retrieved successfully',
    data: { reports }
  });
});

export const getFinalProjectReport = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const report = await reportService.generateFinalProjectReport(projectId, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Final project report generated',
    data: report
  });
});

export const getAllReports = asyncHandler(async (req, res) => {
  const reports = await reportService.getAllReports(req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'All reports retrieved successfully',
    data: { reports }
  });
});
