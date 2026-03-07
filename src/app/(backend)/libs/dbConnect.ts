import mongoose from 'mongoose';

// Lấy chuỗi kết nối từ file .env
const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// Mở rộng interface Global của NodeJS để TypeScript không báo lỗi đỏ
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

// Khởi tạo cache từ biến global (để sống sót qua các lần Hot Reload)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // BƯỚC 1: Nếu đã có kết nối trong cache -> Trả về dùng luôn, KHÔNG tạo mới
  if (cached.conn) {
    return cached.conn;
  }

  // BƯỚC 2: Nếu chưa có, bắt đầu gọi lệnh kết nối
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Tắt tính năng tự động buffer của Mongoose để báo lỗi ngay nếu mất mạng
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    // Lưu kết quả vào cache
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;