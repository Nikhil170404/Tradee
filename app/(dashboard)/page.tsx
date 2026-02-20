'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface DailyPickData {
  pick: {
    ticker: string;
    sector: string;
    overall_signal: string;
    confidence_level: string;
    overall_score: number;
    rsi: number;
  };
  generated_at?: string;
}

interface ScreenerData {
  categories: {
    top_gainers: any[];
    top_losers: any[];
  };
}

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  sentiment: string;
  providerPublishTime: number;
}

export default function DashboardPage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [dailyPick, setDailyPick] = useState<DailyPickData | null>(null);
  const [screenerData, setScreenerData] = useState<ScreenerData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all data in parallel for faster page load
    Promise.all([
      fetchMarketIndices(),
      fetchDailyPick(),
      fetchScreenerData(),
      fetchNews()
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  const fetchMarketIndices = async () => {
    try {
      const response = await fetch('/api/market/indices');
      const data = await response.json();
      // Check if data is an array, otherwise set empty array
      setIndices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching indices:', error);
      setIndices([]); // Set empty array on error
    }
  };

  const fetchDailyPick = async () => {
    try {
      const response = await fetch('/api/quant/daily-pick');
      const data = await response.json();
      if (data && !data.error) {
        setDailyPick(data);
      }
    } catch (error) {
      console.error('Error fetching daily pick:', error);
    }
  };

  const fetchScreenerData = async () => {
    try {
      const response = await fetch('/api/quant/screener');
      const data = await response.json();
      if (data) {
        setScreenerData(data);
      }
    } catch (error) {
      console.error('Error fetching screener data:', error);
    }
  };

  const fetchNews = async () => {
    try {
      // Fetch general market news (Nifty 50, Global, Economy)
      // We need to create a new API route for this or make the existing one smart
      // Let's us a specific query param
      const response = await fetch('/api/quant/news?type=general');
      const data = await response.json();
      if (data && data.news) {
        setNews(data.news);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      const ticker = searchQuery.toUpperCase().trim();
      if (/^[A-Z0-9\-\s]+(\.(NS|BO))?$/.test(ticker)) {
        window.location.href = `/stock/${ticker}`;
      } else {
        alert("Please enter a valid alphanumeric ticker symbol (e.g., AAPL, RELIANCE.NS)");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              ProTrader AI
            </h1>
            <p className="text-muted-foreground mt-2">
              Free Quantitative Trading Platform
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="glassmorphism">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search stocks (e.g., AAPL, TSLA, RELIANCE.NS)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button type="submit" size="lg" className="px-8">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Market Overview */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Market Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="glassmorphism">
                    <CardHeader className="pb-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-8 bg-muted rounded animate-pulse" />
                        <div className="h-6 bg-muted rounded animate-pulse w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              indices.map((index) => (
                <Card key={index.symbol} className="glassmorphism hover:border-primary transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {index.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">
                        {formatCurrency(index.price)}
                      </p>
                      <div className={`flex items-center gap-1 text-sm font-medium ${index.changePercent >= 0 ? 'text-positive' : 'text-negative'
                        }`}>
                        {index.changePercent >= 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        <span>{formatPercentage(index.changePercent)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Daily AI Pick */}
        <div className="grid grid-cols-1 gap-4">
          {dailyPick ? (
            <Card className="glassmorphism border-2 border-primary/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="h-32 w-32" />
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <CardTitle>Daily AI Stock Pick</CardTitle>
                  <span className="ml-auto text-xs font-mono bg-primary/20 text-primary px-2 py-1 rounded">
                    {dailyPick.generated_at ? new Date(dailyPick.generated_at).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <CardDescription>
                  Top AI recommendation based on technical, fundamental, and sentiment analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="text-center md:text-left">
                    <h3 className="text-5xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                      {dailyPick.pick.ticker.replace('.NS', '')}
                    </h3>
                    <p className="text-lg text-muted-foreground mt-1">{dailyPick.pick.sector}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div className="p-3 bg-background/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Signal</p>
                      <p className={`text-lg font-bold ${dailyPick.pick.overall_signal === 'STRONG BUY' ? 'text-green-500' :
                        dailyPick.pick.overall_signal === 'BUY' ? 'text-green-400' : 'text-yellow-500'
                        }`}>
                        {dailyPick.pick.overall_signal}
                      </p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-lg font-bold">{dailyPick.pick.confidence_level}</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground">AI Score</p>
                      <p className="text-lg font-bold">{dailyPick.pick.overall_score}/100</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground">RSI</p>
                      <p className="text-lg font-bold">{dailyPick.pick.rsi?.toFixed(1)}</p>
                    </div>
                  </div>

                  <Button className="w-full md:w-auto" onClick={() => window.location.href = `/stock/${dailyPick.pick.ticker}`}>
                    View Analysis
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glassmorphism border-2 border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <CardTitle>Daily AI Stock Pick</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="py-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Analyzing market data...</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Stats - Top Gainers/Losers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Scored Stocks */}
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-green-500" />
                Top Scored Stocks (Nifty 50)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {screenerData ? (
                <div className="space-y-3">
                  {screenerData.categories.top_gainers.slice(0, 5).map((stock: any) => (
                    <div key={stock.ticker} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors cursor-pointer" onClick={() => window.location.href = `/stock/${stock.ticker}`}>
                      <div>
                        <p className="font-bold">{stock.ticker.replace('.NS', '')}</p>
                        <p className="text-xs text-muted-foreground">RSI: {stock.rsi?.toFixed(0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-500 font-bold">{stock.overall_score}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading market movers...</p>
              )}
            </CardContent>
          </Card>

          {/* Lowest Scored Stocks */}
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
                Lowest Scored Stocks (Nifty 50)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {screenerData ? (
                <div className="space-y-3">
                  {screenerData.categories.top_losers.slice(0, 5).map((stock: any) => (
                    <div key={stock.ticker} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors cursor-pointer" onClick={() => window.location.href = `/stock/${stock.ticker}`}>
                      <div>
                        <p className="font-bold">{stock.ticker.replace('.NS', '')}</p>
                        <p className="text-xs text-muted-foreground">RSI: {stock.rsi?.toFixed(0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-500 font-bold">{stock.overall_score}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading market movers...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Market News */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="text-lg">Market News</CardTitle>
            </CardHeader>
            <CardContent>
              {news.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {news.slice(0, 6).map((item: any, i) => (
                    <div key={i} className="border border-border/50 p-4 rounded-lg bg-background/20 hover:bg-background/40 transition-colors">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors block h-full flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-muted-foreground">{item.publisher}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${item.sentiment === 'Positive' ? 'bg-green-500/20 text-green-500' :
                              item.sentiment === 'Negative' ? 'bg-red-500/20 text-red-500' :
                                'bg-yellow-500/20 text-yellow-500'
                              }`}>
                              {item.sentiment}
                            </span>
                          </div>
                          <p className="font-medium text-sm line-clamp-3 mb-2">{item.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-auto">
                          {new Date(item.providerPublishTime * 1000).toLocaleDateString()}
                        </p>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loading market news...
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Stock Screener</CardTitle>
                <CardDescription>
                  Filter 1000+ stocks by technical and fundamental criteria
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Technical Analysis</CardTitle>
                <CardDescription>
                  RSI, MACD, SMA, Bollinger Bands with buy/sell signals
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Sentiment Analysis</CardTitle>
                <CardDescription>
                  AI-powered news sentiment scoring
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Portfolio Tracker</CardTitle>
                <CardDescription>
                  Track your holdings and performance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Price Alerts</CardTitle>
                <CardDescription>
                  Get notified when stocks hit target prices
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Watchlist</CardTitle>
                <CardDescription>
                  Monitor your favorite stocks
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8">
          <p>ProTrader AI - Free Quantitative Trading Platform</p>
          <p className="mt-2">
            Disclaimer: This platform is for educational purposes only. Not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
