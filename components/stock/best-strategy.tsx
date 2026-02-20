'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, Shield, Target, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface BestStrategyProps {
  ticker: string;
}

interface StrategyData {
  current_signals: {
    overall_signal: string;
    overall_score: number;
    confidence: string;
    technical_score: number;
    fundamental_score: number;
    sentiment_score: number;
    timeframes: any;
  };
  backtest_validation: {
    period: string;
    total_trades: number;
    win_rate_pct: number;
    total_return_pct: number;
    cagr_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    profit_factor: number;
    is_significant: boolean;
    confidence_level: string;
    benchmark_return: number;
    alpha: number;
  };
  best_strategy: {
    recommendation: string;
    confidence: string;
    action: string;
    historical_performance: {
      win_rate_pct: number;
      total_trades: number;
      avg_trade_duration_days: number;
      profit_factor: number;
      max_consecutive_losses: number;
    };
    entry_exit_levels: {
      current_price: number;
      recommended_entry: number;
      stop_loss: number;
      stop_loss_pct: number;
      take_profit: number;
      take_profit_pct: number;
      risk_reward_ratio: number;
      trailing_stop_pct: number;
    };
    position_sizing: {
      recommended_position_pct: number;
      max_position_pct: number;
      risk_per_trade_pct: number;
    };
    exit_statistics: {
      take_profit_exits: number;
      stop_loss_exits: number;
      trailing_stop_exits: number;
      signal_exits: number;
      take_profit_rate_pct: number;
    };
    validation_status: {
      is_statistically_significant: boolean;
      confidence_level: string;
      minimum_trades_met: boolean;
      sample_size: number;
      years_tested: number;
    };
  };
}

