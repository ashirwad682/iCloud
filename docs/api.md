# CloudVault API Reference (v1)

Base URL: `/api/v1`

## Authentication (`/auth`)
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Authenticate and receive JWT tokens or 2FA challenge
- `POST /api/v1/auth/verify-2fa-challenge` — Complete 2FA challenge
- `POST /api/v1/auth/refresh` — Rotate refresh token and obtain new access token
- `POST /api/v1/auth/logout` — Terminate current session
- `GET /api/v1/auth/me` — Current user profile and session info
- `POST /api/v1/auth/2fa/setup` — Generate TOTP secret and QR code
- `POST /api/v1/auth/2fa/enable` — Confirm TOTP and receive backup recovery keys
- `POST /api/v1/auth/2fa/disable` — Deactivate 2FA with password confirmation

## Media (`/media`)
- `GET /api/v1/media?limit=50&cursor=...` — Cursor paginated library with timeline groupings
- `GET /api/v1/media/:id` — Get single media details and signed URLs
- `PATCH /api/v1/media/:id` — Update media (favorite, caption, tags)
- `DELETE /api/v1/media/:id` — Soft-delete media to Recently Deleted Trash
- `POST /api/v1/media/bulk-favorite` — Bulk favorite toggle
- `POST /api/v1/media/bulk-delete` — Bulk soft-delete
- `POST /api/v1/media/bulk-download` — Stream compressed ZIP archive of selected media

## Uploads (`/uploads`)
- `POST /api/v1/uploads/direct` — Direct multipart upload with quota check & background processing
- `POST /api/v1/uploads/initiate-resumable` — Initiate chunked upload with presigned S3 URL
- `POST /api/v1/uploads/complete-resumable` — Finalize multipart upload and trigger BullMQ

## Albums (`/albums`)
- `GET /api/v1/albums` — List user albums with covers
- `POST /api/v1/albums` — Create album
- `GET /api/v1/albums/:id` — Get album and contained items
- `POST /api/v1/albums/:id/media` — Add media items to album
- `DELETE /api/v1/albums/:id/media/:mediaId` — Remove media from album
- `DELETE /api/v1/albums/:id` — Delete album container

## Shares (`/shares`)
- `POST /api/v1/shares` — Create secure share link (optional password & expiration)
- `GET /api/v1/shares` — List owner's active shares
- `DELETE /api/v1/shares/:id` — Revoke share link immediately
- `GET /api/v1/shares/public/:token` — Public recipient portal (password gate supported)

## Security & Sessions (`/security`)
- `GET /api/v1/security/overview` — Calculated security score (0-100%) and health metrics
- `GET /api/v1/security/sessions` — Active sessions and devices
- `DELETE /api/v1/security/sessions/:id` — Terminate remote session
- `POST /api/v1/security/sessions/revoke-others` — Log out all other devices
- `GET /api/v1/security/events` — Security activity feed

## Trash (`/trash`)
- `GET /api/v1/trash` — List recently deleted items with days remaining countdown
- `POST /api/v1/trash/:id/restore` — Restore item back to library
- `DELETE /api/v1/trash/:id` — Permanently delete media & cascade storage purge
- `POST /api/v1/trash/empty` — Permanently purge entire trash
