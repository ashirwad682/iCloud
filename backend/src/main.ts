import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env.config';
import { connectDatabase } from './database/connection';
import { socketGateway } from './websocket/socket.gateway';
import { errorMiddleware } from './common/middleware/error.middleware';
import { standardRateLimiter } from './common/middleware/rate-limiter.middleware';
import { advancedSecurityMiddleware } from './common/middleware/security.middleware';

// Module Routers
import { authRouter } from './modules/auth/auth.controller';
import { sessionsRouter } from './modules/sessions/sessions.controller';
import { uploadsRouter } from './modules/uploads/uploads.controller';
import { mediaRouter } from './modules/media/media.controller';
import { albumsRouter } from './modules/albums/albums.controller';
import { sharedAlbumsRouter } from './modules/albums/shared-albums.controller';
import { invitationsRouter } from './modules/albums/invitations.controller';
import { sharesRouter } from './modules/shares/shares.controller';
import { trashRouter } from './modules/trash/trash.controller';
import { securityRouter } from './modules/security/security.controller';
import { storageRouter } from './modules/storage/storage.controller';
import { searchRouter } from './modules/search/search.controller';
import { notificationsRouter } from './modules/notifications/notifications.controller';
import { adminRouter } from './modules/admin/admin.controller';
import { paymentsRouter } from './modules/payments/payments.controller';

const app = express();
const server = http.createServer(app);

// DB auto-connect middleware for serverless invocations
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// 1. Security & Global Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev/flexible fallback
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-share-password'],
  })
);

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(advancedSecurityMiddleware);
app.use(standardRateLimiter);

// 2. Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: 'CloudVault Private Cloud Storage',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    platform: 'CloudVault Private Cloud API',
    docs: '/api/v1',
    timestamp: new Date().toISOString(),
  });
});

// 3. Versioned API Routes (/api/v1)
const v1 = express.Router();

v1.get('/', (_req, res) => {
  res.json({
    status: 'online',
    message: 'CloudVault API v1 is active',
    platform: 'CloudVault Private Cloud Photos & Videos',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

v1.use('/auth', authRouter);

v1.use('/security/sessions', sessionsRouter);
v1.use('/uploads', uploadsRouter);
v1.use('/media', mediaRouter);
v1.use('/albums', albumsRouter);
v1.use('/shared-albums', sharedAlbumsRouter);
v1.use('/shared-album-invitations', invitationsRouter);
v1.use('/shares', sharesRouter);
v1.use('/trash', trashRouter);
v1.use('/security', securityRouter);
v1.use('/storage', storageRouter);
v1.use('/search', searchRouter);
v1.use('/notifications', notificationsRouter);
v1.use('/admin', adminRouter);
v1.use('/payments', paymentsRouter);

// Seed / API Status Endpoint
v1.get('/seed', (_req, res) => {
  res.json({
    success: true,
    message: 'CloudVault API v1 Seed & Status Endpoint Active',
    data: {
      status: 'Operational',
      database: 'MongoDB Connected',
      platform: 'CloudVault Private Cloud Photos & Videos',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/v1', v1);

// 4. Global Error Handler
app.use(errorMiddleware);

// 5. Start Server (Only when not running in Vercel Serverless environment)
if (!process.env.VERCEL) {
  const PORT = config.PORT || 3000;
  connectDatabase().then(() => {
    socketGateway.init(server);
    server.listen(PORT, () => {
      console.log(`🚀 CloudVault Server running on http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api/v1`);
    });
  }).catch((err) => {
    console.error('Fatal Server Boot Error:', err);
  });
}

export default app;
export { app };

