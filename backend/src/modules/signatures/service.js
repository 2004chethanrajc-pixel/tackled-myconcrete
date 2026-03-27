import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';

export const uploadSignature = async (projectId, customerId, signatureFile, signatureType = 'uploaded') => {
  const db = getDB();

  // Verify project exists and belongs to customer
  const [projects] = await db.execute(
    'SELECT id, customer_id, status FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  if (project.customer_id !== customerId) {
    throw new ApiError(403, 'You can only sign your own projects');
  }

  // Check if signature already exists
  const [existingSignatures] = await db.execute(
    'SELECT id FROM signatures WHERE project_id = ?',
    [projectId]
  );

  if (existingSignatures.length > 0) {
    // Update existing signature instead of throwing error
    const existingId = existingSignatures[0].id;
    
    const filename = signatureFile.filename || signatureFile.path.split(/[\\/]/).pop();
    const signaturePath = `uploads/signatures/${filename}`;

    console.log('Updating existing signature with path:', signaturePath);

    await db.execute(
      `UPDATE signatures 
       SET signature_path = ?, signature_type = ?, signed_at = NOW() 
       WHERE id = ?`,
      [signaturePath, signatureType, existingId]
    );

    // Log action
    await logAudit('SIGNATURE_UPDATE', customerId, projectId, `Customer updated signature for project ${projectId}`);

    // Fetch updated signature
    const [signatures] = await db.execute(
      'SELECT id, project_id, customer_id, signature_path, signature_type, signed_at FROM signatures WHERE id = ?',
      [existingId]
    );

    return signatures[0];
  }

  // Create new signature record
  const signatureId = uuidv4();
  
  const filename = signatureFile.filename || signatureFile.path.split(/[\\/]/).pop();
  const signaturePath = `uploads/signatures/${filename}`;

  console.log('Storing signature path:', signaturePath);

  await db.execute(
    `INSERT INTO signatures (id, project_id, customer_id, signature_path, signature_type, signed_at, created_at) 
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [signatureId, projectId, customerId, signaturePath, signatureType]
  );

  // Log action
  await logAudit('SIGNATURE_UPLOAD', customerId, projectId, `Customer signed project ${projectId}`);

  // Fetch created signature
  const [signatures] = await db.execute(
    'SELECT id, project_id, customer_id, signature_path, signature_type, signed_at FROM signatures WHERE id = ?',
    [signatureId]
  );

  return signatures[0];
};

export const getSignatureByProject = async (projectId, userId, userRole) => {
  const db = getDB();

  // Verify project exists
  const [projects] = await db.execute(
    'SELECT id, customer_id, pm_id, site_id, finance_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new ApiError(404, 'Project not found');
  }

  const project = projects[0];

  // Check access rights
  const hasAccess = 
    userRole === 'admin' || 
    userRole === 'super_admin' ||
    project.customer_id === userId ||
    project.pm_id === userId ||
    project.site_id === userId ||
    project.finance_id === userId;

  if (!hasAccess) {
    throw new ApiError(403, 'You do not have access to view this signature');
  }

  // Fetch signature
  const [signatures] = await db.execute(
    `SELECT s.id, s.project_id, s.customer_id, s.signature_path, s.signature_type, s.signed_at,
            u.name as customer_name, u.email as customer_email
     FROM signatures s
     JOIN users u ON s.customer_id = u.id
     WHERE s.project_id = ?`,
    [projectId]
  );

  if (signatures.length === 0) {
    return null;
  }

  return signatures[0];
};

export const deleteSignature = async (projectId, userId, userRole) => {
  const db = getDB();

  // Only admin or the customer can delete signature
  const [signatures] = await db.execute(
    'SELECT id, customer_id FROM signatures WHERE project_id = ?',
    [projectId]
  );

  if (signatures.length === 0) {
    throw new ApiError(404, 'Signature not found');
  }

  const signature = signatures[0];

  if (userRole !== 'admin' && userRole !== 'super_admin' && signature.customer_id !== userId) {
    throw new ApiError(403, 'You do not have permission to delete this signature');
  }

  // Delete signature
  await db.execute('DELETE FROM signatures WHERE project_id = ?', [projectId]);

  // Log action
  await logAudit('SIGNATURE_DELETE', userId, projectId, `Signature deleted for project ${projectId}`);

  return { message: 'Signature deleted successfully' };
};
