import { getDB } from '../../config/db.js';
import { notifySitePlanUploaded } from '../../services/notificationService.js';
import path from 'path';
import fs from 'fs';

export const uploadSitePlan = async (projectId, uploadedBy, file) => {
  console.log('=== UPLOAD SITE PLAN SERVICE CALLED ===');
  console.log('Version: 2.0 - with notifications');
  
  const db = getDB();
  
  try {
    // Check if project exists and get project details
    const [projects] = await db.execute(
      'SELECT id, name FROM projects WHERE id = ?',
      [projectId]
    );
    
    if (projects.length === 0) {
      throw new Error('Project not found');
    }
    
    const project = projects[0];
    const filePath = `/uploads/plans/${file.filename}`;
    const fileSize = file.size;
    const fileName = file.originalname;
    
    const [result] = await db.execute(
      `INSERT INTO site_plans (project_id, file_path, uploaded_by, file_name, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, filePath, uploadedBy, fileName, fileSize]
    );
    
    const [sitePlan] = await db.execute(
      `SELECT sp.*, u.name as uploaded_by_name, u.email as uploaded_by_email
       FROM site_plans sp
       LEFT JOIN users u ON sp.uploaded_by = u.id
       WHERE sp.id = ?`,
      [result.insertId]
    );
    
    // Send notification to all project stakeholders
    if (sitePlan[0]) {
      console.log('Sending notification for site plan upload:', {
        projectId,
        projectName: project.name,
        uploaderName: sitePlan[0].uploaded_by_name
      });
      
      try {
        await notifySitePlanUploaded(projectId, project.name, sitePlan[0].uploaded_by_name);
        console.log('Notification sent successfully');
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the upload if notification fails
      }
    }
    
    return sitePlan[0];
  } catch (error) {
    console.error('Error uploading site plan:', error);
    throw error;
  }
};

export const getSitePlansByProject = async (projectId) => {
  const db = getDB();
  
  const [sitePlans] = await db.execute(
    `SELECT sp.*, u.name as uploaded_by_name, u.email as uploaded_by_email
     FROM site_plans sp
     LEFT JOIN users u ON sp.uploaded_by = u.id
     WHERE sp.project_id = ?
     ORDER BY sp.uploaded_at DESC`,
    [projectId]
  );
  
  return sitePlans;
};

export const deleteSitePlan = async (planId, userId, userRole) => {
  const db = getDB();
  
  try {
    // Get the site plan
    const [plans] = await db.execute(
      'SELECT * FROM site_plans WHERE id = ?',
      [planId]
    );
    
    if (plans.length === 0) {
      throw new Error('Site plan not found');
    }
    
    const plan = plans[0];
    
    // Only admin, super_admin, or the uploader can delete
    if (userRole !== 'admin' && userRole !== 'super_admin' && plan.uploaded_by !== userId) {
      throw new Error('Unauthorized to delete this site plan');
    }
    
    // Delete the file from filesystem
    const filePath = path.join(process.cwd(), plan.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await db.execute('DELETE FROM site_plans WHERE id = ?', [planId]);
    
    return { message: 'Site plan deleted successfully' };
  } catch (error) {
    console.error('Error deleting site plan:', error);
    throw error;
  }
};
