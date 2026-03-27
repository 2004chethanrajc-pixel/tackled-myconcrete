import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { scheduleNotificationCleanup } from './jobs/notificationCleanupJob.js';

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectDB();
    
    // Schedule notification cleanup job
    scheduleNotificationCleanup();
    
    const server = app.listen(config.port, config.host, () => {
      console.log(`🚀 Server running in ${config.env} mode on ${config.host}:${config.port}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION:', err);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully.`);
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
