import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/db.js';

export const logAudit = async (action, performedBy, targetId, description) => {
  try {
    const db = getDB();
    const id = uuidv4();
    
    await db.execute(
      `INSERT INTO audit_logs (id, action, performed_by, target_id, description, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, action, performedBy, targetId, description]
    );
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
};
