import { asyncHandler } from '../../utils/asyncHandler.js';
import * as projectService from './service.js';

export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body, req.user.id);

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: { project }
  });
});

export const getAllProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getAllProjects(req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Projects retrieved successfully',
    data: { projects }
  });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await projectService.getProjectById(id, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Project retrieved successfully',
    data: { project }
  });
});

export const assignProjectManager = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pmId } = req.body;

  const project = await projectService.assignProjectManager(id, pmId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Project Manager assigned successfully',
    data: { project }
  });
});

export const assignSiteIncharge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { siteId } = req.body;

  const project = await projectService.assignSiteIncharge(id, siteId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Site Incharge assigned successfully',
    data: { project }
  });
});

export const assignFinance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { financeId } = req.body;

  const project = await projectService.assignFinance(id, financeId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Finance assigned successfully',
    data: { project }
  });
});

export const updateProjectStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const project = await projectService.updateProjectStatus(id, status, req.user.role, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Project status updated successfully',
    data: { project }
  });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await projectService.deleteProject(id, req.user.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});
