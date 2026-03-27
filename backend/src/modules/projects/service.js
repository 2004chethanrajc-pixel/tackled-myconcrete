import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import { validateStatusTransition } from '../../utils/statusTransition.js';
import * as notificationService from '../../services/notificationService.js';

export const createProject = async (projectData, creatorId) => {
  const { name, location, customerId, pmId } = projectData;
  const db = getDB();

  // Verify customer exists and has customer role
  const [customers] = await db.execute(
    'SELECT id, role, is_active FROM users WHERE id = ?',
    [customerId]
  );

  if (customers.length === 0) {
    throw new ApiError(404, 'Customer not found');
  }

  const customer = customers[0];

  if (customer.role !== 'customer') {
    throw new ApiError(400, 'User is not a customer');
  }

  if (!customer.is_active) {
    throw new ApiError(400, 'Customer account is inactive');
  }

  // If PM is provided, verify PM exists and has project_manager role
  if (pmId) {
    const [pms] = await db.execute(
      'SELECT id, role, is_active FROM users WHERE id = ?',
      [pmId]
    );

    if (pms.length === 0) {
      throw new ApiError(404, 'Project Manager not found');
    }

    const pm = pms[0];

    if (pm.role !== 'project_manager') {
      throw new ApiError(400, 'User is not a project manager');
    }

    if (!pm.is_active) {
      throw new ApiError(400, 'Project Manager account is inactive');
    }
  }

  // Create project with optional PM assignment
  const projectId = uuidv4();
  const status = pmId ? 'PM_ASSIGNED' : 'CREATED';
  
  await db.execute(
    `INSERT INTO projects (id, customer_id, pm_id, name, location, status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [projectId, customerId, pmId || null, name, location, status]
  );

  // Log action
  await logAudit('CREATE_PROJECT', creatorId, projectId, `Created project ${name} for customer ${customerId}${pmId ? ` with PM ${pmId}` : ''}`);

  // Send notification if PM was assigned during creation
  if (pmId) {
    try {
      await notificationService.notifyPMAssigned(pmId, name, projectId);
    } catch (error) {
      console.error('Error sending PM assignment notification:', error);
    }
  }

  // Fetch created project
  const [projects] = await db.execute(
    'SELECT id, customer_id, pm_id, site_id, finance_id, name, location, status, created_at FROM projects WHERE id = ?',
    [projectId]
  );

  return projects[0];
};

export const getAllProjects = async (userRole, userId) => {
  const db = getDB();
  let query = `
    SELECT 
      p.id, 
      p.customer_id, 
      p.pm_id, 
      p.site_id, 
      p.finance_id, 
      p.name, 
      p.location, 
      p.status, 
      p.created_at,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      pm.name as pm_name,
      pm.email as pm_email,
      si.name as site_name,
      si.email as site_email,
      f.name as finance_name,
      f.email as finance_email
    FROM projects p
    LEFT JOIN users c ON p.customer_id = c.id
    LEFT JOIN users pm ON p.pm_id = pm.id
    LEFT JOIN users si ON p.site_id = si.id
    LEFT JOIN users f ON p.finance_id = f.id
  `;
  let params = [];

  // Role-based filtering
  if (userRole === 'super_admin' || userRole === 'admin') {
    // No filter - see all projects
  } else if (userRole === 'project_manager') {
    query += ' WHERE p.pm_id = ?';
    params.push(userId);
  } else if (userRole === 'site_incharge') {
    // Site incharge can see projects where they are the project-level site incharge
    // OR where they are assigned to at least one floor
    query += ` WHERE (p.site_id = ? OR p.id IN (
      SELECT DISTINCT pf.project_id FROM project_floors pf WHERE pf.site_incharge_id = ?
    ))`;
    params.push(userId, userId);
  } else if (userRole === 'customer') {
    query += ' WHERE p.customer_id = ?';
    params.push(userId);
  } else if (userRole === 'finance') {
    query += ' WHERE p.finance_id = ?';
    params.push(userId);
  } else {
    // Unknown role - return empty
    return [];
  }

  query += ' ORDER BY p.created_at DESC';

  const [projects] = await db.execute(query, params);
  return projects;
};

export const getProjectById = async (projectId, userRole, userId) => {
  const db = getDB();

  // Fetch project with user names
  const [projects] = await db.execute(
    `SELECT 
      p.id, 
      p.customer_id, 
      p.pm_id, 
      p.site_id, 
      p.finance_id, 
      p.name, 
      p.location, 
      p.status, 
      p.created_at,
      c.name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      pm.name as pm_name,
      pm.email as pm_email,
      pm.phone as pm_phone,
      si.name as site_name,
      si.email as site_email,
      si.phone as site_phone,
      f.name as finance_name,
      f.email as finance_email,
      f.phone as finance_phone
    FROM projects p
    LEFT JOIN users c ON p.customer_id = c.id
    LEFT JOIN users pm ON p.pm_id = pm.id
    LEFT JOIN users si ON p.site_id = si.id
    LEFT JOIN users f ON p.finance_id = f.id
    WHERE p.id = ?`,
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Role-based access control
  if (userRole === 'super_admin' || userRole === 'admin') {
    // Can see all projects
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view your assigned projects');
    }
  } else if (userRole === 'site_incharge') {
    if (project.site_id !== userId) {
      // Check if assigned to any floor in this project
      const [floorRows] = await db.execute(
        'SELECT id FROM project_floors WHERE project_id = ? AND site_incharge_id = ? LIMIT 1',
        [projectId, userId]
      );
      if (floorRows.length === 0) {
        throw new ApiError(403, 'You can only view your assigned projects');
      }
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view your projects');
    }
  } else if (userRole === 'finance') {
    if (project.finance_id !== userId) {
      throw new ApiError(403, 'You can only view your assigned projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view this project');
  }

  return project;
};

export const assignProjectManager = async (projectId, pmId, assignerId) => {
  const db = getDB();

  // Fetch project
  const [projects] = await db.execute(
    'SELECT id, name, status, pm_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Check if PM already assigned
  if (project.pm_id) {
    throw new ApiError(400, 'Project Manager already assigned to this project');
  }

  // Verify PM exists and has project_manager role
  const [pms] = await db.execute(
    'SELECT id, role, is_active FROM users WHERE id = ?',
    [pmId]
  );

  if (pms.length === 0) {
    throw new ApiError(404, 'Project Manager not found');
  }

  const pm = pms[0];

  if (pm.role !== 'project_manager') {
    throw new ApiError(400, 'User is not a project manager');
  }

  if (!pm.is_active) {
    throw new ApiError(400, 'Project Manager account is inactive');
  }

  // Validate status transition: CREATED → PM_ASSIGNED
  const transition = validateStatusTransition(project.status, 'PM_ASSIGNED', 'admin');
  
  if (!transition.valid) {
    throw new ApiError(400, transition.message);
  }

  // Update project
  await db.execute(
    'UPDATE projects SET pm_id = ?, status = ? WHERE id = ?',
    [pmId, 'PM_ASSIGNED', projectId]
  );

  // Log action
  await logAudit('ASSIGN_PM', assignerId, projectId, `Assigned PM ${pmId} to project ${project.name}`);

  // Send notification to PM
  try {
    await notificationService.notifyPMAssigned(pmId, project.name, projectId);
  } catch (error) {
    console.error('Error sending PM assignment notification:', error);
  }

  // Fetch updated project
  const [updatedProjects] = await db.execute(
    'SELECT id, customer_id, pm_id, site_id, finance_id, name, location, status, created_at FROM projects WHERE id = ?',
    [projectId]
  );

  return updatedProjects[0];
};

export const assignSiteIncharge = async (projectId, siteId, assignerId) => {
  const db = getDB();

  // Fetch project
  const [projects] = await db.execute(
    'SELECT id, name, status, pm_id, site_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Check if PM is assigned
  if (!project.pm_id) {
    throw new ApiError(400, 'Cannot assign Site Incharge before Project Manager is assigned');
  }

  // Check if site already assigned
  if (project.site_id) {
    throw new ApiError(400, 'Site Incharge already assigned to this project');
  }

  // Verify site incharge exists and has site_incharge role
  const [sites] = await db.execute(
    'SELECT id, role, is_active FROM users WHERE id = ?',
    [siteId]
  );

  if (sites.length === 0) {
    throw new ApiError(404, 'Site Incharge not found');
  }

  const site = sites[0];

  if (site.role !== 'site_incharge') {
    throw new ApiError(400, 'User is not a site incharge');
  }

  if (!site.is_active) {
    throw new ApiError(400, 'Site Incharge account is inactive');
  }

  // Update project (no status change)
  await db.execute(
    'UPDATE projects SET site_id = ? WHERE id = ?',
    [siteId, projectId]
  );

  // Log action
  await logAudit('ASSIGN_SITE', assignerId, projectId, `Assigned Site Incharge ${siteId} to project ${project.name}`);

  // Send notification to Site Incharge
  try {
    await notificationService.notifySiteAssigned(siteId, project.name, projectId);
  } catch (error) {
    console.error('Error sending site assignment notification:', error);
  }

  // Fetch updated project
  const [updatedProjects] = await db.execute(
    'SELECT id, customer_id, pm_id, site_id, finance_id, name, location, status, created_at FROM projects WHERE id = ?',
    [projectId]
  );

  return updatedProjects[0];
};

export const assignFinance = async (projectId, financeId, assignerId) => {
  const db = getDB();

  // Fetch project
  const [projects] = await db.execute(
    'SELECT id, name, status, finance_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Check if finance already assigned
  if (project.finance_id) {
    throw new ApiError(400, 'Finance already assigned to this project');
  }

  // Verify finance user exists and has finance role
  const [financeUsers] = await db.execute(
    'SELECT id, role, is_active FROM users WHERE id = ?',
    [financeId]
  );

  if (financeUsers.length === 0) {
    throw new ApiError(404, 'Finance user not found');
  }

  const financeUser = financeUsers[0];

  if (financeUser.role !== 'finance') {
    throw new ApiError(400, 'User is not a finance user');
  }

  if (!financeUser.is_active) {
    throw new ApiError(400, 'Finance user account is inactive');
  }

  // Update project (no status change)
  await db.execute(
    'UPDATE projects SET finance_id = ? WHERE id = ?',
    [financeId, projectId]
  );

  // Log action
  await logAudit('ASSIGN_FINANCE', assignerId, projectId, `Assigned Finance ${financeId} to project ${project.name}`);

  // Send notification to Finance
  try {
    await notificationService.notifyFinanceAssigned(financeId, project.name, projectId);
  } catch (error) {
    console.error('Error sending finance assignment notification:', error);
  }

  // Fetch updated project
  const [updatedProjects] = await db.execute(
    'SELECT id, customer_id, pm_id, site_id, finance_id, name, location, status, created_at FROM projects WHERE id = ?',
    [projectId]
  );

  return updatedProjects[0];
};

export const updateProjectStatus = async (projectId, newStatus, userRole, userId) => {
  const db = getDB();

  // Fetch project
  const [projects] = await db.execute(
    'SELECT id, name, status FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Check if already at requested status
  if (project.status === newStatus) {
    throw new ApiError(400, `Project is already in ${newStatus} status`);
  }

  // Special validation for VISIT_DONE transition
  if (newStatus === 'VISIT_DONE') {
    // Check if at least one visit exists and is completed
    const [visits] = await db.execute(
      'SELECT id, status FROM visits WHERE project_id = ?',
      [projectId]
    );

    if (visits.length === 0) {
      throw new ApiError(400, 'Visit must be completed before marking VISIT_DONE');
    }

    const hasCompletedVisit = visits.some(visit => visit.status === 'completed');
    if (!hasCompletedVisit) {
      throw new ApiError(400, 'Visit must be completed before marking VISIT_DONE');
    }
  }

  // Validate status transition
  const transition = validateStatusTransition(project.status, newStatus, userRole);
  
  if (!transition.valid) {
    throw new ApiError(403, transition.message);
  }

  // Update status
  await db.execute(
    'UPDATE projects SET status = ? WHERE id = ?',
    [newStatus, projectId]
  );

  // Log action
  await logAudit('STATUS_CHANGE', userId, projectId, `Changed project ${project.name} status from ${project.status} to ${newStatus}`);

  // Send status change notification to all stakeholders
  try {
    await notificationService.notifyStatusChange(projectId, project.name, newStatus);
    
    // Send specific notifications for project completion and closure
    if (newStatus === 'COMPLETED') {
      await notificationService.notifyProjectCompleted(projectId, project.name);
    } else if (newStatus === 'CLOSED') {
      await notificationService.notifyProjectClosed(projectId, project.name);
    }
  } catch (error) {
    console.error('Error sending status change notification:', error);
  }

  // Fetch updated project
  const [updatedProjects] = await db.execute(
    'SELECT id, customer_id, pm_id, site_id, finance_id, name, location, status, created_at FROM projects WHERE id = ?',
    [projectId]
  );

  return updatedProjects[0];
};

export const deleteProject = async (projectId, userId) => {
  const db = getDB();

  // Fetch project
  const [projects] = await db.execute(
    'SELECT id, name, status FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Delete project (cascade will handle related records if configured)
  await db.execute('DELETE FROM projects WHERE id = ?', [projectId]);

  // Log action
  await logAudit('DELETE_PROJECT', userId, projectId, `Deleted project ${project.name}`);

  return { message: 'Project deleted successfully' };
};
