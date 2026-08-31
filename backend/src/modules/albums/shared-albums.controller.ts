import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import {
  requireSharedAlbumAccess,
  SharedAlbumRequest,
} from '../../common/guards/shared-album.guard';
import { AlbumModel } from '../../database/models/Album';
import { AlbumItemModel } from '../../database/models/AlbumItem';
import { AlbumMemberModel } from '../../database/models/AlbumMember';
import { AlbumInvitationModel } from '../../database/models/AlbumInvitation';
import { AlbumCommentModel } from '../../database/models/AlbumComment';
import { AlbumReactionModel } from '../../database/models/AlbumReaction';
import { MediaModel } from '../../database/models/Media';
import { UserModel } from '../../database/models/User';
import { storageService } from '../storage/storage.service';
import { socketGateway } from '../../websocket/socket.gateway';
import { CryptoUtil } from '../../common/utils/crypto';
import { AppError } from '../../common/middleware/error.middleware';

const router = Router();

// GET /api/v1/shared-albums (List all collaborative shared albums for current user)
router.get('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;

    // Find all albums where user is owner or active member
    const memberships = await AlbumMemberModel.find({
      userId,
      status: 'ACTIVE',
    }).lean();

    const albumIds = memberships.map((m) => m.albumId);

    // Also include owned shared albums
    const ownedAlbums = await AlbumModel.find({
      ownerId: userId,
      isShared: true,
    }).lean();

    const allAlbumIds = Array.from(
      new Set([...albumIds.map((id) => id.toString()), ...ownedAlbums.map((a) => a._id.toString())])
    ).map((id) => new mongoose.Types.ObjectId(id));

    const albums = await AlbumModel.find({
      _id: { $in: allAlbumIds },
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Enhance albums with live member count and cover thumbnails
    const enhanced = await Promise.all(
      albums.map(async (album) => {
        const memberCount = await AlbumMemberModel.countDocuments({
          albumId: album._id,
          status: 'ACTIVE',
        });

        const albumItems = await AlbumItemModel.find({ albumId: album._id }).select('mediaId').lean();
        const validItemCount = await MediaModel.countDocuments({
          _id: { $in: albumItems.map((i) => i.mediaId) },
          isDeleted: false,
          isHidden: { $ne: true },
        });

        let coverUrl: string | null = null;
        if (album.coverMediaId) {
          const cover = await MediaModel.findById(album.coverMediaId);
          if (cover) {
            coverUrl = await storageService.getPresignedDownloadUrl(
              cover.thumbnailKey || cover.storageKey,
              1800
            );
          }
        }

        // Determine user's role in this album
        const userMembership = memberships.find(
          (m) => m.albumId.toString() === album._id.toString()
        );
        const isOwner = album.ownerId.toString() === userId.toString();

        return {
          ...album,
          itemCount: validItemCount,
          memberCount: Math.max(memberCount, 1),
          coverUrl,
          userRole: isOwner ? 'OWNER' : userMembership?.role || 'VIEWER',
          isOwner,
        };
      })
    );

    res.json({ success: true, data: enhanced });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-albums (Create a new collaborative shared album)
router.post('/', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      title: z.string().min(1, 'Album title is required').max(100),
      description: z.string().max(500).optional(),
      settings: z
        .object({
          allowContributions: z.boolean().default(true),
          allowComments: z.boolean().default(true),
          allowReactions: z.boolean().default(true),
          allowDownloads: z.boolean().default(true),
        })
        .optional(),
    });

    const data = schema.parse(req.body);
    const user = req.user!;

    // 1. Create Album
    const album = await AlbumModel.create({
      ownerId: user._id,
      title: data.title.trim(),
      description: data.description?.trim(),
      isShared: true,
      itemCount: 0,
      memberCount: 1,
      settings: {
        allowContributions: data.settings?.allowContributions ?? true,
        allowComments: data.settings?.allowComments ?? true,
        allowReactions: data.settings?.allowReactions ?? true,
        allowDownloads: data.settings?.allowDownloads ?? true,
        isPublicLinkEnabled: false,
        requireLoginForPublic: false,
      },
    });

    // 2. Create Owner Membership record
    await AlbumMemberModel.create({
      albumId: album._id,
      userId: user._id,
      role: 'OWNER',
      permissions: {
        view: true,
        contribute: true,
        comment: true,
        react: true,
        download: true,
        invite: true,
      },
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    res.status(201).json({ success: true, data: album });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shared-albums/:id (Get shared album details, members, and media items)
router.get(
  '/:id',
  authGuard,
  requireSharedAlbumAccess('view'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const album = req.albumResource!;
      const isOwner = req.isAlbumOwner!;
      const currentMembership = req.albumMembership;

      // 1. Fetch active members with user profiles
      const members = await AlbumMemberModel.find({
        albumId: album._id,
        status: 'ACTIVE',
      })
        .populate('userId', 'firstName lastName email avatarUrl')
        .lean();

      // 2. Fetch album media items
      const albumItems = await AlbumItemModel.find({ albumId: album._id })
        .sort({ addedAt: -1 })
        .lean();

      const mediaIds = albumItems.map((ai) => ai.mediaId);
      const mediaList = await MediaModel.find({
        _id: { $in: mediaIds },
        isDeleted: false,
        isHidden: { $ne: true },
      }).lean();

      const mediaMap = new Map(mediaList.map((m) => [m._id.toString(), m]));

      // 3. Fetch reactions for these media items
      const reactions = await AlbumReactionModel.find({
        albumId: album._id,
        mediaId: { $in: mediaIds },
      }).lean();

      const reactionMap = new Map<string, any[]>();
      reactions.forEach((r) => {
        const key = r.mediaId.toString();
        if (!reactionMap.has(key)) reactionMap.set(key, []);
        reactionMap.get(key)!.push(r);
      });

      // 4. Enhance items with short-lived presigned URLs
      const enhancedItems = await Promise.all(
        albumItems
          .filter((item) => mediaMap.has(item.mediaId.toString()))
          .map(async (item) => {
            const media = mediaMap.get(item.mediaId.toString())!;
            const thumbnailUrl = media.thumbnailKey
              ? await storageService.getPresignedDownloadUrl(media.thumbnailKey, 1800)
              : await storageService.getPresignedDownloadUrl(media.storageKey, 1800);

            const previewUrl = media.previewKey
              ? await storageService.getPresignedDownloadUrl(media.previewKey, 1800)
              : thumbnailUrl;

            return {
              ...media,
              albumItemId: item._id,
              addedBy: item.ownerId,
              addedAt: item.addedAt,
              thumbnailUrl,
              previewUrl,
              reactions: reactionMap.get(media._id.toString()) || [],
            };
          })
      );

      res.json({
        success: true,
        data: {
          album: {
            ...album.toObject(),
            itemCount: enhancedItems.length,
          },
          isOwner,
          userRole: isOwner ? 'OWNER' : currentMembership?.role || 'VIEWER',
          permissions: isOwner
            ? { view: true, contribute: true, comment: true, react: true, download: true, invite: true }
            : currentMembership?.permissions,
          members: members.map((m: any) => ({
            _id: m._id,
            userId: m.userId?._id,
            name: `${m.userId?.firstName || ''} ${m.userId?.lastName || ''}`.trim() || 'User',
            email: m.userId?.email,
            role: m.role,
            status: m.status,
            permissions: m.permissions,
            joinedAt: m.joinedAt,
          })),
          items: enhancedItems,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/shared-albums/:id (Update album settings, title, permissions - Owner only)
router.patch(
  '/:id',
  authGuard,
  requireSharedAlbumAccess('manage_members'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        title: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        settings: z
          .object({
            allowContributions: z.boolean().optional(),
            allowComments: z.boolean().optional(),
            allowReactions: z.boolean().optional(),
            allowDownloads: z.boolean().optional(),
          })
          .optional(),
      });

      const data = schema.parse(req.body);
      const album = req.albumResource!;

      if (data.title) album.title = data.title.trim();
      if (data.description !== undefined) album.description = data.description.trim();
      if (data.settings) {
        album.settings = { ...album.settings, ...data.settings };
      }

      await album.save();

      // Broadcast settings update to active members
      socketGateway.emitAlbumEvent(album._id.toString(), 'album:settings-updated', {
        album: album.toObject(),
      });

      res.json({ success: true, data: album });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/shared-albums/:id (Delete shared album container - Owner only)
router.delete(
  '/:id',
  authGuard,
  requireSharedAlbumAccess('delete'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const album = req.albumResource!;

      // Clean up collaborative metadata (original media stays safe in user libraries)
      await Promise.all([
        AlbumMemberModel.deleteMany({ albumId: album._id }),
        AlbumInvitationModel.deleteMany({ albumId: album._id }),
        AlbumCommentModel.deleteMany({ albumId: album._id }),
        AlbumReactionModel.deleteMany({ albumId: album._id }),
        AlbumItemModel.deleteMany({ albumId: album._id }),
        AlbumModel.deleteOne({ _id: album._id }),
      ]);

      socketGateway.emitAlbumEvent(album._id.toString(), 'album:deleted', {
        albumId: album._id,
      });

      res.json({ success: true, message: 'Shared Album deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/shared-albums/:id/invitations (Invite a collaborator by email)
router.post(
  '/:id/invitations',
  authGuard,
  requireSharedAlbumAccess('invite'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        email: z.string().email('Valid email address required'),
        role: z.enum(['EDITOR', 'VIEWER']).default('VIEWER'),
      });

      const { email, role } = schema.parse(req.body);
      const album = req.albumResource!;
      const inviter = req.user!;

      // Check if user is already an active member
      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        const existingMember = await AlbumMemberModel.findOne({
          albumId: album._id,
          userId: existingUser._id,
          status: 'ACTIVE',
        });
        if (existingMember) {
          throw new AppError('User is already a member of this Shared Album.', 400, 'ALREADY_MEMBER');
        }
      }

      // Generate secure 256-bit invitation token
      const token = CryptoUtil.generateRandomToken(32);
      const tokenHash = CryptoUtil.computeChecksum(Buffer.from(token));
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await AlbumInvitationModel.create({
        albumId: album._id,
        inviterId: inviter._id,
        recipientEmail: email.toLowerCase(),
        token,
        tokenHash,
        role,
        expiresAt,
        status: 'PENDING',
      });

      const inviteUrl = `/shared-albums/invite/${token}`;

      res.status(201).json({
        success: true,
        data: {
          invitationId: invitation._id,
          email: invitation.recipientEmail,
          role: invitation.role,
          token,
          inviteUrl,
          expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/shared-albums/:id/media (Contribute media to shared album)
router.post(
  '/:id/media',
  authGuard,
  requireSharedAlbumAccess('contribute'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        mediaIds: z.array(z.string().min(1)).min(1),
      });

      const { mediaIds } = schema.parse(req.body);
      const album = req.albumResource!;
      const user = req.user!;

      // Verify the user owns the media files they are contributing
      const validMedia = await MediaModel.find({
        _id: { $in: mediaIds.map((id) => new mongoose.Types.ObjectId(id)) },
        ownerId: user._id,
        isDeleted: false,
      });

      let addedCount = 0;
      for (const media of validMedia) {
        try {
          await AlbumItemModel.create({
            albumId: album._id,
            mediaId: media._id,
            ownerId: user._id,
            addedAt: new Date(),
          });
          addedCount++;
        } catch {
          // Ignore duplicate
        }
      }

      if (!album.coverMediaId && validMedia.length > 0) {
        album.coverMediaId = validMedia[0]._id;
      }

      const totalCount = await AlbumItemModel.countDocuments({ albumId: album._id });
      album.itemCount = totalCount;
      await album.save();

      // Broadcast new media to room
      socketGateway.emitAlbumEvent(album._id.toString(), 'album:media-added', {
        addedBy: `${user.firstName} ${user.lastName}`,
        addedCount,
        itemCount: totalCount,
      });

      res.json({
        success: true,
        message: `Added ${addedCount} items to ${album.title}.`,
        itemCount: totalCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/shared-albums/:id/media/:mediaId (Remove item from shared album)
router.delete(
  '/:id/media/:mediaId',
  authGuard,
  requireSharedAlbumAccess('view'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const album = req.albumResource!;
      const mediaId = req.params.mediaId;
      const userId = req.user!._id;
      const isOwner = req.isAlbumOwner;

      // Find item
      const item = await AlbumItemModel.findOne({
        albumId: album._id,
        mediaId: new mongoose.Types.ObjectId(mediaId),
      });

      if (!item) {
        throw new AppError('Media item not in this shared album.', 404, 'ITEM_NOT_FOUND');
      }

      // Only album owner or original contributor can remove the item
      if (!isOwner && item.ownerId.toString() !== userId.toString()) {
        throw new AppError('You can only remove media you contributed.', 403, 'PERMISSION_DENIED');
      }

      await AlbumItemModel.deleteOne({ _id: item._id });
      const totalCount = await AlbumItemModel.countDocuments({ albumId: album._id });
      album.itemCount = totalCount;
      await album.save();

      socketGateway.emitAlbumEvent(album._id.toString(), 'album:media-removed', {
        mediaId,
        itemCount: totalCount,
      });

      res.json({ success: true, message: 'Item removed from shared album.', itemCount: totalCount });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/shared-albums/:id/comments (Fetch comments thread)
router.get(
  '/:id/comments',
  authGuard,
  requireSharedAlbumAccess('view'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const album = req.albumResource!;
      const mediaId = req.query.mediaId as string;

      const query: any = { albumId: album._id };
      if (mediaId && mongoose.Types.ObjectId.isValid(mediaId)) {
        query.mediaId = new mongoose.Types.ObjectId(mediaId);
      }

      const comments = await AlbumCommentModel.find(query)
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();

      res.json({ success: true, data: comments });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/shared-albums/:id/comments (Add a comment)
router.post(
  '/:id/comments',
  authGuard,
  requireSharedAlbumAccess('comment'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        text: z.string().min(1).max(2000),
        mediaId: z.string().optional(),
      });

      const { text, mediaId } = schema.parse(req.body);
      const album = req.albumResource!;
      const user = req.user!;

      const comment = await AlbumCommentModel.create({
        albumId: album._id,
        mediaId: mediaId && mongoose.Types.ObjectId.isValid(mediaId) ? new mongoose.Types.ObjectId(mediaId) : undefined,
        authorId: user._id,
        authorName: `${user.firstName} ${user.lastName}`.trim(),
        text: text.trim(),
      });

      socketGateway.emitAlbumEvent(album._id.toString(), 'album:comment-added', {
        comment: comment.toObject(),
      });

      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/shared-albums/:id/media/:mediaId/reactions (Toggle emoji reaction)
router.post(
  '/:id/media/:mediaId/reactions',
  authGuard,
  requireSharedAlbumAccess('react'),
  async (req: SharedAlbumRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        reactionType: z.enum(['HEART', 'THUMBS_UP', 'LAUGH', 'CLAP', 'FIRE']).default('HEART'),
      });

      const { reactionType } = schema.parse(req.body);
      const album = req.albumResource!;
      const mediaId = new mongoose.Types.ObjectId(req.params.mediaId);
      const user = req.user!;

      // Toggle reaction: delete if exists, create if doesn't
      const existing = await AlbumReactionModel.findOne({
        albumId: album._id,
        mediaId,
        userId: user._id,
        reactionType,
      });

      if (existing) {
        await AlbumReactionModel.deleteOne({ _id: existing._id });
      } else {
        await AlbumReactionModel.create({
          albumId: album._id,
          mediaId,
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          reactionType,
        });
      }

      const allReactions = await AlbumReactionModel.find({ albumId: album._id, mediaId }).lean();

      socketGateway.emitAlbumEvent(album._id.toString(), 'album:reaction-updated', {
        mediaId: mediaId.toString(),
        reactions: allReactions,
      });

      res.json({ success: true, data: allReactions });
    } catch (error) {
      next(error);
    }
  }
);

export const sharedAlbumsRouter = router;
