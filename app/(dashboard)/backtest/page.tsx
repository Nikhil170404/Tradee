"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    TrendingUp, TrendingDown, BarChart3, AlertCircle, Play, RefreshCw,
    ArrowLeft, DollarSign, Target, Percent
} from 'lucide-react'
import Link from 'next/link'

interface StrategyResult {
    strategy: string
    ticker: string
    period: string
    parameters?: Record<string, any>
    results: {
        total_return_pct: number
        sharpe_ratio: number | string
        sortino_ratio?: number | string
        max_drawdown_pct: number | string
        win_rate_pct: number
        total_trades: number
        profit_factor?: number
        avg_trade_pct?: number
        final_value: number
    }
    benchmark: {
        buy_hold_return_pct: number
    }
    note?: string
    error?: string
}

interface BacktestResult {
    ticker: string
    period: string
    initial_capital: number
    timestamp: string
    strategies: StrategyResult[]
    best_strategy?: string
    recommendation?: string
}

export default function BacktestPage() {
    const [ticker, setTicker] = useState('RELIANCE.NS')
    const [startDate, setStartDate] = useState('2023-01-01')
    const [endDate, setEndDate] = useState('2024-01-01')
    const [initialCapital, setInitialCapital] = useState(100000)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<BacktestResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const runBacktest = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const response = await fetch('/api/quant/backtest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    startDate,
                    endDate,
                    initialCapital
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Backtest failed')
            }

            setResult(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value)
    }

    const formatPercent = (value: number | string) => {
        if (typeof value === 'string') return value
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
    }

    const getReturnColor = (value: number) => {
        if (value >= 10) return 'text-green-400'
        if (value >= 0) return 'text-green-500'
        if (value >= -10) return 'text-orange-500'
        return 'text-red-500'
    }

    // Popular Nifty 50 stocks for quick selection
    const popularStocks = [
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
        'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS'
    ]

    return (
        <div className="min-h-screen bg-background p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary mb-2">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <BarChart3 className="h-8 w-8 text-primary" />
                            Strategy Backtester
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Test RSI, MACD, and Combined strategies against historical data
                        </p>
                    </div>
                </div>

                {/* Input Form */}
                <Card className="glassmorphism border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Backtest Parameters
                        </CardTitle>
                        <CardDescription>
                            Configure your backtest settings. Uses real historical data from Yahoo Finance.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Quick Stock Selection */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Quick Select (Nifty 50)</label>
                            <div className="flex flex-wrap gap-2">
                                {popularStocks.map((stock) => (
                                    <Button
                                        key={stock}
                                        variant={ticker === stock ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setTicker(stock)}
                                    >
                                        {stock.replace('.NS', '')}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Stock Ticker</label>
                                <Input
                                    value={ticker}
                                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                    placeholder="e.g., RELIANCE.NS"
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Add .NS for NSE stocks
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Start Date</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    max={endDate}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">End Date</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    Initial Capital (₹)
                                </label>
                                <Input
                                    type="number"
                                    value={initialCapital}
                                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                                    min={1000}
                                    max={100000000}
                                    step={10000}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={runBacktest}
                            disabled={loading || !ticker || !startDate || !endDate}
                            className="w-full md:w-auto gap-2"
                            size="lg"
                        >
                            {loading ? (
                                <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                                <Play className="h-5 w-5" />
                            )}
                            {loading ? 'Running Backtest...' : 'Run Backtest'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Loading State */}
                {loading && (
                    <Card className="glassmorphism">
                        <CardContent className="py-12">
                            <div className="flex flex-col items-center justify-center">
                                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
                                <p className="text-lg font-semibold">Running Backtest...</p>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Testing 3 strategies: RSI, MACD, and Combined
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error State */}
                {error && (
                    <Card className="border-red-500/50 bg-red-500/5">
                        <CardHeader>
                            <CardTitle className="text-red-500 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Backtest Error
                            </CardTitle>
                            <CardDescription className="text-red-400">{error}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Make sure the ticker is valid and the Python service is running.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                {result && !loading && (
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <Card className="glassmorphism border-2 border-primary/50 overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <BarChart3 className="h-32 w-32" />
                            </div>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-3xl">{result.ticker.replace('.NS', '')}</CardTitle>
                                        <CardDescription className="text-lg">{result.period}</CardDescription>
                                    </div>
                                    {result.best_strategy && (
                                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg px-4 py-2">
                                            🏆 Best: {result.best_strategy}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {result.recommendation && (
                                    <p className="text-muted-foreground mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                        💡 {result.recommendation}
                                    </p>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1">Initial Capital</p>
                                        <p className="text-xl font-bold">{formatCurrency(result.initial_capital)}</p>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1">Strategies Tested</p>
                                        <p className="text-xl font-bold">{result.strategies.filter(s => !s.error).length}</p>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1">Test Period</p>
                                        <p className="text-lg font-medium">
                                            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1">Generated</p>
                                        <p className="text-sm font-medium">
                                            {new Date(result.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Strategy Comparison Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {result.strategies.map((strategy, idx) => (
                                <Card
                                    key={idx}
                                    className={`glassmorphism transition-all hover:scale-[1.02] ${strategy.strategy === result.best_strategy
                                        ? 'border-2 border-green-500 ring-2 ring-green-500/20'
                                        : 'border-border/50'
                                        }`}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{strategy.strategy}</CardTitle>
                                            {strategy.strategy === result.best_strategy && (
                                                <Badge className="bg-green-500">🏆 Best</Badge>
                                            )}
                                        </div>
                                        {strategy.parameters && (
                                            <CardDescription className="text-xs">
                                                {Object.entries(strategy.parameters).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {strategy.error ? (
                                            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                                                <p className="text-red-500 text-sm">{strategy.error}</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Main Metrics */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-muted/50 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Strategy Return</p>
                                                        <p className={`text-2xl font-bold ${getReturnColor(strategy.results.total_return_pct)}`}>
                                                            {formatPercent(strategy.results.total_return_pct)}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 bg-muted/50 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Buy & Hold</p>
                                                        <p className={`text-2xl font-bold ${getReturnColor(strategy.benchmark.buy_hold_return_pct)}`}>
                                                            {formatPercent(strategy.benchmark.buy_hold_return_pct)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Beat Benchmark Badge */}
                                                {strategy.results.total_return_pct > strategy.benchmark.buy_hold_return_pct && (
                                                    <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                                                        <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-1">
                                                            <TrendingUp className="h-4 w-4" />
                                                            Beat Buy & Hold by {(strategy.results.total_return_pct - strategy.benchmark.buy_hold_return_pct).toFixed(2)}%
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Secondary Metrics */}
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                                                        <span className="text-muted-foreground">Sharpe</span>
                                                        <span className="font-semibold">
                                                            {typeof strategy.results.sharpe_ratio === 'number'
                                                                ? strategy.results.sharpe_ratio.toFixed(2)
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                                                        <span className="text-muted-foreground">Win Rate</span>
                                                        <span className="font-semibold">
                                                            {strategy.results.win_rate_pct.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                                                        <span className="text-muted-foreground">Max DD</span>
                                                        <span className="font-semibold text-red-400">
                                                            {typeof strategy.results.max_drawdown_pct === 'number'
                                                                ? `${strategy.results.max_drawdown_pct.toFixed(2)}%`
                                                                : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                                                        <span className="text-muted-foreground">Trades</span>
                                                        <span className="font-semibold">
                                                            {strategy.results.total_trades}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Final Value */}
                                                <div className="pt-3 border-t border-border/50">
                                                    <p className="text-xs text-muted-foreground mb-1">Final Portfolio Value</p>
                                                    <p className={`text-3xl font-bold ${strategy.results.final_value > result.initial_capital
                                                        ? 'text-green-400'
                                                        : 'text-red-400'
                                                        }`}>
                                                        {formatCurrency(strategy.results.final_value)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        P&L: {formatCurrency(strategy.results.final_value - result.initial_capital)}
                                                    </p>
                                                </div>

                                                {/* Note */}
                                                {strategy.note && (
                                                    <p className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded">
                                                        ℹ️ {strategy.note}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Disclaimer */}
                        <Card className="bg-yellow-500/5 border-yellow-500/30">
                            <CardContent className="py-4">
                                <p className="text-sm text-muted-foreground text-center">
                                    ⚠️ <strong>Disclaimer:</strong> Past performance does not guarantee future results.
                                    Backtesting uses historical data and may not account for slippage, fees, or market impact.
                                    Use these results as one of many inputs in your investment decisions.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
