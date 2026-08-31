# iCloud / CloudVault — Premium Private Cloud Photos & Videos Platform

A production-grade, private, secure media cloud ecosystem built with NestJS/Node.js, MongoDB, Redis, Python FastAPI, and React 18 + Vite + Tailwind CSS.

---

## 🌟 Key Features

- **Luxury User Interface**: Inspired by modern photo cloud ecosystems (Apple Photos / Google Photos), featuring responsive virtualized timeline grids (Today, Yesterday, Date), dark/light mode, and fluid micro-animations.
- **Zero-Trust Security & IDOR Protection**: Argon2id password hashing, JWT access token rotation, TOTP 2FA, WebAuthn Passkeys, active session/device management, and strict ownership guards.
- **Private S3-Compatible Storage**: Configurable for AWS S3, MinIO, or Cloudflare R2. Media is served strictly via 15-minute temporary presigned signed URLs.
- **Resumable & Chunked Uploads**: Drag-and-drop full-window ingestion, background chunk uploads, and live progress indicators.
- **Background Media & AI Engine**: Python FastAPI & Sharp/FFmpeg pipeline generating multi-resolution WebP thumbnails (`300px`, `1200px`), video posters, HLS playlists, EXIF camera extraction, perceptual hashing (duplicate detection), and OCR text indexing.
- **Albums & Favorites**: Relational album management, cover customization, and instant favorites filtering.
- **Secure Link Sharing**: Tokenized sharing with optional password protection, custom expiration windows, download toggles, and metadata stripping.
- **Recently Deleted (Trash)**: Soft deletion with a 30-day retention countdown, 1-click restore, and cascading permanent deletion.
- **Storage Command Center**: Visual storage allocation breakdown (Photos, Videos, Trash, Free), largest files inspector, and duplicate photo resolver.
- **Real-Time Synchronizations**: Socket.IO authenticated gateway for live upload progress and processing notifications.

---

## 🚀 Quick Start (Local Development)

### 1. Start Infrastructure (Docker Compose)
```bash
docker-compose -f infrastructure/docker-compose.yml up -d
```
Starts MongoDB (`:27017`), Redis (`:6379`), MinIO Object Storage (`:9000`), Backend (`:3000`), and Python Media Service (`:8000`).

### 2. Run Backend
```bash
cd backend
npm install
npm run start:dev
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Run Python Media Service (Optional)
```bash
cd media-service
pip install -r requirements.txt
python3 main.py
```

---

## 🧪 Running Automated Tests
```bash
cd backend
npm test
```
Tests Argon2id hashing, 2FA recovery code generation, SHA-256 binary checksums, and token verification.

