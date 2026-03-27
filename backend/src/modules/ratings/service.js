import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';

const countWords = (str) => str.trim().split(/\s+/).filter(Boolean).length;

export const submitRating = async (projectId, customerId, rating, feedback) => {
  const db = getDB();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  if (feedback && countWords(feedback) > 300) {
    throw new ApiError(400, 'Feedback must not exceed 300 words');
  }

  const [projects] = await db.execute(
    'SELECT id, name, status, customer_id FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) throw new ApiError(404, 'Project not found');
  const project = projects[0];

  if (project.customer_id !== customerId) {
    throw new ApiError(403, 'You can only rate your own projects');
  }

  if (project.status !== 'CLOSED') {
    throw new ApiError(400, 'You can only rate a closed project');
  }

  // One rating per project — no updates allowed
  const [existing] = await db.execute(
    'SELECT id FROM ratings WHERE project_id = ? AND customer_id = ?',
    [projectId, customerId]
  );

  if (existing.length > 0) {
    throw new ApiError(400, 'You have already submitted a rating for this project');
  }

  const id = uuidv4();
  await db.execute(
    'INSERT INTO ratings (id, project_id, customer_id, rating, feedback, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [id, projectId, customerId, rating, feedback || null]
  );

  await logAudit('SUBMIT_RATING', customerId, projectId, `Submitted ${rating} star rating for project ${project.name}`);

  const [rows] = await db.execute('SELECT * FROM ratings WHERE id = ?', [id]);
  return rows[0];
};

// Fetch rating for a project — used by all stakeholders
export const getProjectRating = async (projectId) => {
  const db = getDB();
  const [rows] = await db.execute(
    `SELECT r.id, r.project_id, r.rating, r.feedback, r.created_at, u.name as customer_name
     FROM ratings r
     LEFT JOIN users u ON r.customer_id = u.id
     WHERE r.project_id = ?
     LIMIT 1`,
    [projectId]
  );
  return rows[0] || null;
};
