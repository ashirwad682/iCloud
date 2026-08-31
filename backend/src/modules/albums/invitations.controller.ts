import { Router, Request, Response, NextFunction } from 'express';
import { authGuard, AuthenticatedRequest } from '../../common/guards/auth.guard';
import { AlbumInvitationModel } from '../../database/models/AlbumInvitation';
import { AlbumMemberModel } from '../../database/models/AlbumMember';
import { AlbumModel } from '../../database/models/Album';
import { UserModel } from '../../database/models/User';
import { socketGateway } from '../../websocket/socket.gateway';
import { AppError } from '../../common/middleware/error.middleware';

const router = Router();

// GET /api/v1/shared-album-invitations/:token (View invitation landing information)
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token;
    const invitation = await AlbumInvitationModel.findOne({
      token,
      status: 'PENDING',
    });

    if (!invitation) {
      throw new AppError('Invitation not found or no longer active.', 404, 'INVITATION_NOT_FOUND');
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw new AppError('This invitation has expired.', 410, 'INVITATION_EXPIRED');
    }

    const album = await AlbumModel.findById(invitation.albumId).lean();
    if (!album) {
      throw new AppError('The shared album is no longer available.', 404, 'ALBUM_NOT_FOUND');
    }

    const inviter = await UserModel.findById(invitation.inviterId).select('firstName lastName avatarUrl').lean();

    res.json({
      success: true,
      data: {
        token: invitation.token,
        albumTitle: album.title,
        albumDescription: album.description,
        itemCount: album.itemCount,
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'A CloudVault user',
        recipientEmail: invitation.recipientEmail,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-album-invitations/:token/accept (Accept invitation and join album)
router.post('/:token/accept', authGuard, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token;
    const user = req.user!;

    const invitation = await AlbumInvitationModel.findOne({
      token,
      status: 'PENDING',
    });

    if (!invitation) {
      throw new AppError('Invitation not found or already processed.', 404, 'INVITATION_NOT_FOUND');
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      throw new AppError('This invitation has expired.', 410, 'INVITATION_EXPIRED');
    }

    const album = await AlbumModel.findById(invitation.albumId);
    if (!album) {
      throw new AppError('Album no longer exists.', 404, 'ALBUM_NOT_FOUND');
    }

    // Assign granular permissions based on invitation role
    const isEditor = invitation.role === 'EDITOR';
    const permissions = {
      view: true,
      contribute: isEditor,
      comment: true,
      react: true,
      download: true,
      invite: isEditor,
    };

    // Upsert membership
    await AlbumMemberModel.findOneAndUpdate(
      { albumId: album._id, userId: user._id },
      {
        $set: {
          role: invitation.role,
          permissions,
          status: 'ACTIVE',
          joinedAt: new Date(),
          invitedBy: invitation.inviterId,
        },
      },
      { upsert: true, new: true }
    );

    // Update invitation status
    invitation.status = 'ACCEPTED';
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Update album member count
    const memberCount = await AlbumMemberModel.countDocuments({
      albumId: album._id,
      status: 'ACTIVE',
    });
    album.memberCount = memberCount;
    await album.save();

    // Broadcast member joined event to room
    socketGateway.emitAlbumEvent(album._id.toString(), 'album:member-added', {
      user: {
        _id: user._id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: invitation.role,
      },
      memberCount,
    });

    res.json({
      success: true,
      message: `Successfully joined ${album.title}!`,
      albumId: album._id,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shared-album-invitations/:token/decline (Decline invitation)
router.post('/:token/decline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token;
    const invitation = await AlbumInvitationModel.findOne({
      token,
      status: 'PENDING',
    });

    if (!invitation) {
      throw new AppError('Invitation not found.', 404, 'INVITATION_NOT_FOUND');
    }

    invitation.status = 'DECLINED';
    invitation.declinedAt = new Date();
    await invitation.save();

    res.json({ success: true, message: 'Invitation declined.' });
  } catch (error) {
    next(error);
  }
});

export const invitationsRouter = router;
