import mongoose from 'mongoose';
import { config } from '../config/env.config';

let isConnected = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState >= 1 || isConnected) {
    return mongoose;
  }

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(config.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    // Don't crash abruptly on serverless platforms
    if (config.NODE_ENV === 'production' && !process.env.VERCEL) {
      process.exit(1);
    }
    return mongoose;
  }
}

export async function disconnectDatabase(): Promise<void> {
  isConnected = false;
  await mongoose.disconnect();
}

