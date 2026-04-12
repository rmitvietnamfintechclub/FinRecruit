import { getResponseCollectionData } from '@/app/(backend)/libs/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await getResponseCollectionData();

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching response collection:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch data from FinRecruit.response',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
