import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from './auth.guard';
import { MediaModel } from '../../database/models/Media';
import { AlbumModel } from '../../database/models/Album';
import { AppError } from '../middleware/error.middleware';

/**
 * Ensures that the authenticated user owns the requested media resource.
 */
export async function requireMediaOwnership(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const mediaId = req.params.id || req.body.mediaId;
    if (!mediaId || !mongoose.Types.ObjectId.isValid(mediaId)) {
      throw new AppError('Valid Media ID is required.', 400, 'INVALID_RESOURCE_ID');
    }

    const media = await MediaModel.findOne({
      _id: mediaId,
      ownerId: req.user!._id,
    });

    if (!media) {
      throw new AppError('Media resource not found or access denied.', 404, 'MEDIA_NOT_FOUND');
    }

    // Attach media to request for downstream handlers
    (req as any).mediaResource = media;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Ensures that the authenticated user owns the requested album resource.
 */
export async function requireAlbumOwnership(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const albumId = req.params.id || req.body.albumId;
    if (!albumId || !mongoose.Types.ObjectId.isValid(albumId)) {
      throw new AppError('Valid Album ID is required.', 400, 'INVALID_RESOURCE_ID');
    }

    const album = await AlbumModel.findOne({
      _id: albumId,
      ownerId: req.user!._id,
    });

    if (!album) {
      throw new AppError('Album resource not found or access denied.', 404, 'ALBUM_NOT_FOUND');
    }

    (req as any).albumResource = album;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based authorization guard
 */
export function requireRole(...allowedRoles: Array<'USER' | 'ADMIN' | 'SUPER_ADMIN'>) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient administrative privileges.', 403, 'FORBIDDEN'));
    }
    next();
  };
}
