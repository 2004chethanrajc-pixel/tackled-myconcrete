import { asyncHandler } from '../../utils/asyncHandler.js';
import * as floorsService from './floorsService.js';

export const getFloors = asyncHandler(async (req, res) => {
  const floors = await floorsService.getFloors(req.params.id);
  res.json({ success: true, data: { floors } });
});

export const addFloor = asyncHandler(async (req, res) => {
  const floor = await floorsService.addFloor(req.params.id, req.body.floorName, req.user.id);
  res.status(201).json({ success: true, data: { floor } });
});

export const deleteFloor = asyncHandler(async (req, res) => {
  const result = await floorsService.deleteFloor(req.params.id, req.params.floorId, req.user.id);
  res.json({ success: true, message: result.message });
});

export const assignFloorSite = asyncHandler(async (req, res) => {
  const floor = await floorsService.assignFloorSiteIncharge(
    req.params.id, req.params.floorId, req.body.siteInchargeId, req.user.id
  );
  res.json({ success: true, data: { floor } });
});

export const updateFloorStatus = asyncHandler(async (req, res) => {
  const floor = await floorsService.updateFloorStatus(
    req.params.id, req.params.floorId,
    req.body.status, req.body.note,
    req.user.id, req.user.role
  );
  res.json({ success: true, data: { floor } });
});

export const getFloorLogs = asyncHandler(async (req, res) => {
  const logs = await floorsService.getFloorLogs(req.params.id, req.params.floorId);
  res.json({ success: true, data: { logs } });
});
