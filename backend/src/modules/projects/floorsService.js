import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';

const FLOOR_SELECT = `
  SELECT pf.id, pf.floor_name, pf.site_incharge_id, pf.status,
         pf.status_updated_at, pf.created_at,
         u.name as site_incharge_name, u.email as site_incharge_email, u.phone as site_incharge_phone,
         ub.name as status_updated_by_name
  FROM project_floors pf
  LEFT JOIN users u ON pf.site_incharge_id = u.id
  LEFT JOIN users ub ON pf.status_updated_by = ub.id
`;

// Admin: add a floor to a project
export const addFloor = async (projectId, floorName, creatorId) => {
  const db = getDB();
  const [projects] = await db.execute('SELECT id, name FROM projects WHERE id = ?', [projectId]);
  if (projects.length === 0) throw new ApiError(404, 'Project not found');

  const floorId = uuidv4();
  await db.execute(
    'INSERT INTO project_floors (id, project_id, floor_name, created_by, created_at) VALUES (?, ?, ?, ?, NOW())',
    [floorId, projectId, floorName.trim(), creatorId]
  );
  await logAudit('ADD_FLOOR', creatorId, projectId, `Added floor "${floorName}" to project ${projects[0].name}`);

  const [floors] = await db.execute(FLOOR_SELECT + ' WHERE pf.id = ?', [floorId]);
  return floors[0];
};

// Admin: delete a floor
export const deleteFloor = async (projectId, floorId, userId) => {
  const db = getDB();
  const [rows] = await db.execute('SELECT id, floor_name FROM project_floors WHERE id = ? AND project_id = ?', [floorId, projectId]);
  if (rows.length === 0) throw new ApiError(404, 'Floor not found');
  const floorName = rows[0].floor_name;
  await db.execute('DELETE FROM project_floors WHERE id = ?', [floorId]);
  await logAudit('DELETE_FLOOR', userId, projectId, `Deleted floor "${floorName}"`);
  return { message: 'Floor deleted' };
};

// Get all floors for a project
export const getFloors = async (projectId) => {
  const db = getDB();
  const [floors] = await db.execute(
    FLOOR_SELECT + ' WHERE pf.project_id = ? ORDER BY pf.created_at ASC',
    [projectId]
  );
  return floors;
};

// PM: assign site incharge to a floor
export const assignFloorSiteIncharge = async (projectId, floorId, siteInchargeId, pmId) => {
  const db = getDB();
  const [projects] = await db.execute('SELECT id, pm_id, name FROM projects WHERE id = ?', [projectId]);
  if (projects.length === 0) throw new ApiError(404, 'Project not found');
  if (projects[0].pm_id !== pmId) throw new ApiError(403, 'You are not the Project Manager for this project');

  const [floors] = await db.execute('SELECT id, floor_name FROM project_floors WHERE id = ? AND project_id = ?', [floorId, projectId]);
  if (floors.length === 0) throw new ApiError(404, 'Floor not found');

  const [users] = await db.execute('SELECT id, role, is_active, name FROM users WHERE id = ?', [siteInchargeId]);
  if (users.length === 0) throw new ApiError(404, 'User not found');
  if (users[0].role !== 'site_incharge') throw new ApiError(400, 'User is not a site incharge');
  if (!users[0].is_active) throw new ApiError(400, 'Site incharge account is inactive');

  await db.execute('UPDATE project_floors SET site_incharge_id = ? WHERE id = ?', [siteInchargeId, floorId]);
  await logAudit('ASSIGN_FLOOR_SITE', pmId, projectId, `Assigned site incharge "${users[0].name}" to floor "${floors[0].floor_name}" in project ${projects[0].name}`);

  const [updated] = await db.execute(FLOOR_SELECT + ' WHERE pf.id = ?', [floorId]);
  return updated[0];
};

// Site incharge or admin: update floor status
const VALID_TRANSITIONS = {
  pending:   ['started'],
  started:   ['paused', 'completed'],
  paused:    ['resumed'],
  resumed:   ['paused', 'completed'],
  completed: [],
};

export const updateFloorStatus = async (projectId, floorId, newStatus, note, userId, userRole) => {
  const db = getDB();

  const [floors] = await db.execute(
    'SELECT pf.*, p.pm_id FROM project_floors pf JOIN projects p ON pf.project_id = p.id WHERE pf.id = ? AND pf.project_id = ?',
    [floorId, projectId]
  );
  if (floors.length === 0) throw new ApiError(404, 'Floor not found');
  const floor = floors[0];

  // Permission check
  const isAdmin = ['admin', 'super_admin'].includes(userRole);
  const isSiteIncharge = userRole === 'site_incharge' && floor.site_incharge_id === userId;
  if (!isAdmin && !isSiteIncharge) throw new ApiError(403, 'Not authorised to update this floor status');

  // Transition check
  const allowed = VALID_TRANSITIONS[floor.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(400, `Cannot transition from "${floor.status}" to "${newStatus}"`);
  }

  await db.execute(
    'UPDATE project_floors SET status = ?, status_updated_at = NOW(), status_updated_by = ? WHERE id = ?',
    [newStatus, userId, floorId]
  );

  // Log entry
  const logId = uuidv4();
  await db.execute(
    'INSERT INTO project_floor_logs (id, floor_id, project_id, status, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [logId, floorId, projectId, newStatus, note || null, userId]
  );

  await logAudit('UPDATE_FLOOR_STATUS', userId, projectId, `Floor "${floor.floor_name}" status changed to "${newStatus}"`);

  const [updated] = await db.execute(FLOOR_SELECT + ' WHERE pf.id = ?', [floorId]);
  return updated[0];
};

// Get logs for a floor
export const getFloorLogs = async (projectId, floorId) => {
  const db = getDB();
  const [floors] = await db.execute('SELECT id FROM project_floors WHERE id = ? AND project_id = ?', [floorId, projectId]);
  if (floors.length === 0) throw new ApiError(404, 'Floor not found');

  const [logs] = await db.execute(
    `SELECT fl.id, fl.status, fl.note, fl.created_at,
            u.name as created_by_name, u.role as created_by_role
     FROM project_floor_logs fl
     JOIN users u ON fl.created_by = u.id
     WHERE fl.floor_id = ?
     ORDER BY fl.created_at DESC`,
    [floorId]
  );
  return logs;
};
