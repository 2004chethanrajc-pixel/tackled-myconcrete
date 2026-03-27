import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../', config.upload.uploadDir);
const plansDir = path.join(__dirname, '../../', config.upload.plansDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(plansDir)) {
  fs.mkdirSync(plansDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter - allow images, videos, and audio
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = config.upload.allowedImageTypes; // ['jpeg','jpg','png','gif','webp']
  const allowedVideoTypes = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'];
  const allowedAudioTypes = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'webm'];

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isImage = allowedImageTypes.includes(ext) || file.mimetype.startsWith('image/');
  const isVideo = allowedVideoTypes.includes(ext) || file.mimetype.startsWith('video/');
  const isAudio = allowedAudioTypes.includes(ext) || file.mimetype.startsWith('audio/');

  if (isImage || isVideo || isAudio) {
    cb(null, true);
  } else {
    cb(new Error(`Only image, video, and audio files are allowed`));
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB to support videos
  }
});

// PDF storage configuration
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, plansDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// PDF file filter
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Create multer upload instance for PDFs
export const uploadPDF = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: config.upload.maxPdfSizeMB * 1024 * 1024 // Convert MB to bytes
  }
});
