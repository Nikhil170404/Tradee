'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import TradingViewChart from '@/components/charts/tradingview-chart';
import BestStrategy from '@/components/stock/best-strategy';
import {
  ArrowLeft, TrendingUp, TrendingDown, Activity, DollarSign,
  BarChart3, Building2, AlertCircle
} from 'lucide-react';
import { formatCurrency, formatPercentage, formatNumber, formatMarketCap } from '@/lib/utils';
import { calculateIndicatorSeries } from '@/lib/indicators/technical';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
}

interface TechnicalData {
  rsi: number | null;
  macd: any;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bollingerBands: any;
  signals: {
    rsi: string;
    macd: string;
    sma: string;
    overall: string;
  };
}

interface FundamentalData {
  pe: number | null;
  pb: number | null;
  roe: number | null;
  debtToEquity: number | null;
  revenue: number | null;
  eps: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
}

interface SignalsData {
  overall_signal: {
    signal: string;
    score: number;
    color: string;
    confidence: string;
  };
  technical_analysis: {
    score: number;
    signals: Array<{ name: string; score: number; weight: number }>;
  };
  fundamental_analysis: {
    score: number;
    signals: Array<{ name: string; score: number; weight: number }>;
  };
  sentiment_score: number;
  timeframe_signals: {
    intraday: { timeframe: string; signal: string; score: number; description: string };
    swing: { timeframe: string; signal: string; score: number; description: string };
    long_term: { timeframe: string; signal: string; score: number; description: string };
  };
  vwap_strategy?: {
    signal: string;
    score: number;
    effectiveness: string;
    recommendation: string;
    vwap_data: {
      vwap: number;
      upper_band_1: number;
      lower_band_1: number;
      upper_band_2: number;
      lower_band_2: number;
      position: string;
      position_score: number;
      distance_from_vwap_percent: number;
    };
    price_action: {
      patterns: string[];
      signal_strength: number;
      dominant_pattern: string;
    };
    confirmations: number;
    timeframe_suitability: {
      intraday: string;
      day_trading: string;
      swing: string;
      long_term: string;
    };
  };
  key_indicators: {
    rsi: number;
    macd_histogram: number;
    price_vs_sma50: string;
    price_vs_sma200: string;
    volume_ratio: number;
    adx: number;
  };
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [fundamentalData, setFundamentalData] = useState<FundamentalData | null>(null);
  const [signalsData, setSignalsData] = useState<SignalsData | null>(null);
  const [period, setPeriod] = useState('1y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticker) {
      fetchStockData();
    }
  }, [ticker, period]);

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch quote
      const quoteRes = await fetch(`/api/market/quote?ticker=${ticker}`);
      if (!quoteRes.ok) throw new Error('Failed to fetch stock data');
      const quote = await quoteRes.json();
      setStockData(quote);

      // Fetch chart data
      const chartRes = await fetch(`/api/market/chart?ticker=${ticker}&period=${period}`);
      if (!chartRes.ok) throw new Error('Failed to fetch chart data');
      const chart = await chartRes.json();
      setChartData(chart);

      // Fetch technical indicators
      const techRes = await fetch(`/api/analysis/technical?ticker=${ticker}`);
      if (techRes.ok) {
        const tech = await techRes.json();
        setTechnicalData(tech.indicators);
      }

      // Fetch fundamentals
      const fundRes = await fetch(`/api/analysis/fundamental?ticker=${ticker}`);
      if (fundRes.ok) {
        const fund = await fundRes.json();
        setFundamentalData(fund.fundamentals);
      }

      // Fetch comprehensive trading signals
      const signalsRes = await fetch(`/api/analysis/signals?ticker=${ticker}`);
      if (signalsRes.ok) {
        const signals = await signalsRes.json();
        setSignalsData(signals);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded w-1/3" />
            <div className="h-96 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stockData) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="glassmorphism border-destructive">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-2xl font-bold mb-2">Error Loading Stock</h2>
                <p className="text-muted-foreground mb-4">
                  {error || 'Failed to load stock data'}
                </p>
                <Button onClick={() => router.push('/')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPositive = stockData.change >= 0;
  const indicatorSeries = chartData.length > 0 ? calculateIndicatorSeries(chartData) : [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Stock Header */}
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold">{stockData.symbol}</h1>
            <span className="text-xl text-muted-foreground">{stockData.name}</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-bold">{formatCurrency(stockData.price, ticker)}</span>
            <div className={`flex items-center gap-2 text-2xl font-semibold ${
              isPositive ? 'text-positive' : 'text-negative'
            }`}>
              {isPositive ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              <span>{formatCurrency(Math.abs(stockData.change), ticker)}</span>
              <span>({formatPercentage(stockData.changePercent)})</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glassmorphism">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Open</p>
              <p className="text-2xl font-bold">{formatCurrency(stockData.open, ticker)}</p>
            </CardContent>
          </Card>
          <Card className="glassmorphism">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">High</p>
              <p className="text-2xl font-bold">{formatCurrency(stockData.high, ticker)}</p>
            </CardContent>
          </Card>
          <Card className="glassmorphism">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Low</p>
              <p className="text-2xl font-bold">{formatCurrency(stockData.low, ticker)}</p>
            </CardContent>
          </Card>
          <Card className="glassmorphism">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Volume</p>
              <p className="text-2xl font-bold">{formatNumber(stockData.volume)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Best Strategy - 10-Year Backtest Validation */}
        <BestStrategy ticker={ticker} />

        {/* Chart */}
        <Card className="glassmorphism">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Price Chart</CardTitle>
              <div className="flex gap-2">
                {['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'].map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriod(p)}
                  >
                    {p.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <TradingViewChart
                data={chartData.map(d => ({
                  time: d.timestamp,
                  open: d.open,
                  high: d.high,
                  low: d.low,
                  close: d.close,
                  volume: d.volume,
                }))}
                height={500}
                showVolume={true}
                sma20={indicatorSeries.map(d => ({ time: d.timestamp, value: d.sma20! })).filter(d => d.value)}
                sma50={indicatorSeries.map(d => ({ time: d.timestamp, value: d.sma50! })).filter(d => d.value)}
                sma200={indicatorSeries.map(d => ({ time: d.timestamp, value: d.sma200! })).filter(d => d.value)}
              />
            ) : (
              <div className="h-96 flex items-center justify-center">
                <p className="text-muted-foreground">No chart data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Tabs */}
        <Tabs defaultValue="technical" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="technical">
              <Activity className="mr-2 h-4 w-4" />
              Technical
            </TabsTrigger>
            <TabsTrigger value="fundamental">
              <Building2 className="mr-2 h-4 w-4" />
              Fundamental
            </TabsTrigger>
            <TabsTrigger value="signals">
              <BarChart3 className="mr-2 h-4 w-4" />
              Signals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="technical">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Technical Indicators</CardTitle>
                <CardDescription>Key technical analysis metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {technicalData ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">RSI (14)</p>
                      <p className="text-3xl font-bold">
                        {technicalData.rsi ? technicalData.rsi.toFixed(2) : 'N/A'}
                      </p>
                      {technicalData.rsi && (
                        <p className={`text-sm mt-1 ${
                          technicalData.rsi < 30 ? 'text-positive' :
                          technicalData.rsi > 70 ? 'text-negative' : 'text-muted-foreground'
                        }`}>
                          {technicalData.rsi < 30 ? 'Oversold' :
                           technicalData.rsi > 70 ? 'Overbought' : 'Neutral'}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">MACD</p>
                      <p className="text-2xl font-bold">
                        {technicalData.macd ? technicalData.macd.macd.toFixed(2) : 'N/A'}
                      </p>
                      {technicalData.macd && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Signal: {technicalData.macd.signal.toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">SMA 20</p>
                      <p className="text-2xl font-bold">
                        {technicalData.sma20 ? formatCurrency(technicalData.sma20, ticker) : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">SMA 50</p>
                      <p className="text-2xl font-bold">
                        {technicalData.sma50 ? formatCurrency(technicalData.sma50, ticker) : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">SMA 200</p>
                      <p className="text-2xl font-bold">
                        {technicalData.sma200 ? formatCurrency(technicalData.sma200, ticker) : 'N/A'}
                      </p>
                    </div>

                    {technicalData.bollingerBands && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Bollinger Bands</p>
                        <p className="text-sm">
                          Upper: {formatCurrency(technicalData.bollingerBands.upper, ticker)}
                        </p>
                        <p className="text-sm">
                          Lower: {formatCurrency(technicalData.bollingerBands.lower, ticker)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading technical data...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fundamental">
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle>Fundamental Data</CardTitle>
                <CardDescription>Company financials and ratios</CardDescription>
              </CardHeader>
              <CardContent>
                {fundamentalData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">P/E Ratio</p>
                      <p className="text-3xl font-bold">
                        {fundamentalData.pe ? fundamentalData.pe.toFixed(2) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">P/B Ratio</p>
                      <p className="text-3xl font-bold">
                        {fundamentalData.pb ? fundamentalData.pb.toFixed(2) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ROE</p>
                      <p className="text-3xl font-bold">
                        {fundamentalData.roe ? `${(fundamentalData.roe * 100).toFixed(2)}%` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Debt/Equity</p>
                      <p className="text-3xl font-bold">
                        {fundamentalData.debtToEquity ? fundamentalData.debtToEquity.toFixed(2) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">EPS</p>
                      <p className="text-3xl font-bold">
                        {fundamentalData.eps ? formatCurrency(fundamentalData.eps, ticker) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Dividend Yield</p>
                      <p className="text-3xl font-bold">
                        {fundamentalData.dividendYield ? `${(fundamentalData.dividendYield * 100).toFixed(2)}%` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Profit Margin</p>
                      <p className="text-3xl font-bold">
                        {fundamentalData.profitMargin ? `${(fundamentalData.profitMargin * 100).toFixed(2)}%` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                      <p className="text-2xl font-bold">
                        {formatMarketCap(stockData.marketCap)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading fundamental data...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals">
            <div className="space-y-6">
              {signalsData && signalsData.overall_signal ? (
                <>
                  {/* Overall Signal Card */}
                  <Card className="glassmorphism">
                    <CardHeader>
                      <CardTitle>Overall Trading Signal</CardTitle>
                      <CardDescription>Weighted analysis: Technical (50%) + Fundamental (30%) + Sentiment (20%)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-6 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Signal</p>
                          <p className="text-5xl font-bold" style={{ color: signalsData.overall_signal.color }}>
                            {signalsData.overall_signal.signal}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Confidence: {signalsData.overall_signal.confidence}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Score</p>
                          <div className="text-4xl font-bold">{signalsData.overall_signal.score}/100</div>
                          <div className="w-48 h-3 bg-muted rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${signalsData.overall_signal.score}%`,
                                backgroundColor: signalsData.overall_signal.color
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeframe Signals */}
                  <Card className="glassmorphism">
                    <CardHeader>
                      <CardTitle>Multi-Timeframe Analysis</CardTitle>
                      <CardDescription>Signals for different trading strategies</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Intraday */}
                        <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold">Intraday</p>
                            <span className={`px-3 py-1 rounded-md text-sm font-bold ${
                              signalsData.timeframe_signals.intraday.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                              signalsData.timeframe_signals.intraday.signal === 'SELL' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {signalsData.timeframe_signals.intraday.signal}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{signalsData.timeframe_signals.intraday.timeframe}</p>
                          <p className="text-sm text-muted-foreground">{signalsData.timeframe_signals.intraday.description}</p>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Score</span>
                              <span className="font-semibold">{signalsData.timeframe_signals.intraday.score}/100</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  signalsData.timeframe_signals.intraday.score >= 60 ? 'bg-green-500' :
                                  signalsData.timeframe_signals.intraday.score >= 40 ? 'bg-gray-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${signalsData.timeframe_signals.intraday.score}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Swing Trading */}
                        <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold">Swing</p>
                            <span className={`px-3 py-1 rounded-md text-sm font-bold ${
                              signalsData.timeframe_signals.swing.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                              signalsData.timeframe_signals.swing.signal === 'SELL' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {signalsData.timeframe_signals.swing.signal}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{signalsData.timeframe_signals.swing.timeframe}</p>
                          <p className="text-sm text-muted-foreground">{signalsData.timeframe_signals.swing.description}</p>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Score</span>
                              <span className="font-semibold">{signalsData.timeframe_signals.swing.score}/100</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  signalsData.timeframe_signals.swing.score >= 60 ? 'bg-green-500' :
                                  signalsData.timeframe_signals.swing.score >= 40 ? 'bg-gray-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${signalsData.timeframe_signals.swing.score}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Long-term */}
                        <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold">Long-term</p>
                            <span className={`px-3 py-1 rounded-md text-sm font-bold ${
                              signalsData.timeframe_signals.long_term.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                              signalsData.timeframe_signals.long_term.signal === 'SELL' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {signalsData.timeframe_signals.long_term.signal}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{signalsData.timeframe_signals.long_term.timeframe}</p>
                          <p className="text-sm text-muted-foreground">{signalsData.timeframe_signals.long_term.description}</p>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Score</span>
                              <span className="font-semibold">{signalsData.timeframe_signals.long_term.score}/100</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  signalsData.timeframe_signals.long_term.score >= 60 ? 'bg-green-500' :
                                  signalsData.timeframe_signals.long_term.score >= 40 ? 'bg-gray-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${signalsData.timeframe_signals.long_term.score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* VWAP + Price Action Strategy */}
                  {signalsData.vwap_strategy && (
                    <Card className="glassmorphism border-2 border-blue-500/30">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl">VWAP + Price Action Strategy</CardTitle>
                            <CardDescription>Best for Intraday Trading (70-76% win rate)</CardDescription>
                          </div>
                          <span className={`px-4 py-2 rounded-lg text-lg font-bold ${
                            signalsData.vwap_strategy.signal === 'BUY' ? 'bg-green-500/20 text-green-400 border-2 border-green-500' :
                            signalsData.vwap_strategy.signal === 'SELL' ? 'bg-red-500/20 text-red-400 border-2 border-red-500' :
                            signalsData.vwap_strategy.signal === 'NOT APPLICABLE' ? 'bg-gray-500/20 text-gray-400 border-2 border-gray-500' :
                            'bg-gray-500/20 text-gray-400 border-2 border-gray-500'
                          }`}>
                            {signalsData.vwap_strategy.signal}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Strategy Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Strategy Score</p>
                            <p className="text-2xl font-bold">{signalsData.vwap_strategy.score}/100</p>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full ${
                                  signalsData.vwap_strategy.score >= 65 ? 'bg-green-500' :
                                  signalsData.vwap_strategy.score >= 35 ? 'bg-gray-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${signalsData.vwap_strategy.score}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Effectiveness</p>
                            <p className="text-lg font-semibold text-green-400">{signalsData.vwap_strategy.effectiveness}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Confirmations</p>
                            <p className="text-2xl font-bold">{signalsData.vwap_strategy.confirmations.toFixed(1)}/2.0</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {signalsData.vwap_strategy.confirmations >= 2 ? '✅ Strong Signal' :
                               signalsData.vwap_strategy.confirmations <= -2 ? '✅ Strong Signal' :
                               '⚠️ Weak Signal'}
                            </p>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-sm font-semibold mb-2">💡 Recommendation</p>
                          <p className="text-sm text-muted-foreground">{signalsData.vwap_strategy.recommendation}</p>
                        </div>

                        {/* VWAP Data */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            VWAP Analysis
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Current VWAP</span>
                                <span className="font-semibold">{formatCurrency(signalsData.vwap_strategy.vwap_data.vwap, ticker)}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Price Position</span>
                                <span className={`font-semibold ${
                                  signalsData.vwap_strategy.vwap_data.position.includes('Oversold') ? 'text-green-400' :
                                  signalsData.vwap_strategy.vwap_data.position.includes('Overbought') ? 'text-red-400' :
                                  'text-gray-400'
                                }`}>
                                  {signalsData.vwap_strategy.vwap_data.position}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm text-muted-foreground">Distance from VWAP</span>
                                <span className={`font-semibold ${
                                  signalsData.vwap_strategy.vwap_data.distance_from_vwap_percent > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {signalsData.vwap_strategy.vwap_data.distance_from_vwap_percent.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground mb-2">VWAP Bands</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between p-2 bg-red-500/10 rounded">
                                  <span className="text-red-400">Upper Band +2σ</span>
                                  <span>{formatCurrency(signalsData.vwap_strategy.vwap_data.upper_band_2, ticker)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-red-500/5 rounded">
                                  <span className="text-red-400/70">Upper Band +1σ</span>
                                  <span>{formatCurrency(signalsData.vwap_strategy.vwap_data.upper_band_1, ticker)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-blue-500/20 rounded font-semibold">
                                  <span className="text-blue-400">VWAP</span>
                                  <span>{formatCurrency(signalsData.vwap_strategy.vwap_data.vwap, ticker)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-green-500/5 rounded">
                                  <span className="text-green-400/70">Lower Band -1σ</span>
                                  <span>{formatCurrency(signalsData.vwap_strategy.vwap_data.lower_band_1, ticker)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-green-500/10 rounded">
                                  <span className="text-green-400">Lower Band -2σ</span>
                                  <span>{formatCurrency(signalsData.vwap_strategy.vwap_data.lower_band_2, ticker)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Price Action Patterns */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Price Action Patterns
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Detected Patterns</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {signalsData.vwap_strategy.price_action.patterns.map((pattern, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-md">
                                    {pattern}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Signal Strength</p>
                              <p className={`text-2xl font-bold ${
                                signalsData.vwap_strategy.price_action.signal_strength > 20 ? 'text-green-400' :
                                signalsData.vwap_strategy.price_action.signal_strength < -20 ? 'text-red-400' :
                                'text-gray-400'
                              }`}>
                                {signalsData.vwap_strategy.price_action.signal_strength > 0 ? '+' : ''}
                                {signalsData.vwap_strategy.price_action.signal_strength}
                              </p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Dominant Pattern</p>
                              <p className={`text-xl font-bold ${
                                signalsData.vwap_strategy.price_action.dominant_pattern === 'BULLISH' ? 'text-green-400' :
                                signalsData.vwap_strategy.price_action.dominant_pattern === 'BEARISH' ? 'text-red-400' :
                                'text-gray-400'
                              }`}>
                                {signalsData.vwap_strategy.price_action.dominant_pattern}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Timeframe Suitability */}
                        <div>
                          <h4 className="font-semibold mb-3">Strategy Suitability by Timeframe</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <p className="text-sm font-semibold mb-1">Intraday Trading</p>
                              <p className="text-xs text-muted-foreground">{signalsData.vwap_strategy.timeframe_suitability.intraday}</p>
                            </div>
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                              <p className="text-sm font-semibold mb-1">Day Trading</p>
                              <p className="text-xs text-muted-foreground">{signalsData.vwap_strategy.timeframe_suitability.day_trading}</p>
                            </div>
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <p className="text-sm font-semibold mb-1">Swing Trading</p>
                              <p className="text-xs text-muted-foreground">{signalsData.vwap_strategy.timeframe_suitability.swing}</p>
                            </div>
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <p className="text-sm font-semibold mb-1">Long-term Investing</p>
                              <p className="text-xs text-muted-foreground">{signalsData.vwap_strategy.timeframe_suitability.long_term}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}


                  {/* Technical & Fundamental Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Technical Analysis */}
                    <Card className="glassmorphism">
                      <CardHeader>
                        <CardTitle>Technical Analysis</CardTitle>
                        <CardDescription>Score: {signalsData.technical_analysis.score}/100 (Weight: 50%)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {signalsData.technical_analysis.signals.map((signal, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                              <span className="text-sm font-medium">{signal.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">Weight: {signal.weight}%</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  signal.score >= 75 ? 'bg-green-500/20 text-green-400' :
                                  signal.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                  signal.score >= 25 ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {signal.score}/100
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fundamental Analysis */}
                    <Card className="glassmorphism">
                      <CardHeader>
                        <CardTitle>Fundamental Analysis</CardTitle>
                        <CardDescription>Score: {signalsData.fundamental_analysis.score}/100 (Weight: 30%)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {signalsData.fundamental_analysis.signals.map((signal, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                              <span className="text-sm font-medium">{signal.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">Weight: {signal.weight}%</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  signal.score >= 75 ? 'bg-green-500/20 text-green-400' :
                                  signal.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                  signal.score >= 25 ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {signal.score}/100
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Key Indicators */}
                  <Card className="glassmorphism">
                    <CardHeader>
                      <CardTitle>Key Indicators</CardTitle>
                      <CardDescription>Critical metrics for decision making</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">RSI (14)</p>
                          <p className="text-2xl font-bold">{signalsData.key_indicators.rsi.toFixed(2)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">MACD Histogram</p>
                          <p className="text-2xl font-bold">{signalsData.key_indicators.macd_histogram.toFixed(4)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Price vs SMA50</p>
                          <p className="text-2xl font-bold">{signalsData.key_indicators.price_vs_sma50}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Price vs SMA200</p>
                          <p className="text-2xl font-bold">{signalsData.key_indicators.price_vs_sma200}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Volume Ratio</p>
                          <p className="text-2xl font-bold">{signalsData.key_indicators.volume_ratio.toFixed(2)}x</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">ADX (Trend Strength)</p>
                          <p className="text-2xl font-bold">{signalsData.key_indicators.adx.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Disclaimer */}
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-400">
                      <strong>Risk Disclaimer:</strong> These signals are generated using quantitative models and should be used for educational purposes only. Past performance does not guarantee future results. Always perform your own due diligence, consider your risk tolerance, and consult with a financial advisor before making investment decisions. Never invest more than you can afford to lose.
                    </p>
                  </div>
                </>
              ) : (
                <Card className="glassmorphism">
                  <CardContent className="py-12">
                    <p className="text-center text-muted-foreground">Loading comprehensive trading signals...</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
