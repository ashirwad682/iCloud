import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from './auth.guard';
import { AlbumModel, IAlbum } from '../../database/models/Album';
import { AlbumMemberModel, IAlbumMember, IAlbumMemberPermissions } from '../../database/models/AlbumMember';
import { AppError } from '../middleware/error.middleware';

export interface SharedAlbumRequest extends AuthenticatedRequest {
  albumResource?: IAlbum;
  albumMembership?: IAlbumMember;
  isAlbumOwner?: boolean;
}

export type RequiredAlbumPermission = keyof IAlbumMemberPermissions | 'manage_members' | 'delete' | 'any';

/**
 * Enterprise Authorization Guard for Collaborative Shared Albums
 */
export function requireSharedAlbumAccess(permission: RequiredAlbumPermission = 'view') {
  return async (req: SharedAlbumRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const albumId = req.params.albumId || req.params.id;
      if (!albumId || !mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError('Valid Album ID is required.', 400, 'INVALID_ALBUM_ID');
      }

      const album = await AlbumModel.findById(albumId);
      if (!album) {
        throw new AppError('Shared Album not found.', 404, 'ALBUM_NOT_FOUND');
      }

      const userId = req.user!._id;
      const isOwner = album.ownerId.toString() === userId.toString();

      req.albumResource = album;
      req.isAlbumOwner = isOwner;

      // Owner has full administrative permissions
      if (isOwner) {
        return next();
      }

      // If user is not the owner, look up active membership
      const membership = await AlbumMemberModel.findOne({
        albumId: album._id,
        userId,
        status: 'ACTIVE',
      });

      if (!membership) {
        throw new AppError('You do not have access to this Shared Album.', 403, 'FORBIDDEN_ALBUM_ACCESS');
      }

      req.albumMembership = membership;

      // Check specific operation permissions
      if (permission === 'any' || permission === 'view') {
        if (!membership.permissions.view) {
          throw new AppError('You do not have permission to view this album.', 403, 'PERMISSION_DENIED');
        }
        return next();
      }

      if (permission === 'contribute') {
        if (!album.settings.allowContributions || !membership.permissions.contribute) {
          throw new AppError('Contributions are disabled for this Shared Album or your role.', 403, 'CONTRIBUTIONS_DISABLED');
        }
        return next();
      }

      if (permission === 'comment') {
        if (!album.settings.allowComments || !membership.permissions.comment) {
          throw new AppError('Comments are disabled for this Shared Album or your role.', 403, 'COMMENTS_DISABLED');
        }
        return next();
      }

      if (permission === 'react') {
        if (!album.settings.allowReactions || !membership.permissions.react) {
          throw new AppError('Reactions are disabled for this Shared Album or your role.', 403, 'REACTIONS_DISABLED');
        }
        return next();
      }

      if (permission === 'download') {
        if (!album.settings.allowDownloads || !membership.permissions.download) {
          throw new AppError('Downloads are disabled for this Shared Album.', 403, 'DOWNLOADS_DISABLED');
        }
        return next();
      }

      if (permission === 'invite') {
        if (!membership.permissions.invite && membership.role !== 'EDITOR') {
          throw new AppError('You do not have permission to invite members to this album.', 403, 'INVITE_PERMISSION_DENIED');
        }
        return next();
      }

      if (permission === 'manage_members' || permission === 'delete') {
        throw new AppError('Only the album owner can manage members or delete this album.', 403, 'OWNER_PERMISSION_REQUIRED');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
