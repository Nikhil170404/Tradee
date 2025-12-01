import { NextRequest, NextResponse } from 'next/server';
import { getChartData } from '@/lib/api/yahoo';
import { calculateAllIndicators } from '@/lib/indicators/technical';
import { getCachedData, setCachedData, CACHE_DURATION } from '@/lib/db/redis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker parameter is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `technical:${ticker}`;
    const cachedData = await getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Fetch chart data (1 year for better indicator calculation)
    const chartData = await getChartData(ticker, '1y', '1d');

    // Calculate all indicators
    const indicators = calculateAllIndicators(chartData);

    const response = {
      ticker,
      indicators,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    await setCachedData(cacheKey, response, CACHE_DURATION.MARKET_DATA);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate technical indicators' },
      { status: 500 }
    );
  }
}
