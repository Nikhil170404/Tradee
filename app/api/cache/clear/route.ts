import { NextRequest, NextResponse } from 'next/server';
import { deleteCachedData } from '@/lib/db/redis';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Cache key parameter is required' },
        { status: 400 }
      );
    }

    await deleteCachedData(key);

    return NextResponse.json({
      success: true,
      message: `Cache cleared for key: ${key}`,
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
