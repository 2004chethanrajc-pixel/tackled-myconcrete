import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import * as notificationService from '../../services/notificationService.js';

export const createVisit = async (visitData, pmId) => {
  const { projectId, siteId, visitDate, visitTime } = visitData;
  const db = getDB();

  // Basic validation
  if (!projectId || !siteId || !visitDate || !visitTime) {
    throw new ApiError(400, 'All fields are required: projectId, siteId, visitDate, visitTime');
  }

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, name, pm_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Verify project is assigned to this PM
  if (project.pm_id !== pmId) {
    throw new ApiError(403, 'You are not the Project Manager for this project');
  }

  // Check for existing active visits for this project
  const [activeVisits] = await db.execute(
    'SELECT id, status, visit_date FROM visits WHERE project_id = ? AND status IN ("scheduled", "completed")',
    [projectId]
  );

  if (activeVisits.length > 0) {
    const activeVisit = activeVisits[0];
    if (activeVisit.status === 'scheduled') {
      throw new ApiError(400, `This project already has a scheduled visit on ${activeVisit.visit_date}. Please wait for it to be completed or rejected before scheduling another visit.`);
    } else if (activeVisit.status === 'completed') {
      throw new ApiError(400, 'This project already has a completed visit. Only one visit per project is allowed.');
    }
  }

  // Verify site user exists and has site_incharge role
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

  // Check for duplicate booking (unique constraint: site_id + visit_date + visit_time for scheduled visits only)
  const [existingVisits] = await db.execute(
    'SELECT id FROM visits WHERE site_id = ? AND visit_date = ? AND visit_time = ? AND status = "scheduled"',
    [siteId, visitDate, visitTime]
  );

  if (existingVisits.length > 0) {
    throw new ApiError(400, 'Site Incharge already has a visit scheduled at this date and time');
  }

  // Create visit
  const visitId = uuidv4();
  await db.execute(
    `INSERT INTO visits (id, project_id, site_id, visit_date, visit_time, status, created_at) 
     VALUES (?, ?, ?, ?, ?, 'scheduled', NOW())`,
    [visitId, projectId, siteId, visitDate, visitTime]
  );

  // Log action
  await logAudit('SCHEDULE_VISIT', pmId, visitId, `Scheduled visit for project ${project.name} on ${visitDate} at ${visitTime}`);

  // Notify site incharge and customer about visit
  try {
    await notificationService.notifyVisitScheduled(
      projectId,
      project.name,
      visitDate,
      visitTime
    );
  } catch (error) {
    console.error('Error sending visit scheduled notification:', error);
  }

  // Fetch created visit
  const [visits] = await db.execute(
    'SELECT id, project_id, site_id, visit_date, visit_time, status, rejection_reason, created_at FROM visits WHERE id = ?',
    [visitId]
  );

  return visits[0];
};

export const getVisitsByProject = async (projectId, userRole, userId) => {
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, pm_id, site_id, customer_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Role-based access control
  if (userRole === 'super_admin' || userRole === 'admin') {
    // Can see all visits
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view visits for your assigned projects');
    }
  } else if (userRole === 'site_incharge') {
    // Site incharge can only see visits assigned to them with customer details
    const [visits] = await db.execute(
      `SELECT 
        v.id, 
        v.project_id, 
        v.site_id, 
        v.visit_date, 
        v.visit_time, 
        v.status, 
        v.rejection_reason,
        v.rejection_description,
        v.rejected_by,
        v.rejected_at,
        v.created_at,
        p.name as project_name,
        p.location as project_location,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        rejector.name as rejected_by_name
       FROM visits v
       JOIN projects p ON v.project_id = p.id
       JOIN users c ON p.customer_id = c.id
       LEFT JOIN users rejector ON v.rejected_by = rejector.id
       WHERE v.project_id = ? AND v.site_id = ? 
       ORDER BY v.visit_date DESC, v.visit_time DESC`,
      [projectId, userId]
    );
    return visits;
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view visits for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view visits');
  }

  // Fetch all visits for the project with customer details
  const [visits] = await db.execute(
    `SELECT 
      v.id, 
      v.project_id, 
      v.site_id, 
      v.visit_date, 
      v.visit_time, 
      v.status, 
      v.rejection_reason,
      v.rejection_description,
      v.rejected_by,
      v.rejected_at,
      v.created_at,
      p.name as project_name,
      p.location as project_location,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email,
      rejector.name as rejected_by_name
     FROM visits v
     JOIN projects p ON v.project_id = p.id
     JOIN users c ON p.customer_id = c.id
     LEFT JOIN users rejector ON v.rejected_by = rejector.id
     WHERE v.project_id = ? 
     ORDER BY v.visit_date DESC, v.visit_time DESC`,
    [projectId]
  );

  return visits;
};

