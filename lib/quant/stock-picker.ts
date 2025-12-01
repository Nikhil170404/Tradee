import { getStockQuote, getChartData, getFundamentalData } from '../api/yahoo';
import { calculateAllIndicators } from '../indicators/technical';
import { getNewsForStock, calculateAverageSentiment, analyzeSentiment } from '../api/news';

interface StockScore {
  ticker: string;
  name: string;
  price: number;
  totalScore: number;
  scores: {
    technical: number;
    fundamental: number;
    sentiment: number;
  };
  signals: {
    rsi: string;
    macd: string;
    sma: string;
  };
  targetPrice: number;
  reasoning: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
}

// Popular stocks to analyze (expand this list)
const STOCK_UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'NFLX', 'DIS',
  'JPM', 'V', 'MA', 'BAC', 'WMT', 'PG', 'JNJ', 'UNH', 'HD', 'COST',
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
  'BTC-USD', 'ETH-USD', 'GC=F', '^GSPC'
];

export async function scoreStock(ticker: string): Promise<StockScore | null> {
  try {
    const reasoning: string[] = [];

    // Fetch data
    const quote = await getStockQuote(ticker);
    const chartData = await getChartData(ticker, '1y', '1d');
    const indicators = calculateAllIndicators(chartData);
    const fundamentals = await getFundamentalData(ticker);
    const news = await getNewsForStock(ticker, 10);

    // Calculate Technical Score (0-100)
    let technicalScore = 50; // Start neutral

    // RSI Score
    if (indicators.rsi) {
      if (indicators.rsi < 30) {
        technicalScore += 20;
        reasoning.push('RSI indicates oversold conditions (strong buy signal)');
      } else if (indicators.rsi > 70) {
        technicalScore -= 20;
        reasoning.push('RSI indicates overbought conditions (caution)');
      } else if (indicators.rsi >= 40 && indicators.rsi <= 60) {
        technicalScore += 10;
        reasoning.push('RSI in healthy neutral zone');
      }
    }

    // MACD Score
    if (indicators.macd && indicators.macd.histogram > 0) {
      technicalScore += 15;
      reasoning.push('MACD showing bullish momentum');
    } else if (indicators.macd && indicators.macd.histogram < 0) {
      technicalScore -= 10;
    }

    // SMA Score (Golden Cross)
    if (indicators.sma20 && indicators.sma50 && indicators.sma20 > indicators.sma50) {
      technicalScore += 15;
      reasoning.push('Price above key moving averages (bullish trend)');
    } else if (indicators.sma20 && indicators.sma50 && indicators.sma20 < indicators.sma50) {
      technicalScore -= 10;
      reasoning.push('Price below moving averages (bearish trend)');
    }

    // Volume surge
    if (quote.volume > quote.previousClose * 1.5) {
      technicalScore += 10;
      reasoning.push('High trading volume indicates strong interest');
    }

    // Calculate Fundamental Score (0-100)
    let fundamentalScore = 50;

    if (fundamentals.pe && fundamentals.pe < 20 && fundamentals.pe > 0) {
      fundamentalScore += 15;
      reasoning.push(`Attractive P/E ratio of ${fundamentals.pe.toFixed(2)}`);
    } else if (fundamentals.pe && fundamentals.pe > 40) {
      fundamentalScore -= 10;
    }

    if (fundamentals.roe && fundamentals.roe > 0.15) {
      fundamentalScore += 15;
      reasoning.push(`Strong ROE of ${(fundamentals.roe * 100).toFixed(1)}%`);
    }

    if (fundamentals.debtToEquity && fundamentals.debtToEquity < 1) {
      fundamentalScore += 10;
      reasoning.push('Healthy debt levels');
    } else if (fundamentals.debtToEquity && fundamentals.debtToEquity > 2) {
      fundamentalScore -= 10;
      reasoning.push('High debt levels (risky)');
    }

    if (fundamentals.profitMargin && fundamentals.profitMargin > 0.2) {
      fundamentalScore += 10;
      reasoning.push('High profit margins');
    }

    // Calculate Sentiment Score (0-100)
    let sentimentScore = 50;

    if (news.length > 0) {
      const newsWithSentiment = news.map(article =>
        analyzeSentiment(`${article.title} ${article.description || ''}`)
      );
      const avgSentiment = newsWithSentiment.reduce((a, b) => a + b, 0) / newsWithSentiment.length;

      if (avgSentiment > 0.3) {
        sentimentScore += 20;
        reasoning.push('Very positive news sentiment');
      } else if (avgSentiment > 0.1) {
        sentimentScore += 10;
        reasoning.push('Positive news sentiment');
      } else if (avgSentiment < -0.3) {
        sentimentScore -= 20;
        reasoning.push('Negative news sentiment (caution)');
      } else if (avgSentiment < -0.1) {
        sentimentScore -= 10;
      }
    }

    // Calculate Total Score (weighted average)
    const totalScore =
      technicalScore * 0.4 + // 40% weight on technical
      fundamentalScore * 0.35 + // 35% weight on fundamental
      sentimentScore * 0.25; // 25% weight on sentiment

    // Calculate target price (simple estimate based on score)
    const priceMultiplier = 1 + ((totalScore - 50) / 100);
    const targetPrice = quote.price * priceMultiplier;

    // Determine risk level
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    if (fundamentals.debtToEquity && fundamentals.debtToEquity > 2) {
      riskLevel = 'High';
    } else if (quote.changePercent > 50 || quote.changePercent < -50) {
      riskLevel = 'High';
    } else if (totalScore > 70) {
      riskLevel = 'Low';
    }

    return {
      ticker,
      name: quote.name,
      price: quote.price,
      totalScore: Math.round(totalScore),
      scores: {
        technical: Math.round(technicalScore),
        fundamental: Math.round(fundamentalScore),
        sentiment: Math.round(sentimentScore),
      },
      signals: {
        rsi: indicators.signals.rsi,
        macd: indicators.signals.macd,
        sma: indicators.signals.sma,
      },
      targetPrice: Math.round(targetPrice * 100) / 100,
      reasoning,
      riskLevel,
    };
  } catch (error) {
    console.error(`Error scoring ${ticker}:`, error);
    return null;
  }
}

export async function getDailyPick(count: number = 1): Promise<StockScore[]> {
  console.log('Starting daily stock picker algorithm...');

  const scores: StockScore[] = [];

  // Score all stocks in universe (in production, use parallel processing)
  for (const ticker of STOCK_UNIVERSE.slice(0, 20)) { // Limit to 20 for speed
    try {
      console.log(`Analyzing ${ticker}...`);
      const score = await scoreStock(ticker);
      if (score) {
        scores.push(score);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to score ${ticker}:`, error);
    }
  }

  // Sort by total score (descending)
  scores.sort((a, b) => b.totalScore - a.totalScore);

  // Return top picks
  return scores.slice(0, count);
}
