import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.config';
import { UserModel, IUser } from '../../database/models/User';
import { SessionModel, ISession } from '../../database/models/Session';
import { AppError } from '../middleware/error.middleware';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  session?: ISession;
  jwtPayload?: {
    userId: string;
    sessionId: string;
    role: string;
  };
}

export async function authGuard(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token required.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authorization token required.', 401, 'UNAUTHORIZED');
    }

    let payload: { userId: string; sessionId: string; role: string };
    try {
      payload = jwt.verify(token, config.JWT_SECRET) as any;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Access token has expired.', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid access token.', 401, 'INVALID_TOKEN');
    }

    // Verify active session
    const session = await SessionModel.findOne({
      _id: payload.sessionId,
      userId: payload.userId,
      isActive: true,
    });

    if (!session) {
      throw new AppError('Session has been revoked or expired.', 401, 'SESSION_REVOKED');
    }

    // Fetch user
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found.', 401, 'USER_NOT_FOUND');
    }

    // Touch last active on session asynchronously
    SessionModel.updateOne({ _id: session._id }, { $set: { lastActiveAt: new Date() } }).exec();

    req.user = user;
    req.session = session;
    req.jwtPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
}
