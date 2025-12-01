import { NextResponse } from 'next/server';
import { getMarketIndices } from '@/lib/api/yahoo';
import { getQuote } from '@/lib/api/alphavantage';
import { getCachedData, setCachedData, CACHE_DURATION } from '@/lib/db/redis';

export async function GET() {
  try {
    // Check cache first
    const cacheKey = 'market:indices';
    const cachedData = await getCachedData(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Try Yahoo Finance first
    let indices;
    try {
      indices = await getMarketIndices();
    } catch (yahooError) {
      console.log('Yahoo Finance failed for indices, using Alpha Vantage fallback...');

      // Fallback: Get major US indices from Alpha Vantage
      const symbols = ['SPY', 'DIA', 'QQQ']; // S&P 500, DOW, NASDAQ ETFs
      const promises = symbols.map(async (symbol) => {
        try {
          return await getQuote(symbol);
        } catch (e) {
          console.error(`Failed to fetch ${symbol}:`, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      indices = results.filter(r => r !== null);
    }

    // If we have data, cache it
    if (indices && indices.length > 0) {
      await setCachedData(cacheKey, indices, CACHE_DURATION.MARKET_DATA);
      return NextResponse.json(indices);
    }

    // Return empty array if all attempts failed
    return NextResponse.json([]);
  } catch (error) {
    console.error('API Error (all providers failed):', error);
    // Return empty array instead of error to prevent frontend crash
    return NextResponse.json([]);
  }
}
