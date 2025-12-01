import { NextRequest, NextResponse } from 'next/server';
import { getNewsForStock, getMarketNews, analyzeSentiment } from '@/lib/api/news';
import { getCachedData, setCachedData, CACHE_DURATION } from '@/lib/db/redis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const limit = parseInt(searchParams.get('limit') || '10');

    const cacheKey = ticker ? `news:${ticker}` : 'news:market';

    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Fetch news
    const articles = ticker
      ? await getNewsForStock(ticker, limit)
      : await getMarketNews(limit);

    // Add sentiment to each article
    const articlesWithSentiment = articles.map(article => ({
      ...article,
      sentiment: analyzeSentiment(`${article.title} ${article.description || ''}`),
    }));

    const response = {
      ticker: ticker || 'market',
      articles: articlesWithSentiment,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 1 hour
    await setCachedData(cacheKey, response, CACHE_DURATION.NEWS);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
