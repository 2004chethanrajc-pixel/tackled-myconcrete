import express from 'express';
import * as auditController from './controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const router = express.Router();

router.use(protect);

// Log a share/export event - any authenticated user
router.post('/log-share', auditController.logShareEvent);

// Get audit logs - admin and super_admin
router.get('/', authorize('super_admin', 'admin'), auditController.getAuditLogs);

export default router;
