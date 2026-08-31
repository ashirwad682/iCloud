# CloudVault Architecture & Engineering Design

CloudVault is an enterprise-grade private cloud media platform designed for zero-knowledge security, ultra-fast timeline browsing, chunked resumable media ingestion, background computer vision/AI processing, and cross-platform clients (Web, iOS, Android).

## System Flow & Data Pipelines

```
Client (Web / Mobile)
        │
        ▼ (HTTPS REST / WebSockets)
┌────────────────────────────────────────────────────────┐
│ NestJS / Node.js API Gateway                           │
│  ├─ Zero-Trust IDOR Authorization Guards               │
│  ├─ Argon2id Hashing, JWT Rotation & 2FA TOTP Engine   │
│  ├─ Device Fingerprinting & Session Manager            │
│  └─ Storage Quota & Signed URL Service                 │
└───────┬───────────────────────────────┬────────────────┘
        │                               │
        ▼                               ▼
┌────────────────┐            ┌───────────────────────────┐
│ MongoDB Atlas  │            │ Redis & BullMQ Queues     │
│  ├─ Users      │            │  ├─ image-processing      │
│  ├─ Sessions   │            │  ├─ video-processing      │
│  ├─ Media      │            │  ├─ ocr-embeddings        │
│  └─ Shares     │            │  └─ cleanup-workers       │
└────────────────┘            └─────────────┬─────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │ Python FastAPI AI Worker  │
                              │  ├─ WebP/AVIF Generation  │
                              │  ├─ FFmpeg HLS Transcoder │
                              │  ├─ Perceptual Hashing    │
                              │  └─ Tesseract OCR Engine  │
                              └─────────────┬─────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │ Private Object Storage    │
                              │ (S3 / MinIO / R2)         │
                              └───────────────────────────┘
```

## Scalability & Performance Strategy

1. **Direct-to-Storage Ingestion**: Large files and multi-gigabyte video uploads bypass the API CPU entirely via multipart presigned upload URLs.
2. **Asynchronous Background Processing**: CPU-heavy operations (AVIF/WebP generation, FFmpeg HLS transcoding, EXIF parsing, OCR) execute off-thread via BullMQ queues and Python FastAPI workers.
3. **Cursor-Based Gallery Pagination**: Media requests utilize `capturedAt` cursor queries with compound MongoDB indexes (`ownerId + isDeleted + capturedAt: -1`), ensuring constant $O(1)$ response latency even for libraries exceeding 100,000 items.
4. **Real-Time WebSocket Sync**: Socket.IO authenticated rooms notify clients in real-time as processing transitions from `uploading` to `processing` to `ready`.
