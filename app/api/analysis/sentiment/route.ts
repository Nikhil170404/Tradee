import { NextRequest, NextResponse } from 'next/server';
import { getNewsForStock, calculateAverageSentiment, analyzeSentiment } from '@/lib/api/news';
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

    const cacheKey = `sentiment:${ticker}`;

    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Fetch recent news
    const articles = await getNewsForStock(ticker, 20);

    // Calculate sentiment
    const articlesWithSentiment = articles.map(article => ({
      ...article,
      sentiment: analyzeSentiment(`${article.title} ${article.description || ''}`),
    }));

    const averageSentiment = calculateAverageSentiment(articlesWithSentiment);

    // Categorize sentiment
    let sentimentLabel = 'Neutral';
    let sentimentColor = 'gray';

    if (averageSentiment > 0.3) {
      sentimentLabel = 'Bullish';
      sentimentColor = 'green';
    } else if (averageSentiment > 0.1) {
      sentimentLabel = 'Slightly Bullish';
      sentimentColor = 'lightgreen';
    } else if (averageSentiment < -0.3) {
      sentimentLabel = 'Bearish';
      sentimentColor = 'red';
    } else if (averageSentiment < -0.1) {
      sentimentLabel = 'Slightly Bearish';
      sentimentColor = 'orange';
    }

    const response = {
      ticker,
      sentiment: {
        score: averageSentiment,
        label: sentimentLabel,
        color: sentimentColor,
      },
      articles: articlesWithSentiment.slice(0, 5), // Return top 5
      totalArticles: articles.length,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 1 hour
    await setCachedData(cacheKey, response, CACHE_DURATION.NEWS);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}
