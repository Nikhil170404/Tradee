import axios from 'axios';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: {
    id: string | null;
    name: string;
  };
  sentiment?: number; // -1 to 1
}

export async function getNewsForStock(ticker: string, limit: number = 10): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/everything`, {
      params: {
        q: ticker,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: limit,
        apiKey: NEWS_API_KEY,
      },
    });

    return response.data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source,
    }));
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('News API rate limit exceeded');
    } else {
      console.error('Error fetching news:', error);
    }
    return [];
  }
}

export async function getMarketNews(limit: number = 20): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.warn('NEWS_API_KEY not configured');
    return [];
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
      params: {
        category: 'business',
        language: 'en',
        country: 'us',
        pageSize: limit,
        apiKey: NEWS_API_KEY,
      },
    });

    return response.data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source,
    }));
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('News API rate limit exceeded');
    } else {
      console.error('Error fetching market news:', error);
    }
    return [];
  }
}

// Simple sentiment analysis using keyword matching
// For production, use VADER or FinBERT via Python service
export function analyzeSentiment(text: string): number {
  const positiveWords = [
    'bullish', 'surge', 'rally', 'gain', 'profit', 'growth', 'up', 'high',
    'strong', 'beat', 'exceed', 'positive', 'rise', 'jump', 'soar', 'boom',
    'success', 'win', 'improve', 'better', 'breakthrough', 'record'
  ];

  const negativeWords = [
    'bearish', 'crash', 'fall', 'loss', 'decline', 'down', 'low', 'weak',
    'miss', 'disappoint', 'negative', 'drop', 'plunge', 'slump', 'recession',
    'fail', 'concern', 'worry', 'risk', 'threat', 'warning', 'crisis'
  ];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score += matches.length;
  });

  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score -= matches.length;
  });

  // Normalize to -1 to 1 range
  const maxScore = Math.max(Math.abs(score), 5);
  return Math.max(-1, Math.min(1, score / maxScore));
}

export function calculateAverageSentiment(articles: NewsArticle[]): number {
  if (articles.length === 0) return 0;

  const sentiments = articles.map(article => {
    const text = `${article.title} ${article.description || ''}`;
    return analyzeSentiment(text);
  });

  const sum = sentiments.reduce((acc, val) => acc + val, 0);
  return sum / sentiments.length;
}
