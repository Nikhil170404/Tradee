"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, TrendingUp, TrendingDown, Target, Clock, BarChart3, Zap } from 'lucide-react'
import Link from 'next/link'

interface StockData {
  ticker: string
  current_price: number
  overall_signal: string
  overall_score: number
  technical_score: number
  fundamental_score: number
  rsi: number
  macd_histogram: number
  intraday_signal: string
  swing_signal: string
  longterm_signal: string
  vwap_score: number
  timestamp: string
}

interface ScreenerData {
  summary: {
    total_stocks: number
    successful: number
    errors: number
    cache_hits: number
    fresh_fetches: number
    time_taken_seconds: number
    timestamp: string
  }
  categories: {
    best_overall: StockData[]
    best_longterm: StockData[]
    best_intraday: StockData[]
    best_swing: StockData[]
    strong_buy: StockData[]
    strong_sell: StockData[]
    top_gainers: StockData[]
    top_losers: StockData[]
    value_picks: StockData[]
  }
}

export default function ScreenerPage() {
  const [data, setData] = useState<ScreenerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchScreenerData = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:8000/screener/nifty50?force_refresh=${forceRefresh}`)
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        setError(result.detail || 'Failed to fetch screener data')
      }
    } catch (err) {
      setError('Failed to connect to backend service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScreenerData()
  }, [])

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG BUY': return 'bg-green-600 text-white'
      case 'BUY': return 'bg-green-500 text-white'
      case 'NEUTRAL': return 'bg-gray-500 text-white'
      case 'SELL': return 'bg-orange-500 text-white'
      case 'STRONG SELL': return 'bg-red-600 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 font-bold'
    if (score >= 58) return 'text-green-500 font-semibold'
    if (score >= 42) return 'text-gray-600'
    if (score >= 30) return 'text-orange-500 font-semibold'
    return 'text-red-600 font-bold'
  }

  const StockCard = ({ stock }: { stock: StockData }) => (
    <Link href={`/stock/${stock.ticker}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{stock.ticker.replace('.NS', '')}</CardTitle>
              <CardDescription className="text-xl font-bold mt-1">
                ₹{stock.current_price?.toFixed(2)}
              </CardDescription>
            </div>
            <Badge className={getSignalColor(stock.overall_signal)}>
              {stock.overall_signal}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Score:</span>{' '}
              <span className={getScoreColor(stock.overall_score)}>
                {stock.overall_score}
              </span>
            </div>
            <div>
              <span className="text-gray-500">RSI:</span>{' '}
              <span className={stock.rsi > 70 ? 'text-red-500' : stock.rsi < 30 ? 'text-green-500' : ''}>
                {stock.rsi?.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Technical:</span> {stock.technical_score?.toFixed(0)}
            </div>
            <div>
              <span className="text-gray-500">Fundamental:</span> {stock.fundamental_score?.toFixed(0)}
            </div>
          </div>

          <div className="flex gap-1 flex-wrap mt-2">
            {stock.intraday_signal && (
              <Badge variant="outline" className="text-xs">
                Intraday: {stock.intraday_signal}
              </Badge>
            )}
            {stock.swing_signal && (
              <Badge variant="outline" className="text-xs">
                Swing: {stock.swing_signal}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nifty 50 Stock Screener</h1>
          <p className="text-gray-500 mt-1">
            Intelligent analysis with 15-minute caching • No rate limits
          </p>
        </div>
        <Button
          onClick={() => fetchScreenerData(true)}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh All'}
        </Button>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Stocks</CardDescription>
              <CardTitle className="text-2xl">{data.summary.successful}/{data.summary.total_stocks}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cache Hits</CardDescription>
              <CardTitle className="text-2xl text-green-600">{data.summary.cache_hits}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fresh Fetches</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{data.summary.fresh_fetches}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Load Time</CardDescription>
              <CardTitle className="text-2xl">{data.summary.time_taken_seconds}s</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Updated</CardDescription>
              <CardTitle className="text-sm">
                {new Date(data.summary.timestamp).toLocaleTimeString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Loading State */}
      {loading && !data && (
        <Card>
          <CardHeader>
            <CardTitle>Loading Nifty 50 Stocks...</CardTitle>
            <CardDescription>
              First load takes ~25-50 seconds. Subsequent loads are instant with cache.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Main Content */}
      {data && (
        <Tabs defaultValue="best_overall" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
            <TabsTrigger value="best_overall" className="gap-1">
              <Target className="h-4 w-4" />
              Best Overall
            </TabsTrigger>
            <TabsTrigger value="best_longterm" className="gap-1">
              <Clock className="h-4 w-4" />
              Long-term
            </TabsTrigger>
            <TabsTrigger value="best_intraday" className="gap-1">
              <Zap className="h-4 w-4" />
              Intraday
            </TabsTrigger>
            <TabsTrigger value="best_swing" className="gap-1">
              <BarChart3 className="h-4 w-4" />
              Swing
            </TabsTrigger>
            <TabsTrigger value="strong_buy">Strong Buy</TabsTrigger>
            <TabsTrigger value="strong_sell">Strong Sell</TabsTrigger>
            <TabsTrigger value="top_gainers" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              Gainers
            </TabsTrigger>
            <TabsTrigger value="top_losers" className="gap-1">
              <TrendingDown className="h-4 w-4" />
              Losers
            </TabsTrigger>
            <TabsTrigger value="value_picks">Value Picks</TabsTrigger>
          </TabsList>

          {/* Best Overall */}
          <TabsContent value="best_overall" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.best_overall.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Best Long-term */}
          <TabsContent value="best_longterm" className="mt-6">
            <Card className="mb-4 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Long-term Investment Strategy</CardTitle>
                <CardDescription>
                  Ranked by fundamental score. Best for 3-12 month holding periods. Focus on P/E ratio, ROE, and profit margins.
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.best_longterm.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Best Intraday */}
          <TabsContent value="best_intraday" className="mt-6">
            <Card className="mb-4 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg">Intraday Trading Strategy</CardTitle>
                <CardDescription>
                  Ranked by VWAP strategy score (70-76% win rate). Best for same-day trades. Watch VWAP bands and volume.
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.best_intraday.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Best Swing */}
          <TabsContent value="best_swing" className="mt-6">
            <Card className="mb-4 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg">Swing Trading Strategy</CardTitle>
                <CardDescription>
                  Ranked by technical + momentum scores. Best for 1-4 week trades. Focus on MACD, moving averages, and ADX.
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.best_swing.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Strong Buy */}
          <TabsContent value="strong_buy" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.strong_buy.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Strong Sell */}
          <TabsContent value="strong_sell" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.strong_sell.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Top Gainers */}
          <TabsContent value="top_gainers" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.top_gainers.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Top Losers */}
          <TabsContent value="top_losers" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.top_losers.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>

          {/* Value Picks */}
          <TabsContent value="value_picks" className="mt-6">
            <Card className="mb-4 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg">Value Investment Picks</CardTitle>
                <CardDescription>
                  High fundamental scores ({'>'}60). Undervalued stocks with strong fundamentals. Good for long-term value investing.
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.categories.value_picks.map((stock) => (
                <StockCard key={stock.ticker} stock={stock} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
