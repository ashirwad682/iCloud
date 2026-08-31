import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env if present, otherwise fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  MONGODB_URI: z.string().default('mongodb://localhost:27017/cloudvault'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // JWT
  JWT_SECRET: z.string().default('super_secure_access_token_secret_key_cloudvault_2026_at_least_32_chars').transform((v) => (v && v.trim() ? v.trim() : 'super_secure_access_token_secret_key_cloudvault_2026_at_least_32_chars')),
  REFRESH_TOKEN_SECRET: z.string().default('super_secure_refresh_token_secret_key_cloudvault_2026_at_least_32_chars').transform((v) => (v && v.trim() ? v.trim() : 'super_secure_refresh_token_secret_key_cloudvault_2026_at_least_32_chars')),
  JWT_ACCESS_EXPIRATION: z.string().default('15m').transform((v) => (v && v.trim() ? v.trim() : '15m')),
  JWT_REFRESH_EXPIRATION: z.string().default('7d').transform((v) => (v && v.trim() ? v.trim() : '7d')),

  
  // WebAuthn / Passkeys
  WEBAUTHN_RP_NAME: z.string().default('CloudVault'),
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_ORIGIN: z.string().default('http://localhost:5173'),
  
  // S3 / MinIO Object Storage
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('miniopassword'),
  S3_BUCKET: z.string().default('cloudvault-media'),
  S3_FORCE_PATH_STYLE: z.string().transform((v) => v === 'true').default('true'),
  
  // Services
  PYTHON_SERVICE_URL: z.string().default('http://localhost:8000'),
  FRONTEND_URL: z.string().default('https://icloud-frontend.vercel.app'),
  CORS_ORIGINS: z.string().default('https://icloud-frontend.vercel.app,http://localhost:5173,http://127.0.0.1:5173'),
  
  DEFAULT_STORAGE_QUOTA_BYTES: z.string().transform(Number).default('16106127360'), // 15 GB
  TRASH_RETENTION_DAYS: z.string().transform(Number).default('30'),
});

const parsed = envSchema.safeParse(process.env);


let configData: z.infer<typeof envSchema>;

if (!parsed.success) {
  console.error('⚠️ Environment variables warning:', parsed.error.format());
  configData = envSchema.parse({});
} else {
  configData = parsed.data;
}

export const config = configData;


