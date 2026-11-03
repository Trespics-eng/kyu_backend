import { Server } from 'socket.io';
import { env } from './env.js';
import { logger } from './logger.js';
import { getSupabaseAdmin } from './supabase.js';

let ioInstance = null;

export function initSocketServer(httpServer) {
  const allowedOrigins = env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return next(); // Guest socket allowed, but not in user rooms
    }

    try {
      const { data, error } = await getSupabaseAdmin().auth.getUser(token);
      if (!error && data?.user) {
        socket.user = data.user;
      }
    } catch (err) {
      logger.warn({ err }, 'Socket authentication error');
    }
    return next();
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.user?.id }, 'Socket client connected');

    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('join:conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on('leave:conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket client disconnected');
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  return ioInstance;
}

export function emitToUser(userId, event, payload) {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
}

export function emitToConversation(conversationId, event, payload) {
  if (ioInstance && conversationId) {
    ioInstance.to(`conv:${conversationId}`).emit(event, payload);
  }
}

