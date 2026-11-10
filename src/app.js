import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsMiddleware } from './config/cors.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route modules
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import postsRoutes from './modules/posts/posts.routes.js';
import issuesRoutes from './modules/issues/issues.routes.js';
import marketplaceRoutes from './modules/marketplace/marketplace.routes.js';
import articlesRoutes from './modules/articles/articles.routes.js';
import opportunitiesRoutes from './modules/opportunities/opportunities.routes.js';
import accommodationRoutes from './modules/accommodation/accommodation.routes.js';
import eventsRoutes from './modules/events/events.routes.js';
import lostFoundRoutes from './modules/lost-found/lostFound.routes.js';
import communitiesRoutes from './modules/communities/communities.routes.js';
import messagesRoutes from './modules/messages/messages.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import uploadsRoutes from './modules/uploads/uploads.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(requestLogger);
app.use(helmet());
app.use(corsMiddleware);
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
app.use(cookieParser());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/api', apiRateLimiter);

// Root
app.get('/', (_req, res) => res.json({ success: true, message: 'Kyu-Konnekt API', data: { health: '/api/v1/health' }, meta: null }));

// Mount API v1 modules
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/issues', issuesRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/articles', articlesRoutes);
app.use('/api/v1/opportunities', opportunitiesRoutes);
app.use('/api/v1/accommodation', accommodationRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/lost-found', lostFoundRoutes);
app.use('/api/v1/communities', communitiesRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/uploads', uploadsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/ai', aiRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);
