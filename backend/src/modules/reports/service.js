import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import { validateStatusTransition } from '../../utils/statusTransition.js';
import * as notificationService from '../../services/notificationService.js';

export const createReport = async (reportData, siteId) => {
  const { projectId, totalFloors, dimensions, remarks, images } = reportData;
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, name, site_id, status FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Verify project is assigned to this site incharge
  if (project.site_id !== siteId) {
    throw new ApiError(403, 'You are not the Site Incharge for this project');
  }

  // Verify project status is VISIT_DONE
  if (project.status !== 'VISIT_DONE') {
    throw new ApiError(400, 'Report can only be submitted when project status is VISIT_DONE');
  }

  // Check for duplicate report
  const [existingReports] = await db.execute(
    'SELECT id FROM site_reports WHERE project_id = ?',
    [projectId]
  );

  if (existingReports.length > 0) {
    throw new ApiError(400, 'Report already exists for this project');
  }

  // Validate status transition: VISIT_DONE → REPORT_SUBMITTED
  const transition = validateStatusTransition(project.status, 'REPORT_SUBMITTED', 'site_incharge');
  
  if (!transition.valid) {
    throw new ApiError(400, transition.message);
  }

  // Convert images array to JSON string
  const imagesJson = JSON.stringify(images);

  // Create report
  const reportId = uuidv4();
  await db.execute(
    `INSERT INTO site_reports (id, project_id, total_floors, dimensions, images, remarks, approval_status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
    [reportId, projectId, totalFloors, dimensions, imagesJson, remarks || null]
  );

  // Update project status to REPORT_SUBMITTED
  await db.execute(
    'UPDATE projects SET status = ? WHERE id = ?',
    ['REPORT_SUBMITTED', projectId]
  );

  // Log action
  await logAudit('SUBMIT_REPORT', siteId, reportId, `Submitted site report for project ${project.name}`);

  // Notify PM and customer about report submission
  try {
    await notificationService.notifyReportSubmitted(projectId, project.name);
  } catch (error) {
    console.error('Error sending report submitted notification:', error);
  }

  // Fetch created report
  const [reports] = await db.execute(
    'SELECT id, project_id, total_floors, dimensions, images, remarks, approval_status, created_at FROM site_reports WHERE id = ?',
    [reportId]
  );

  const report = reports[0];
  
  // Parse images JSON back to array
  if (report.images) {
    report.images = JSON.parse(report.images);
  }

  return report;
};

export const getReportsByProjectBeforeApproving = async (projectId, userRole, userId) => {
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
    // Can see all reports
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your assigned projects');
    }
  } else if (userRole === 'site_incharge') {
    if (project.site_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view reports');
  }

  // Fetch reports for the project
  const [reports] = await db.execute(
    `SELECT sr.id, sr.project_id, sr.total_floors, sr.dimensions, sr.images, sr.remarks, sr.approval_status, sr.created_at,
            p.name as project_name, p.location as project_location,
            c.name as customer_name,
            s.name as site_incharge_name
     FROM site_reports sr
     LEFT JOIN projects p ON sr.project_id = p.id
     LEFT JOIN users c ON p.customer_id = c.id
     LEFT JOIN users s ON p.site_id = s.id
     WHERE sr.project_id = ? 
     ORDER BY sr.created_at DESC`,
    [projectId]
  );

  // Parse images JSON for each report
  reports.forEach(report => {
    if (report.images) {
      report.images = JSON.parse(report.images);
    }
  });

  return reports;
};

export const getReportsByProject = async (projectId, userRole, userId) => {
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
    // Can see all reports
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your assigned projects');
    }
  } else if (userRole === 'site_incharge') {
    if (project.site_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view reports');
  }

  // Fetch reports for the project
  const [reports] = await db.execute(
    `SELECT sr.id, sr.project_id, sr.total_floors, sr.dimensions, sr.images, sr.remarks, sr.approval_status, sr.created_at,
            p.name as project_name, p.location as project_location,
            c.name as customer_name,
            s.name as site_incharge_name
     FROM site_reports sr
     LEFT JOIN projects p ON sr.project_id = p.id
     LEFT JOIN users c ON p.customer_id = c.id
     LEFT JOIN users s ON p.site_id = s.id
     WHERE sr.project_id = ? 
     ORDER BY sr.created_at DESC`,
    [projectId]
  );

  // Parse images JSON for each report
  reports.forEach(report => {
    if (report.images) {
      report.images = JSON.parse(report.images);
    }
  });

  return reports;
};

export const generateFinalProjectReport = async (projectId, userRole, userId) => {
  const db = getDB();

  // Fetch project with all related user information
  const [projects] = await db.execute(
    `SELECT 
      p.id, p.name, p.location, p.status, p.created_at,
      p.customer_id, p.pm_id, p.site_id,
      c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
      pm.name AS pm_name, pm.email AS pm_email,
      si.name AS site_name, si.email AS site_email
     FROM projects p
     LEFT JOIN users c ON p.customer_id = c.id
     LEFT JOIN users pm ON p.pm_id = pm.id
     LEFT JOIN users si ON p.site_id = si.id
     WHERE p.id = ?`,
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Role-based access control
  if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'finance') {
    // Can view any project
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your assigned projects');
    }
  } else if (userRole === 'site_incharge') {
    if (project.site_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view reports for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view this report');
  }

  // Fetch site report
  const [siteReports] = await db.execute(
    `SELECT id, total_floors, dimensions, images, remarks, approval_status, created_at
     FROM site_reports
     WHERE project_id = ?`,
    [projectId]
  );

  let siteReport = null;
  if (siteReports.length > 0) {
    siteReport = siteReports[0];
    if (siteReport.images) {
      siteReport.images = JSON.parse(siteReport.images);
    }
  }

  // Fetch quotation
  const [quotations] = await db.execute(
    `SELECT id, material_cost, labour_cost, transport_cost, other_cost, total_cost, 
            approved, approved_at, created_at
     FROM quotations
     WHERE project_id = ?`,
    [projectId]
  );

  let quotation = null;
  if (quotations.length > 0) {
    quotation = quotations[0];
  }

  // Fetch payments
  const [payments] = await db.execute(
    `SELECT id, amount, type, status, verified_by, verified_at, created_at
     FROM payments
     WHERE project_id = ?
     ORDER BY created_at DESC`,
    [projectId]
  );

  // Calculate payment summary
  let totalPaid = 0;
  let advancePaid = 0;
  let finalPaid = 0;

  payments.forEach(payment => {
    if (payment.status === 'completed') {
      totalPaid += parseFloat(payment.amount);
      if (payment.type === 'advance') {
        advancePaid += parseFloat(payment.amount);
      } else if (payment.type === 'final') {
        finalPaid += parseFloat(payment.amount);
      }
    }
  });

  // Fetch work logs with images
  const [workLogs] = await db.execute(
    `SELECT id, floor_number, description, created_by, created_at
     FROM work_logs
     WHERE project_id = ?
     ORDER BY created_at DESC`,
    [projectId]
  );

  // Fetch images for each work log
  for (const log of workLogs) {
    const [images] = await db.execute(
      'SELECT id, image_path FROM work_log_images WHERE work_log_id = ?',
      [log.id]
    );
    log.images = images;
  }

  // Calculate work summary
  const totalLogs = workLogs.length;
  const floorsCompleted = [...new Set(workLogs.map(log => log.floor_number))].length;
  const latestUpdate = workLogs.length > 0 ? workLogs[0].created_at : null;

  // Calculate progress percentage (simple estimation)
  let progressPercentage = 0;
  if (siteReport && siteReport.total_floors > 0) {
    progressPercentage = Math.min(100, Math.round((floorsCompleted / siteReport.total_floors) * 100));
  }

  // Log action
  await logAudit('GENERATE_FINAL_REPORT', userId, projectId, `Generated final report for project ${project.name}`);

  // Build final report structure
  return {
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status,
      created_at: project.created_at
    },
    customer: project.customer_id ? {
      name: project.customer_name,
      email: project.customer_email,
      phone: project.customer_phone
    } : null,
    projectManager: project.pm_id ? {
      name: project.pm_name,
      email: project.pm_email
    } : null,
    siteIncharge: project.site_id ? {
      name: project.site_name,
      email: project.site_email
    } : null,
    siteReport: siteReport,
    quotation: quotation ? {
      material_cost: quotation.material_cost,
      labour_cost: quotation.labour_cost,
      transport_cost: quotation.transport_cost,
      other_cost: quotation.other_cost,
      total_cost: quotation.total_cost,
      approved: quotation.approved,
      approved_at: quotation.approved_at,
      created_at: quotation.created_at
    } : null,
    payments: {
      summary: {
        total_paid: totalPaid,
        advance_paid: advancePaid,
        final_paid: finalPaid
      },
      history: payments
    },
    work: {
      logs: workLogs,
      summary: {
        total_logs: totalLogs,
        floors_completed: floorsCompleted,
        latest_update: latestUpdate,
        progress_percentage: progressPercentage
      }
    }
  };
};

export const getAllReports = async (userRole, userId) => {
  const db = getDB();

  let query = `
    SELECT 
      sr.id, 
      sr.project_id, 
      sr.total_floors, 
      sr.dimensions, 
      sr.images,
      sr.remarks, 
      sr.approval_status, 
      sr.created_at,
      p.name AS project_name,
      p.location AS project_location,
      p.status AS project_status
    FROM site_reports sr
    JOIN projects p ON sr.project_id = p.id
  `;

  const params = [];

  // Role-based filtering
  if (userRole === 'customer') {
    query += ' WHERE p.customer_id = ?';
    params.push(userId);
  } else if (userRole === 'project_manager') {
    query += ' WHERE p.pm_id = ?';
    params.push(userId);
  } else if (userRole === 'site_incharge') {
    query += ' WHERE p.site_id = ?';
    params.push(userId);
  }
  // admin, finance, super_admin can see all reports

  query += ' ORDER BY sr.created_at DESC';

  const [reports] = await db.execute(query, params);

  // Parse images JSON for each report
  reports.forEach(report => {
    if (report.images) {
      report.images = JSON.parse(report.images);
    }
  });

  return reports;
};
