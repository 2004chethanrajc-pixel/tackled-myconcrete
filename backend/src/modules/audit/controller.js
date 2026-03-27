import { asyncHandler } from '../../utils/asyncHandler.js';
import * as auditService from './service.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { limit, page, excludeLogin } = req.query;
  const shouldExcludeLogin = excludeLogin === 'true';
  const result = await auditService.getAuditLogs(limit, page, shouldExcludeLogin);
  res.status(200).json({
    success: true,
    message: 'Audit logs retrieved successfully',
    data: result
  });
});

export const logShareEvent = asyncHandler(async (req, res) => {
  const { format, resource_type, resource_id, resource_name } = req.body;
  const performedBy = req.user.id;
  const userName = req.user.name || req.user.email || performedBy;

  const action = `DATA_SHARED`;
  const description = `${userName} exported ${resource_type || 'data'} "${resource_name || resource_id}" as ${format?.toUpperCase() || 'FILE'}`;

  await logAudit(action, performedBy, resource_id || null, description);

  res.status(200).json({ success: true, message: 'Share event logged' });
});
