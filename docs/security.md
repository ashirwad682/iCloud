# CloudVault Security Specification & Compliance

## 1. Zero-Trust Authorization & IDOR Protection
Every API request touching a media record, album, session, or share verifies resource ownership server-side using strict MongoDB query constraints:
```typescript
const media = await MediaModel.findOne({
  _id: mediaId,
  ownerId: req.user._id,
  isDeleted: false,
});
```
Direct Object Reference attempts from unauthorized users immediately return a 404/403 status code without revealing resource existence.

## 2. Password Hashing & Secret Protection
- **Argon2id**: Passwords are saved with memory cost $2^{16}$ (64 MB), time cost 3, parallelism 1.
- **Refresh Token Rotation**: Each refresh token is single-use and hashed using SHA-256 in the database. Token reuse triggers immediate session termination.
- **2FA TOTP & Recovery Keys**: Secrets are RFC 6238 compliant; emergency backup codes are stored as SHA-256 hashes.
- **WebAuthn / Passkeys**: Support for biometric authentication (Touch ID, Face ID, Windows Hello).

## 3. Private S3 Storage & Short-Lived Signed URLs
- Buckets are private (`anonymous set none`).
- Media files are accessed exclusively via 15-minute presigned URLs generated on demand after auth validation.
- Public shares use tokenized URLs with optional Argon2id password verification and automatic expiration dates.
- EXIF and GPS stripping is enabled by default for public links to preserve user location privacy.
