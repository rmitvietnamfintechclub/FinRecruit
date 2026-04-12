import mongoose from 'mongoose';

// Connection string from .env
const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// Extend NodeJS global typing for TypeScript
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

// Reuse cached connection across hot reloads in development
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const logPrefix = '[dbConnect]';

async function dbConnect() {
  // Step 1: return existing connection if present
  if (cached.conn) {
    const host = cached.conn.connection.host;
    const name = cached.conn.connection.name;
    console.log(
      `${logPrefix} Reusing cached connection (host=${host}, db=${name}, readyState=${cached.conn.connection.readyState})`
    );
    return cached.conn;
  }

  // Step 2: otherwise start a new connection
  if (!cached.promise) {
    console.log(`${logPrefix} No cached connection — initiating mongoose.connect(...)`);
    const opts = {
      bufferCommands: false, // Fail fast when disconnected instead of buffering commands
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  } else {
    console.log(`${logPrefix} Connection in progress — awaiting existing promise`);
  }

  try {
    // Store connection in cache
    cached.conn = await cached.promise;
    const host = cached.conn.connection.host;
    const name = cached.conn.connection.name;
    console.log(
      `${logPrefix} Connected (host=${host}, db=${name}, readyState=${cached.conn.connection.readyState})`
    );
  } catch (e) {
    console.error(`${logPrefix} Connection failed:`, e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;