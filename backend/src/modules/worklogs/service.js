import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import * as notificationService from '../../services/notificationService.js';

export const createWorklog = async (worklogData, siteId) => {
  const { projectId, floorNumber, description } = worklogData;
  const db = getDB();

  // Verify project exists and get site incharge name
  const [projects] = await db.execute(
    `SELECT p.id, p.name, p.site_id, p.status, u.name as site_incharge_name
     FROM projects p
     LEFT JOIN users u ON p.site_id = u.id
     WHERE p.id = ?`,
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Verify project is assigned to this site incharge (project-level OR floor-level)
  if (project.site_id !== siteId) {
    // Check floor-level assignment
    const [floorRows] = await db.execute(
      'SELECT id FROM project_floors WHERE project_id = ? AND site_incharge_id = ? LIMIT 1',
      [projectId, siteId]
    );
    if (floorRows.length === 0) {
      throw new ApiError(403, 'You are not the Site Incharge for this project');
    }
  }

  // Verify project status is WORK_STARTED
  if (project.status !== 'WORK_STARTED') {
    throw new ApiError(400, 'Work logs can only be created when project status is WORK_STARTED');
  }

  // Create worklog
  const worklogId = uuidv4();
  await db.execute(
    `INSERT INTO work_logs (id, project_id, floor_number, description, created_by, created_at) 
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [worklogId, projectId, floorNumber, description, siteId]
  );

  // Log action
  await logAudit('CREATE_WORKLOG', siteId, worklogId, `Created work log for floor ${floorNumber} in project ${project.name}`);

  // Send notification to all project stakeholders
  try {
    await notificationService.notifyWorklogCreated(
      projectId,
      project.name,
      project.site_incharge_name,
      floorNumber,
      siteId
    );
  } catch (notificationError) {
    console.error('Error sending worklog creation notification:', notificationError);
    // Don't fail the worklog creation if notification fails
  }

  // Fetch created worklog
  const [worklogs] = await db.execute(
    'SELECT id, project_id, floor_number, description, created_by, created_at FROM work_logs WHERE id = ?',
    [worklogId]
  );

  return worklogs[0];
};

export const addWorklogImages = async (worklogId, images, siteId) => {
  const db = getDB();

  // Verify worklog exists and get project details
  const [worklogs] = await db.execute(
    `SELECT wl.id, wl.project_id, wl.created_by, wl.floor_number, 
            p.name as project_name, u.name as site_incharge_name
     FROM work_logs wl
     JOIN projects p ON wl.project_id = p.id
     JOIN users u ON wl.created_by = u.id
     WHERE wl.id = ?`,
    [worklogId]
  );

  if (worklogs.length === 0) {
    throw new ApiError(404, 'Work log not found');
  }

  const worklog = worklogs[0];

  // Verify worklog was created by this site incharge
  if (worklog.created_by !== siteId) {
    throw new ApiError(403, 'You can only add images to your own work logs');
  }

  // Insert each image
  for (const imagePath of images) {
    const imageId = uuidv4();
    await db.execute(
      'INSERT INTO work_log_images (id, work_log_id, image_path) VALUES (?, ?, ?)',
      [imageId, worklogId, imagePath]
    );
  }

  // Log action
  await logAudit('ADD_WORKLOG_IMAGES', siteId, worklogId, `Added ${images.length} image(s) to work log`);

  // Send notification to all project stakeholders
  try {
    await notificationService.notifyWorklogImagesAdded(
      worklog.project_id,
      worklog.project_name,
      worklog.site_incharge_name,
      worklog.floor_number,
      images.length,
      siteId
    );
  } catch (notificationError) {
    console.error('Error sending worklog images added notification:', notificationError);
    // Don't fail the image addition if notification fails
  }

  // Fetch updated worklog with images
  const [updatedWorklogs] = await db.execute(
    `SELECT wl.id, wl.project_id, wl.floor_number, wl.description, wl.created_by, wl.created_at
     FROM work_logs wl
     WHERE wl.id = ?`,
    [worklogId]
  );

  const updatedWorklog = updatedWorklogs[0];

  // Fetch images for this worklog
  const [worklogImages] = await db.execute(
    'SELECT id, image_path FROM work_log_images WHERE work_log_id = ?',
    [worklogId]
  );

  // Convert to array of paths
  updatedWorklog.images = worklogImages.map(img => img.image_path);

  return updatedWorklog;
};

export const removeWorklogImage = async (worklogId, imagePath, siteId) => {
  const db = getDB();

  // Verify worklog exists and get project details
  const [worklogs] = await db.execute(
    `SELECT wl.id, wl.project_id, wl.created_by, wl.floor_number,
            p.name as project_name, u.name as site_incharge_name
     FROM work_logs wl
     JOIN projects p ON wl.project_id = p.id
     JOIN users u ON wl.created_by = u.id
     WHERE wl.id = ?`,
    [worklogId]
  );

  if (worklogs.length === 0) {
    throw new ApiError(404, 'Work log not found');
  }

  const worklog = worklogs[0];

  // Verify worklog was created by this site incharge
  if (worklog.created_by !== siteId) {
    throw new ApiError(403, 'You can only remove images from your own work logs');
  }

  // Check if image exists in the worklog
  const [images] = await db.execute(
    'SELECT id FROM work_log_images WHERE work_log_id = ? AND image_path = ?',
    [worklogId, imagePath]
  );

  if (images.length === 0) {
    throw new ApiError(404, 'Image not found in this work log');
  }

  // Remove the image record from database
  await db.execute(
    'DELETE FROM work_log_images WHERE work_log_id = ? AND image_path = ?',
    [worklogId, imagePath]
  );

  // Try to delete the physical file (optional - don't fail if file doesn't exist)
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Construct full file path
    const fullPath = path.join(__dirname, '../../..', imagePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('Physical file deleted:', fullPath);
    }
  } catch (fileError) {
    console.warn('Could not delete physical file:', imagePath, fileError.message);
    // Don't throw error - database record is already removed
  }

  // Log action
  await logAudit('REMOVE_WORKLOG_IMAGE', siteId, worklogId, `Removed image from work log: ${imagePath}`);

  // Send notification to all project stakeholders
  try {
    await notificationService.notifyWorklogImageRemoved(
      worklog.project_id,
      worklog.project_name,
      worklog.site_incharge_name,
      worklog.floor_number,
      siteId
    );
  } catch (notificationError) {
    console.error('Error sending worklog image removed notification:', notificationError);
    // Don't fail the image removal if notification fails
  }

  return { success: true };
};

export const getWorklogsByProject = async (projectId, userRole, userId) => {
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
  if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'finance') {
    // Can see all worklogs
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view work logs for your assigned projects');
    }
  } else if (userRole === 'site_incharge') {
    if (project.site_id !== userId) {
      throw new ApiError(403, 'You can only view work logs for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view work logs for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view work logs');
  }

  // Fetch worklogs for the project
  const [worklogs] = await db.execute(
    `SELECT id, project_id, floor_number, description, created_by, created_at 
     FROM work_logs 
     WHERE project_id = ? 
     ORDER BY created_at DESC`,
    [projectId]
  );

  // Fetch images for each worklog
  for (const worklog of worklogs) {
    const [images] = await db.execute(
      'SELECT id, image_path FROM work_log_images WHERE work_log_id = ?',
      [worklog.id]
    );
    // Convert to array of paths for easier frontend handling
    worklog.images = images.map(img => img.image_path);
  }

  return worklogs;
};
