import { asyncHandler } from '../../utils/asyncHandler.js';
import * as userService from './service.js';

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(
    req.body,
    req.user.role,
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user }
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const users = await userService.getAllUsers(role || null);

  res.status(200).json({
    success: true,
    message: 'Users retrieved successfully',
    data: { users }
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUserById(
    id,
    req.user.role,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: { user }
  });
});

export const updateUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await userService.updateUserDetails(id, req.body, req.user.role, req.user.id);
  res.status(200).json({ success: true, message: 'User details updated successfully', data: { user } });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await userService.updateUserRole(
    id,
    role,
    req.user.role,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: { user }
  });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const user = await userService.deactivateUser(
    id,
    reason,
    req.user.role,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
    data: { user }
  });
});

export const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await userService.activateUser(
    id,
    req.user.role,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'User activated successfully',
    data: { user }
  });
});

export const getSessionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await userService.getSessionStatus(id);
  res.status(200).json({ success: true, data: result });
});

export const forceLogoutUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await userService.forceLogoutUser(id, req.user.role, req.user.id);
  res.status(200).json({
    success: true,
    message: `User logged out from all devices (${result.deletedSessions} session(s) cleared)`,
    data: result
  });
});
