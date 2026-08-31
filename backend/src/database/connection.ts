import mongoose from 'mongoose';
import { config } from '../config/env.config';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(config.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    // Don't crash immediately in development/testing mode so other subsystems can test/mock
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
    return mongoose;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
