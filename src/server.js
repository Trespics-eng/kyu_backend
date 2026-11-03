import http from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initSocketServer } from './config/socket.js';

const httpServer = http.createServer(app);

// Initialize Socket.io
initSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Kyu-Konnekt API listening');
});

function shutdown(signal) {
  logger.info({ signal }, 'Closing HTTP and WebSocket server');
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
