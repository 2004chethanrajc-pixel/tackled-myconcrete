import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../config/env.js';
import * as signatureController from './controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for signature uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../', config.upload.signaturesDir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for signatures'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.upload.maxImageSizeMB * 1024 * 1024 // Use config value
  }
});

// All routes require authentication
router.use(protect);

// Upload signature - customer only
router.post(
  '/:projectId',
  authorize('customer'),
  upload.single('signature'),
  signatureController.uploadSignature
);

// Get signature - all authenticated users with project access
router.get('/:projectId', signatureController.getSignature);

// Delete signature - admin or customer
router.delete(
  '/:projectId',
  authorize('admin', 'super_admin', 'customer'),
  signatureController.deleteSignature
);

export default router;