export const rejectVisit = async (visitId, rejectionData, userRole, userId) => {
  const { rejectionReason, rejectionDescription } = rejectionData;
  const db = getDB();

  // Fetch visit with project details and rejector name
  const [visits] = await db.execute(
    `SELECT v.id, v.project_id, v.site_id, v.status, p.customer_id, p.name as project_name,
            u.name as rejector_name
     FROM visits v
     JOIN projects p ON v.project_id = p.id
     JOIN users u ON u.id = ?
     WHERE v.id = ?`,
    [userId, visitId]
  );

  if (visits.length === 0) {
    throw new ApiError(404, 'Visit not found');
  }

  const visit = visits[0];

  // Check if already rejected or completed
  if (visit.status === 'rejected') {
    throw new ApiError(400, 'Visit is already rejected');
  }

  if (visit.status === 'completed') {
    throw new ApiError(400, 'Cannot reject a completed visit');
  }

  // Authorization check
  let authorized = false;

  if (userRole === 'super_admin' || userRole === 'admin') {
    authorized = true;
  } else if (userRole === 'site_incharge') {
    // Site incharge can reject if assigned to this visit
    if (visit.site_id === userId) {
      authorized = true;
    }
  } else if (userRole === 'customer') {
    // Customer can reject if it's their project
    if (visit.customer_id === userId) {
      authorized = true;
    }
  } else if (userRole === 'project_manager') {
    // PM can reject if it's their project
    const [projects] = await db.execute(
      'SELECT pm_id FROM projects WHERE id = ?',
      [visit.project_id]
    );

    if (projects.length > 0 && projects[0].pm_id === userId) {
      authorized = true;
    }
  }

  if (!authorized) {
    throw new ApiError(403, 'You are not authorized to reject this visit');
  }

  // Update visit status with rejection details
  await db.execute(
    `UPDATE visits 
     SET status = ?, 
         rejection_reason = ?, 
         rejection_description = ?,
         rejected_by = ?,
         rejected_at = NOW()
     WHERE id = ?`,
    ['rejected', rejectionReason, rejectionDescription, userId, visitId]
  );

  // Log action
  await logAudit('REJECT_VISIT', userId, visitId, `Rejected visit. Reason: ${rejectionReason}`);

  // Send notification to all project stakeholders
  try {
    console.log('=== SENDING VISIT REJECTION NOTIFICATION ===');
    console.log('Project ID:', visit.project_id);
    console.log('Project Name:', visit.project_name);
    console.log('Rejector Name:', visit.rejector_name);
    console.log('Rejection Reason:', rejectionReason);
    console.log('Rejected By:', userId);
    
    await notificationService.notifyVisitRejected(
      visit.project_id,
      visit.project_name,
      visit.rejector_name,
      rejectionReason,
      userId
    );
    console.log('Visit rejection notification sent successfully');
  } catch (notificationError) {
    console.error('Error sending visit rejection notification:', notificationError);
    // Don't fail the rejection if notification fails
  }

  // Fetch updated visit
  const [updatedVisits] = await db.execute(
    `SELECT id, project_id, site_id, visit_date, visit_time, status, 
            rejection_reason, rejection_description, rejected_by, rejected_at, created_at 
     FROM visits WHERE id = ?`,
    [visitId]
  );

  return updatedVisits[0];
};

export const completeVisit = async (visitId, userRole, userId) => {
  const db = getDB();

  // Fetch visit
  const [visits] = await db.execute(
    'SELECT id, project_id, site_id, status FROM visits WHERE id = ?',
    [visitId]
  );

  if (visits.length === 0) {
    throw new ApiError(404, 'Visit not found');
  }

  const visit = visits[0];

  // Check if visit is scheduled
  if (visit.status !== 'scheduled') {
    throw new ApiError(400, `Cannot complete visit with status: ${visit.status}`);
  }

  // Authorization check
  let authorized = false;

  if (userRole === 'super_admin') {
    authorized = true;
  } else if (userRole === 'site_incharge') {
    // Site incharge can complete if assigned to this visit
    if (visit.site_id === userId) {
      authorized = true;
    }
  }

  if (!authorized) {
    throw new ApiError(403, 'You are not authorized to complete this visit');
  }

  // Update visit status to completed
  await db.execute(
    'UPDATE visits SET status = ? WHERE id = ?',
    ['completed', visitId]
  );

  // Automatically update project status to VISIT_DONE
  await db.execute(
    'UPDATE projects SET status = ? WHERE id = ?',
    ['VISIT_DONE', visit.project_id]
  );

  // Log actions
  await logAudit('COMPLETE_VISIT', userId, visitId, 'Marked visit as completed');
  await logAudit('UPDATE_PROJECT_STATUS', userId, visit.project_id, 'Project status automatically updated to VISIT_DONE after visit completion');

  // Send notifications about visit completion and status change
  try {
    // Get project details for notifications
    const [projects] = await db.execute(
      'SELECT name FROM projects WHERE id = ?',
      [visit.project_id]
    );
    
    if (projects.length > 0) {
      // Notify about status change to VISIT_DONE
      await notificationService.notifyStatusChange(visit.project_id, projects[0].name, 'VISIT_DONE');
    }
  } catch (error) {
    console.error('Error sending visit completion notifications:', error);
  }

  // Fetch updated visit
  const [updatedVisits] = await db.execute(
    'SELECT id, project_id, site_id, visit_date, visit_time, status, rejection_reason, created_at FROM visits WHERE id = ?',
    [visitId]
  );

  return updatedVisits[0];
};
