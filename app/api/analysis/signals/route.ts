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

    // Check cache first (15 minutes for signals)
    const cacheKey = `signals:${ticker}`;
    const cachedData = await getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Use Python service for comprehensive signal analysis
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/signals/${ticker}`, {
        timeout: 30000, // 30 seconds for comprehensive analysis
      });

      const signals = response.data;

      // Cache the result
      await setCachedData(cacheKey, signals, CACHE_DURATION.QUOTE); // 15 minutes

      return NextResponse.json(signals);
    } catch (error) {
      console.error('Python service error:', error);

      // Return empty signals on error
      return NextResponse.json({
        ticker,
        error: 'Unable to fetch trading signals',
        overall_signal: {
          signal: 'NEUTRAL',
          score: 50,
          color: 'gray',
          confidence: 'Low'
        },
        technical_analysis: { score: 50, signals: [] },
        fundamental_analysis: { score: 50, signals: [] },
        sentiment_score: 50,
        timeframe_signals: {
          intraday: { timeframe: '1-3 Days', signal: 'NEUTRAL', score: 50, description: 'Short-term scalping and day trading' },
          swing: { timeframe: '1-4 Weeks', signal: 'NEUTRAL', score: 50, description: 'Medium-term swing trading' },
          long_term: { timeframe: '3-12 Months', signal: 'NEUTRAL', score: 50, description: 'Long-term position trading' }
        },
        key_indicators: {}
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trading signals' },
      { status: 500 }
    );
  }
}
