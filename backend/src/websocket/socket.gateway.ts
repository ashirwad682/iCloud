import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.config';

export class SocketGateway {
  private io: SocketIOServer | null = null;

  init(server: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.CORS_ORIGINS.split(','),
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // Authenticate socket connections using JWT
    this.io.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required.'));
        }

        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        socket.data.userId = decoded.userId;
        socket.data.sessionId = decoded.sessionId;
        next();
      } catch (err) {
        next(new Error('Invalid socket credentials.'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      if (userId) {
        const userRoom = `user:${userId}`;
        socket.join(userRoom);
      }

      // Collaborative Shared Album room joining
      socket.on('album:join', (albumId: string) => {
        if (albumId) {
          socket.join(`album:${albumId}`);
        }
      });

      socket.on('album:leave', (albumId: string) => {
        if (albumId) {
          socket.leave(`album:${albumId}`);
        }
      });

      socket.on('disconnect', () => {
        // Cleaned up
      });
    });

    return this.io;
  }

  /**
   * Broadcasts real-time events to all members viewing a collaborative Shared Album
   */
  emitAlbumEvent(albumId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`album:${albumId}`).emit(event, {
      albumId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcasts real-time upload progress to a specific user.
   */
  emitUploadProgress(userId: string, uploadId: string, percentage: number, status: string): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('upload:progress', {
      uploadId,
      percentage,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcasts media processing state changes (uploading -> processing -> thumbnails -> ready).
   */
  emitMediaProcessing(
    userId: string,
    mediaId: string,
    status: string,
    details?: string,
    media?: any
  ): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('media:status', {
      mediaId,
      status,
      details,
      media,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcasts a push notification to user's connected clients.
   */
  emitNotification(userId: string, notification: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('notification:new', notification);
  }

  /**
   * Broadcasts security event alerts (new device, password changed, etc).
   */
  emitSecurityAlert(userId: string, alert: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('security:alert', alert);
  }
}

export const socketGateway = new SocketGateway();
