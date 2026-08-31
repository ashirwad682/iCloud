export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  storageQuotaBytes: number;
  storageUsedBytes: number;
  aiFeaturesEnabled: boolean;
  faceGroupingEnabled: boolean;
  locationMetadataEnabled: boolean;
  themePreference: 'light' | 'dark' | 'system';
  createdAt: string;
}

export interface Session {
  _id: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  approximateLocation?: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface MediaMetadata {
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: number;
  iso?: number;
  fNumber?: number;
  exposureTime?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  colorPalette?: string[];
}

export interface AIMetadata {
  tags: string[];
  categories: string[];
  ocrText?: string;
  pHash?: string;
  detectedObjects?: string[];
  faceCount?: number;
}

export interface Media {
  _id: string;
  ownerId: string;
  originalName: string;
  storageKey: string;
  mediaType: 'PHOTO' | 'VIDEO' | 'LIVE_PHOTO';
  mimeType: string;
  size: number;
  checksum: string;
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: number;
  capturedAt: string;
  uploadedAt: string;
  thumbnailKey?: string;
  previewKey?: string;
  largeKey?: string;
  posterKey?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  downloadUrl?: string | null;
  status: 'UPLOADING' | 'QUARANTINE' | 'PROCESSING' | 'READY' | 'FAILED';
  processingError?: string;
  isFavorite: boolean;
  isHidden?: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  metadata?: MediaMetadata;
  aiMetadata?: AIMetadata;
  daysRemaining?: number;
}

export interface TimelineSection {
  dateKey: string;
  title: string;
  formattedDate: string;
  items: Media[];
}

export interface Album {
  _id: string;
  ownerId: string;
  title: string;
  description?: string;
  coverMediaId?: string;
  coverUrl?: string | null;
  itemCount: number;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumSettings {
  allowContributions: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  allowDownloads: boolean;
  isPublicLinkEnabled: boolean;
  requireLoginForPublic: boolean;
}

export interface AlbumMemberPermissions {
  view: boolean;
  contribute: boolean;
  comment: boolean;
  react: boolean;
  download: boolean;
  invite: boolean;
}

export interface AlbumMember {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  permissions: AlbumMemberPermissions;
  joinedAt: string;
}

export interface AlbumComment {
  _id: string;
  albumId: string;
  mediaId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
}

export interface AlbumReaction {
  _id: string;
  albumId: string;
  mediaId: string;
  userId: string;
  userName: string;
  reactionType: 'HEART' | 'THUMBS_UP' | 'LAUGH' | 'CLAP' | 'FIRE';
  createdAt: string;
}

export interface SharedAlbum {
  _id: string;
  ownerId: string;
  title: string;
  description?: string;
  coverMediaId?: string;
  coverUrl?: string | null;
  itemCount: number;
  memberCount: number;
  isShared: boolean;
  isOwner?: boolean;
  userRole?: 'OWNER' | 'EDITOR' | 'VIEWER';
  settings: AlbumSettings;
  permissions?: AlbumMemberPermissions;
  members?: AlbumMember[];
  createdAt: string;
  updatedAt: string;
}

export interface Share {
  _id: string;
  token: string;
  targetType: 'MEDIA' | 'ALBUM' | 'BATCH';
  targetId?: string;
  targetIds?: string[];
  title?: string;
  accessMode: 'PUBLIC' | 'PASSWORD' | 'AUTHENTICATED';
  isPasswordProtected: boolean;
  allowDownload: boolean;
  stripMetadata: boolean;
  expiresAt?: string;
  isRevoked: boolean;
  accessCount: number;
  downloadCount?: number;
  createdAt: string;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  usedPercentage: number;
  photosBytes: number;
  videosBytes: number;
  trashBytes: number;
  photosCount: number;
  videosCount: number;
  trashCount: number;
  largestFiles: Media[];
}

export interface SecurityOverview {
  score: number;
  rating: 'POOR' | 'MODERATE' | 'GOOD' | 'EXCELLENT';
  twoFactorEnabled: boolean;
  passkeysCount: number;
  activeSessionsCount: number;
  isEmailVerified: boolean;
  lastLoginAt?: string;
}

export interface SecurityEvent {
  _id: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  deviceType?: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: string;
  timestamp: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'UPLOAD_SUCCESS' | 'UPLOAD_FAILED' | 'SECURITY_ALERT' | 'SHARE' | 'STORAGE_WARNING' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
}

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  error?: string;
  media?: Media;
  albumId?: string;
  isHidden?: boolean;
}
