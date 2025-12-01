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

export default function DashboardPage() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketIndices();
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
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      window.location.href = `/stock/${searchQuery.toUpperCase()}`;
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
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        index.changePercent >= 0 ? 'text-positive' : 'text-negative'
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
        <Card className="glassmorphism border-2 border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <CardTitle>Daily AI Stock Pick</CardTitle>
            </div>
            <CardDescription>
              AI-powered recommendation based on technical, fundamental, and sentiment analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <div className="inline-block p-4 bg-primary/10 rounded-full">
                  <TrendingUp className="h-12 w-12 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Coming soon! AI stock picker will analyze 1000+ stocks daily.
                </p>
                <Button variant="outline">
                  Setup API Keys
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="text-lg">Top Gainers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon - Real-time market movers
              </p>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="text-lg">Top Losers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon - Real-time market movers
              </p>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="text-lg">Market News</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon - Latest financial news
              </p>
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
