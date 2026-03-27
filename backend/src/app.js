import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/routes.js';
import userRoutes from './modules/users/routes.js';
import projectRoutes from './modules/projects/routes.js';
import visitRoutes from './modules/visits/routes.js';
import reportRoutes from './modules/reports/routes.js';
import quotationRoutes from './modules/quotations/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import worklogRoutes from './modules/worklogs/routes.js';
import auditRoutes from './modules/audit/routes.js';
import signatureRoutes from './modules/signatures/routes.js';
import sitePlanRoutes from './modules/site-plans/routes.js';
import pushTokenRoutes from './modules/push-tokens/routes.js';
import adminNotificationRoutes from './modules/admin/notificationRoutes.js';
import orderRoutes from './modules/orders/routes.js';
  
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration - Allow requests from web and mobile
app.use(cors({
  origin: '*', // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests
app.options('*', cors());

// Request logging middleware (before body parsing)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  
  // Skip body logging for multipart requests
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('Body:', req.body);
  } else {
    console.log('Body: [multipart/form-data - skipped]');
  }
  next();
});

// Conditional body parser - skip for multipart requests
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('Skipping JSON/URL parsing for multipart request');
    return next();
  }
  
  // Apply JSON and URL parsing for non-multipart requests
  express.json({ limit: '10mb' })(req, res, (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid JSON format in request body' 
      });
    }
    
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  });
});

// Serve static files from uploads directory with proper headers
app.use('/uploads', (req, res, next) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cache-Control', 'public, max-age=31536000');
  
  // Add security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Log the request
  console.log('Static file request:', req.method, req.path);
  next();
}, express.static(path.join(__dirname, '../', config.upload.uploadDir), {
  setHeaders: (res, filePath) => {
    console.log('Serving file:', filePath);
    
    // Set proper content type for PDF files
    if (filePath.endsWith('.pdf')) {
      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', 'inline; filename="site-plan.pdf"');
    }
  }
}));

// Serve static web build files
const webBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(webBuildPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Test endpoint for validation
app.post('/test-validation', (req, res) => {
  console.log('Test endpoint - Body received:', req.body);
  res.json({ 
    success: true, 
    message: 'Body received successfully',
    receivedData: req.body 
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/visits', visitRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/quotations', quotationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/worklogs', worklogRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/signatures', signatureRoutes);
app.use('/api/v1', sitePlanRoutes);
app.use('/api/v1/push-tokens', pushTokenRoutes);
app.use('/api/v1/admin/notifications', adminNotificationRoutes);
app.use('/api/v1/orders', orderRoutes);

// Serve React app for all other routes (must be after API routes)
// Only serve web build for non-API routes
app.get('*', (req, res, next) => {
  // Let API routes fall through to error handler
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Silently skip - this is a mobile app, no web build needed
      next();
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
