import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  host: process.env.SERVER_HOST || '0.0.0.0',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'construction_db',
    port: process.env.DB_PORT || 3306
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_this',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  email: {
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || ''
  },
  
  fast2sms: {
    apiKey: process.env.FAST2SMS_API_KEY || 'CJEePd0gt6mCSsVVsYqAmgRQO9vfF6lFIMHHMw0BclmVGZLHR527VKquaWNL',
    apiUrl: process.env.FAST2SMS_API_URL || 'https://www.fast2sms.com/dev/bulkV2'
  },
  
  upload: {
    maxImageSizeMB: parseInt(process.env.MAX_IMAGE_SIZE_MB) || 10,
    maxPdfSizeMB: parseInt(process.env.MAX_PDF_SIZE_MB) || 20,
    allowedImageTypes: process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['jpeg', 'jpg', 'png', 'gif', 'webp'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    plansDir: process.env.PLANS_DIR || 'uploads/plans',
    signaturesDir: process.env.SIGNATURES_DIR || 'uploads/signatures'
  },
  
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 15,
    length: parseInt(process.env.OTP_LENGTH) || 6
  },
  
  notifications: {
    retentionDays: parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 90,
    readRetentionDays: parseInt(process.env.READ_NOTIFICATION_RETENTION_DAYS) || 30,
    cleanupCronSchedule: process.env.CLEANUP_CRON_SCHEDULE || '0 2 * * *'
  },
  
  cors: {
    frontendUrl: process.env.FRONTEND_URL || '*',
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['*']
  },
  
  security: {
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS) || 100,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000
  },
  
  ssl: {
    useHttps: process.env.USE_HTTPS === 'true'
  }
};

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}
