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
    const cacheKey = `fundamental:${ticker}`;
    const cachedData = await getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Use Python service with yfinance
    try {
      const pyResponse = await axios.get(`${PYTHON_SERVICE_URL}/fundamentals/${ticker}`, {
        timeout: 10000,
      });

      const response = {
        ...pyResponse.data,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result (24 hours for fundamentals)
      await setCachedData(cacheKey, response, CACHE_DURATION.FUNDAMENTALS);

      return NextResponse.json(response);
    } catch (error) {
      console.error('Python service error:', error);

      // Return empty fundamentals
      return NextResponse.json({
        ticker,
        fundamentals: {
          pe: null,
          pb: null,
          roe: null,
          debtToEquity: null,
          revenue: null,
          eps: null,
          dividendYield: null,
          profitMargin: null,
          bookValue: null,
        },
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('API Error (all providers failed):', error);
    // Return empty fundamentals instead of error
    return NextResponse.json({
      ticker: request.nextUrl.searchParams.get('ticker') || '',
      fundamentals: {
        pe: null,
        pb: null,
        roe: null,
        debtToEquity: null,
        revenue: null,
        eps: null,
        dividendYield: null,
        profitMargin: null,
        bookValue: null,
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
