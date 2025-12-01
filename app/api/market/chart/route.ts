import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getCachedData, setCachedData, CACHE_DURATION } from '@/lib/db/redis';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const period = searchParams.get('period') as '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' || '1y';
    const interval = searchParams.get('interval') as '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' || '1d';

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker parameter is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `chart:${ticker}:${period}:${interval}`;
    const cachedData = await getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Use Python service with yfinance
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/chart/${ticker}`, {
        params: { period, interval },
        timeout: 15000,
      });

      const chartData = response.data;

      // Cache the result if we have data
      if (chartData && chartData.length > 0) {
        await setCachedData(cacheKey, chartData, CACHE_DURATION.MARKET_DATA);
        return NextResponse.json(chartData);
      }

      // Return empty array if no data
      return NextResponse.json([]);
    } catch (error) {
      console.error('Python service error:', error);
      // Return empty array instead of error to prevent frontend crash
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json([]);
  }
}
