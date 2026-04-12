import dbConnect from '@/app/(backend)/libs/dbConnect';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const conn = await dbConnect();
    return NextResponse.json({ 
      success: true, 
      message: 'MongoDB connected successfully! 🎉',
      host: conn.connection.host 
    }, { status: 200 });

  } catch (error: any) {
    // On error
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to connect to MongoDB ❌',
      error: error.message 
    }, { status: 500 });
  }
}