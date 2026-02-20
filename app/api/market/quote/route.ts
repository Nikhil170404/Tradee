import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getCachedData, setCachedData, CACHE_DURATION } from '@/lib/db/redis';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

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
    const cacheKey = `quote:${ticker}`;
    const cachedData = await getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Use Python service with yfinance (most reliable)
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/quote/${ticker}`, {
        timeout: 10000,
      });

      const quote = response.data;

      // Cache the result
      await setCachedData(cacheKey, quote, CACHE_DURATION.QUOTE);

      return NextResponse.json(quote);
    } catch (error) {
      console.error('Python service error:', error);

      // Return unavailable object instead of error to prevent frontend crash
      return NextResponse.json({
        symbol: ticker,
        name: `${ticker} - Data temporarily unavailable`,
        price: 0,
        change: 0,
        changePercent: 0,
        open: 0,
        high: 0,
        low: 0,
        volume: 0,
        previousClose: 0,
        marketCap: 0,
      }, { status: 503 });
    }
  } catch (error) {
    console.error('API Error:', error);
    const ticker = request.nextUrl.searchParams.get('ticker') || '';

    return NextResponse.json({
      symbol: ticker,
      name: 'Service temporarily unavailable',
      price: 0,
      change: 0,
      changePercent: 0,
      open: 0,
      high: 0,
      low: 0,
      volume: 0,
      previousClose: 0,
      marketCap: 0,
    }, { status: 503 });
  }
}
