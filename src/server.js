import http from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSocketServer } from './config/socket.js';
import { schedulerService } from './services/ai/scheduler.service.js';

const httpServer = http.createServer(app);

// Initialize Socket.io
initSocketServer(httpServer);

// Initialize KyU AI Scheduler
schedulerService.startScheduler();

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Kyu-Konnekt API listening');
});

function shutdown(signal) {
  logger.info({ signal }, 'Closing HTTP and WebSocket server');
  schedulerService.stopScheduler();
  httpServer.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Server failed to close cleanly');
      process.exitCode = 1;
    }
    process.exit();
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught backend exception; shutting down');
  shutdown('uncaughtException');
});