export default function BestStrategy({ ticker }: BestStrategyProps) {
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/signals/with-backtest/${ticker}`);

        if (!response.ok) {
          throw new Error('Failed to fetch strategy data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [ticker]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🚀 Best Strategy (10-Year Validated)</CardTitle>
          <CardDescription>Loading backtest validation...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🚀 Best Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error: {error || 'No data available'}</div>
        </CardContent>
      </Card>
    );
  }

  const { best_strategy, backtest_validation, current_signals } = data;

  // Determine colors based on recommendation
  const getRecommendationColor = (rec: string) => {
    if (rec.includes('STRONG')) return 'text-green-500';
    if (rec.includes('NOT PROFITABLE') || rec.includes('NOT ENOUGH')) return 'text-red-500';
    if (rec.includes('MODERATE')) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      'HIGH': 'bg-green-600',
      'MEDIUM': 'bg-yellow-600',
      'LOW': 'bg-red-600',
      'VERY_LOW': 'bg-red-800'
    };
    return colors[confidence] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Main Recommendation Card */}
      <Card className="border-2 border-blue-600">
        <CardHeader>
          <CardTitle className="text-2xl">🚀 Best Strategy (10-Year Validated)</CardTitle>
          <CardDescription>
            Analyzed {backtest_validation.total_trades} trades over {best_strategy.validation_status.years_tested} years
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recommendation */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`text-3xl font-bold ${getRecommendationColor(best_strategy.recommendation)}`}>
                  {best_strategy.recommendation}
                </h3>
                <Badge className={`mt-2 ${getConfidenceBadge(best_strategy.confidence)}`}>
                  {best_strategy.confidence} Confidence
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Historical Win Rate</div>
                <div className="text-3xl font-bold text-white">
                  {best_strategy.historical_performance.win_rate_pct.toFixed(1)}%
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-300 mt-4">
              {best_strategy.action}
            </p>
          </div>

          {/* Entry/Exit Levels - MOST IMPORTANT */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-900 border-blue-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-300">Entry Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  ₹{best_strategy.entry_exit_levels.recommended_entry.toFixed(2)}
                </div>
                <div className="text-sm text-gray-300 mt-1">Current price</div>
              </CardContent>
            </Card>

            <Card className="bg-red-900 border-red-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-300 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Stop Loss
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  ₹{best_strategy.entry_exit_levels.stop_loss.toFixed(2)}
                </div>
                <div className="text-sm text-red-300 mt-1">
                  {best_strategy.entry_exit_levels.stop_loss_pct.toFixed(1)}% loss
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-900 border-green-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Take Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  ₹{best_strategy.entry_exit_levels.take_profit.toFixed(2)}
                </div>
                <div className="text-sm text-green-300 mt-1">
                  +{best_strategy.entry_exit_levels.take_profit_pct.toFixed(1)}% gain
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Risk Management */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Risk:Reward</div>
              <div className="text-2xl font-bold text-white">
                1:{best_strategy.entry_exit_levels.risk_reward_ratio}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Trailing Stop</div>
              <div className="text-2xl font-bold text-yellow-500">
                {best_strategy.entry_exit_levels.trailing_stop_pct}%
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Position Size</div>
              <div className="text-2xl font-bold text-blue-500">
                {best_strategy.position_sizing.recommended_position_pct}%
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Max Risk/Trade</div>
              <div className="text-2xl font-bold text-red-500">
                {best_strategy.position_sizing.risk_per_trade_pct}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 10-Year Backtest Validation */}
      <Card>
        <CardHeader>
          <CardTitle>📊 10-Year Backtest Validation</CardTitle>
          <CardDescription>{backtest_validation.period}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Trades</div>
              <div className="text-2xl font-bold text-white">
                {backtest_validation.total_trades}
              </div>
              {backtest_validation.is_significant ? (
                <Badge className="mt-2 bg-green-600">Significant</Badge>
              ) : (
                <Badge className="mt-2 bg-red-600">Not Significant</Badge>
              )}
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Win Rate</div>
              <div className="text-2xl font-bold text-green-500">
                {backtest_validation.win_rate_pct.toFixed(1)}%
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Total Return</div>
              <div className={`text-2xl font-bold ${backtest_validation.total_return_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {backtest_validation.total_return_pct >= 0 ? '+' : ''}{backtest_validation.total_return_pct.toFixed(1)}%
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">CAGR</div>
              <div className={`text-2xl font-bold ${backtest_validation.cagr_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {backtest_validation.cagr_pct >= 0 ? '+' : ''}{backtest_validation.cagr_pct.toFixed(1)}%/yr
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Sharpe Ratio</div>
              <div className="text-2xl font-bold text-white">
                {backtest_validation.sharpe_ratio.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-500">
                -{backtest_validation.max_drawdown_pct.toFixed(1)}%
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Profit Factor</div>
              <div className="text-2xl font-bold text-white">
                {backtest_validation.profit_factor.toFixed(2)}
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">vs Buy & Hold</div>
              <div className={`text-2xl font-bold ${backtest_validation.alpha >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {backtest_validation.alpha >= 0 ? '+' : ''}{backtest_validation.alpha.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Exit Statistics */}
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-400 mb-3">Historical Exit Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Take Profit Exits</div>
                <div className="text-xl font-bold text-green-500">
                  {best_strategy.exit_statistics.take_profit_exits} ({best_strategy.exit_statistics.take_profit_rate_pct}%)
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Stop Loss Exits</div>
                <div className="text-xl font-bold text-red-500">
                  {best_strategy.exit_statistics.stop_loss_exits}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Trailing Stop Exits</div>
                <div className="text-xl font-bold text-yellow-500">
                  {best_strategy.exit_statistics.trailing_stop_exits}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Signal Exits</div>
                <div className="text-xl font-bold text-blue-500">
                  {best_strategy.exit_statistics.signal_exits}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Performance */}
      <Card>
        <CardHeader>
          <CardTitle>📈 Historical Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Avg Hold Time</div>
              <div className="text-2xl font-bold text-white">
                {best_strategy.historical_performance.avg_trade_duration_days.toFixed(0)} days
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Max Losing Streak</div>
              <div className="text-2xl font-bold text-red-500">
                {best_strategy.historical_performance.max_consecutive_losses}
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-sm text-gray-400">Sample Size</div>
              <div className="text-2xl font-bold text-white">
                {best_strategy.validation_status.sample_size} trades
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      {!best_strategy.validation_status.is_statistically_significant && (
        <Card className="border-yellow-600 bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mt-1" />
              <div>
                <h4 className="font-semibold text-yellow-500">Statistical Significance Warning</h4>
                <p className="text-sm text-gray-300 mt-1">
                  Only {best_strategy.validation_status.sample_size} trades found in 10 years.
                  Need minimum 30 trades (recommend 200+) for statistical validity.
                  Results may not be reliable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
