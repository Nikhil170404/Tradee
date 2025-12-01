import { NextRequest, NextResponse } from 'next/server';
import { getDailyPick } from '@/lib/quant/stock-picker';
import { getCachedData, setCachedData } from '@/lib/db/redis';

export const maxDuration = 60; // Allow up to 60 seconds for this endpoint

export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'daily-pick';

    // Check cache first (daily picks cached for 24 hours)
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Generate new daily pick
    const picks = await getDailyPick(3); // Get top 3

    if (picks.length === 0) {
      return NextResponse.json(
        { error: 'No picks available at this time' },
        { status: 503 }
      );
    }

    const response = {
      picks,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Cache for 24 hours
    await setCachedData(cacheKey, response, 86400);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily picks' },
      { status: 500 }
    );
  }
}
