/**
 * MongoDB connection management with connection pooling
 * Optimized for serverless environments (Next.js API routes)
 */

import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Cached connection interface
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * Global type declaration for mongoose connection cache
 * Prevents multiple connections in development with hot reloading
 */
declare global {
  var mongooseCache: MongooseCache | undefined;
}

/**
 * Cached connection object
 * In development, we store the connection in a global variable
 * to preserve it across module reloads caused by HMR
 */
const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Connection options optimized for serverless environments
 */
const connectionOptions: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB with connection pooling
 * Returns cached connection if available, otherwise creates new connection
 *
 * @returns Promise resolving to mongoose instance
 */
export async function connectToDatabase(): Promise<Mongoose> {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, connectionOptions);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Disconnect from MongoDB
 * Useful for cleanup in tests or graceful shutdown
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

/**
 * Check if database is connected
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export default connectToDatabase;
