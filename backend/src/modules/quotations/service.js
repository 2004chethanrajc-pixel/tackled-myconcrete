import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';
import { validateStatusTransition } from '../../utils/statusTransition.js';
import * as notificationService from '../../services/notificationService.js';

export const createQuotation = async (quotationData, financeId) => {
  const { projectId, materialCost, labourCost, transportCost, otherCost, totalCost, advanceAmount } = quotationData;
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, name, status FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Verify project status is REPORT_SUBMITTED
  if (project.status !== 'REPORT_SUBMITTED') {
    throw new ApiError(400, 'Quotation can only be generated when project status is REPORT_SUBMITTED');
  }

  // Check for duplicate quotation
  const [existingQuotations] = await db.execute(
    'SELECT id FROM quotations WHERE project_id = ?',
    [projectId]
  );

  if (existingQuotations.length > 0) {
    throw new ApiError(400, 'Quotation already exists for this project');
  }

  // Validate totalCost equals sum of all costs
  const calculatedTotal = materialCost + labourCost + transportCost + otherCost;
  if (Math.abs(calculatedTotal - totalCost) > 0.01) {
    throw new ApiError(400, `Total cost must equal sum of all costs (${calculatedTotal.toFixed(2)})`);
  }

  // Validate advance amount
  const advance = advanceAmount || 0;
  if (advance < 0) {
    throw new ApiError(400, 'Advance amount cannot be negative');
  }
  if (advance > totalCost) {
    throw new ApiError(400, 'Advance amount cannot exceed total cost');
  }

  // Validate status transition: REPORT_SUBMITTED → QUOTATION_GENERATED
  const transition = validateStatusTransition(project.status, 'QUOTATION_GENERATED', 'finance');
  
  if (!transition.valid) {
    throw new ApiError(400, transition.message);
  }

  // Create quotation
  const quotationId = uuidv4();
  await db.execute(
    `INSERT INTO quotations (id, project_id, material_cost, labour_cost, transport_cost, other_cost, total_cost, advance_amount, generated_by, approved, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
    [quotationId, projectId, materialCost, labourCost, transportCost, otherCost, totalCost, advance, financeId]
  );

  // Update project status to QUOTATION_GENERATED
  await db.execute(
    'UPDATE projects SET status = ? WHERE id = ?',
    ['QUOTATION_GENERATED', projectId]
  );

  // Log action
  await logAudit('GENERATE_QUOTATION', financeId, quotationId, `Generated quotation for project ${project.name} with total cost ${totalCost} and advance ${advance}`);

  // Send notification about quotation generation
  try {
    await notificationService.notifyStatusChange(projectId, project.name, 'QUOTATION_GENERATED');
  } catch (error) {
    console.error('Error sending quotation generated notification:', error);
  }

  // Fetch created quotation
  const [quotations] = await db.execute(
    `SELECT id, project_id, material_cost, labour_cost, transport_cost, other_cost, total_cost, advance_amount, generated_by, approved, approved_at, created_at,
            CASE 
              WHEN approved = TRUE THEN 'approved'
              WHEN approved = FALSE THEN 'pending'
              ELSE 'pending'
            END as status
     FROM quotations WHERE id = ?`,
    [quotationId]
  );

  return quotations[0];
};

export const getQuotationById = async (quotationId, userRole, userId) => {
  const db = getDB();

  // Fetch quotation
  const [quotations] = await db.execute(
    `SELECT id, project_id, material_cost, labour_cost, transport_cost, other_cost, total_cost, advance_amount, generated_by, approved, approved_at, created_at,
            CASE 
              WHEN approved = TRUE THEN 'approved'
              WHEN approved = FALSE THEN 'pending'
              ELSE 'pending'
            END as status
     FROM quotations 
     WHERE id = ?`,
    [quotationId]
  );

  if (quotations.length === 0) {
    throw new ApiError(404, 'Quotation not found');
  }

  const quotation = quotations[0];

  // Fetch project to verify access
  const [projects] = await db.execute(
    'SELECT id, pm_id, customer_id FROM projects WHERE id = ?',
    [quotation.project_id]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Role-based access control
  if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'finance') {
    // Can see all quotations
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view quotations for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view quotations for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view this quotation');
  }

  // Fetch related report
  const [reports] = await db.execute(
    `SELECT id, project_id, total_floors, dimensions, images, remarks, approval_status, created_at 
     FROM site_reports 
     WHERE project_id = ?`,
    [quotation.project_id]
  );

  const report = reports.length > 0 ? reports[0] : null;

  // Parse images JSON if report exists
  if (report && report.images) {
    try {
      report.images = JSON.parse(report.images);
    } catch (error) {
      report.images = [];
    }
  }

  // Fetch project details
  const [projectDetails] = await db.execute(
    'SELECT name, location, status FROM projects WHERE id = ?',
    [quotation.project_id]
  );

  const projectInfo = projectDetails.length > 0 ? projectDetails[0] : null;

  // Fetch generated_by user name
  let generatedByName = null;
  if (quotation.generated_by) {
    const [users] = await db.execute(
      'SELECT name FROM users WHERE id = ?',
      [quotation.generated_by]
    );
    generatedByName = users.length > 0 ? users[0].name : null;
  }

  return {
    quotation,
    report,
    project_name: projectInfo?.name || null,
    project_location: projectInfo?.location || null,
    project_status: projectInfo?.status || null,
    generated_by_name: generatedByName
  };
};

export const approveQuotation = async (quotationId, customerId) => {
  const db = getDB();

  // Fetch quotation
  const [quotations] = await db.execute(
    'SELECT id, project_id, approved FROM quotations WHERE id = ?',
    [quotationId]
  );

  if (quotations.length === 0) {
    throw new ApiError(404, 'Quotation not found');
  }

  const quotation = quotations[0];

  // Fetch project to verify customer ownership
  const [projects] = await db.execute(
    'SELECT id, name, customer_id, status FROM projects WHERE id = ?',
    [quotation.project_id]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Verify customer owns this project
  if (project.customer_id !== customerId) {
    throw new ApiError(403, 'You can only approve quotations for your own projects');
  }

  // Check if already approved
  if (quotation.approved) {
    throw new ApiError(400, 'Quotation is already approved');
  }

  // Validate status transition: QUOTATION_GENERATED → CUSTOMER_APPROVED
  const transition = validateStatusTransition(project.status, 'CUSTOMER_APPROVED', 'customer');
  
  if (!transition.valid) {
    throw new ApiError(400, transition.message);
  }

  // Update quotation approval status
  await db.execute(
    'UPDATE quotations SET approved = TRUE, approved_at = NOW() WHERE id = ?',
    [quotationId]
  );

  // Update project status to CUSTOMER_APPROVED
  await db.execute(
    'UPDATE projects SET status = ? WHERE id = ?',
    ['CUSTOMER_APPROVED', quotation.project_id]
  );

  // Log action
  await logAudit('APPROVE_QUOTATION', customerId, quotationId, `Approved quotation for project ${project.name}`);

  // Send notification about quotation approval
  try {
    await notificationService.notifyStatusChange(quotation.project_id, project.name, 'CUSTOMER_APPROVED');
  } catch (error) {
    console.error('Error sending quotation approval notification:', error);
  }

  // Fetch updated quotation
  const [updatedQuotations] = await db.execute(
    `SELECT id, project_id, material_cost, labour_cost, transport_cost, other_cost, total_cost, advance_amount, generated_by, approved, approved_at, created_at,
            CASE 
              WHEN approved = TRUE THEN 'approved'
              WHEN approved = FALSE THEN 'pending'
              ELSE 'pending'
            END as status
     FROM quotations WHERE id = ?`,
    [quotationId]
  );

  return updatedQuotations[0];
};

export const getQuotationsByProject = async (projectId, userRole, userId) => {
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, pm_id, customer_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Role-based access control
  if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'finance') {
    // Can see all quotations
  } else if (userRole === 'project_manager') {
    if (project.pm_id !== userId) {
      throw new ApiError(403, 'You can only view quotations for your assigned projects');
    }
  } else if (userRole === 'customer') {
    if (project.customer_id !== userId) {
      throw new ApiError(403, 'You can only view quotations for your projects');
    }
  } else {
    throw new ApiError(403, 'Not authorized to view quotations');
  }

  // Fetch quotations for the project
  const [quotations] = await db.execute(
    `SELECT q.id, q.project_id, q.material_cost, q.labour_cost, q.transport_cost, q.other_cost, q.total_cost, q.advance_amount, q.generated_by, q.approved, q.approved_at, q.created_at,
            p.name as project_name, p.location as project_location, p.status as project_status,
            CASE 
              WHEN q.approved = TRUE THEN 'approved'
              WHEN q.approved = FALSE THEN 'pending'
              ELSE 'pending'
            END as status
     FROM quotations q
     JOIN projects p ON q.project_id = p.id
     WHERE q.project_id = ? 
     ORDER BY q.created_at DESC`,
    [projectId]
  );

  return quotations;
};
