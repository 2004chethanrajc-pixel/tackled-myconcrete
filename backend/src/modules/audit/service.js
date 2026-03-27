import { getDB } from '../../config/db.js';

export const getAuditLogs = async (limitParam, pageParam, excludeLogin = false) => {
  const db = getDB();

  try {
    // Parse and validate pagination parameters
    let limit = parseInt(limitParam) || 50;
    let page = parseInt(pageParam) || 1;

    // Enforce max limit
    if (limit > 200) {
      limit = 200;
    }

    // Ensure minimum values
    if (limit < 1) {
      limit = 50;
    }
    if (page < 1) {
      page = 1;
    }

    const offset = (page - 1) * limit;

    // Build WHERE clause to optionally exclude login logs
    const whereClause = excludeLogin ? "WHERE al.action != 'USER_LOGIN'" : "";

    // Use query method instead of execute for better compatibility with LIMIT/OFFSET
    const [logs] = await db.query(
      `SELECT 
        al.id,
        al.action,
        al.performed_by,
        al.target_id,
        al.description,
        al.created_at,
        u.name AS performed_by_name,
        u.role AS performed_by_role
       FROM audit_logs al
       LEFT JOIN users u ON al.performed_by = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count for pagination metadata (with same filter)
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return {
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    throw error;
  }
};
