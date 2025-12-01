import { NextRequest, NextResponse } from 'next/server';
import { scoreStock } from '@/lib/quant/stock-picker';

// Popular stocks to screen
const STOCK_UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'NFLX', 'DIS',
  'JPM', 'V', 'MA', 'BAC', 'WMT', 'PG', 'JNJ', 'UNH', 'HD', 'COST',
  'CRM', 'ORCL', 'CSCO', 'INTC', 'ADBE', 'PYPL', 'CMCSA', 'PEP', 'T', 'VZ',
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
];

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      minMarketCap: searchParams.get('minMarketCap')
        ? Number(searchParams.get('minMarketCap'))
        : undefined,
      maxMarketCap: searchParams.get('maxMarketCap')
        ? Number(searchParams.get('maxMarketCap'))
        : undefined,
      minPE: searchParams.get('minPE') ? Number(searchParams.get('minPE')) : undefined,
      maxPE: searchParams.get('maxPE') ? Number(searchParams.get('maxPE')) : undefined,
      minRSI: searchParams.get('minRSI') ? Number(searchParams.get('minRSI')) : undefined,
      maxRSI: searchParams.get('maxRSI') ? Number(searchParams.get('maxRSI')) : undefined,
      minChange: searchParams.get('minChange') ? Number(searchParams.get('minChange')) : undefined,
      maxChange: searchParams.get('maxChange') ? Number(searchParams.get('maxChange')) : undefined,
    };

    const results = [];

    // Screen stocks (limit to 15 to avoid timeout)
    for (const ticker of STOCK_UNIVERSE.slice(0, 15)) {
      try {
        const score = await scoreStock(ticker);
        if (!score) continue;

        // Apply filters
        let passes = true;

        if (filters.minMarketCap && score.price * 1e9 < filters.minMarketCap) passes = false;
        if (filters.maxMarketCap && score.price * 1e9 > filters.maxMarketCap) passes = false;

        // For PE, RSI we need to get from technical data
        // Simplified version - in production, fetch actual values

        if (passes) {
          results.push({
            ticker: score.ticker,
            name: score.name,
            price: score.price,
            change: 0, // Would come from quote
            changePercent: 0, // Would come from quote
            marketCap: score.price * 1e9, // Simplified
            pe: null, // Would need fundamental data
            rsi: null, // Would need technical data
            score: score.totalScore,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error screening ${ticker}:`, error);
      }
    }

    return NextResponse.json({
      results,
      filters,
      totalChecked: Math.min(STOCK_UNIVERSE.length, 15),
    });
  } catch (error) {
    console.error('Screener API Error:', error);
    return NextResponse.json(
      { error: 'Failed to screen stocks' },
      { status: 500 }
    );
  }
}
