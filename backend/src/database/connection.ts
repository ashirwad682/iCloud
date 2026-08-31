import mongoose from 'mongoose';
import { config } from '../config/env.config';
import { AppError } from '../common/middleware/error.middleware';

let cachedConn: typeof mongoose | null = null;
let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (cachedConn && mongoose.connection.readyState >= 1) {
    return cachedConn;
  }

  if (!cachedPromise) {
    mongoose.set('strictQuery', true);
    cachedPromise = mongoose.connect(config.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    }).then((conn) => {
      cachedConn = conn;
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
      return conn;
    }).catch((err) => {
      cachedPromise = null;
      console.error('❌ MongoDB Connection Error:', err.message);
      throw new AppError(
        'Database connection failed: Please allow access from anywhere (0.0.0.0/0) in MongoDB Atlas Network Access.',
        500,
        'DATABASE_CONNECTION_ERROR',
        err.message
      );
    });
  }

  return cachedPromise;
}

export async function disconnectDatabase(): Promise<void> {
  cachedConn = null;
  cachedPromise = null;
  await mongoose.disconnect();
}


