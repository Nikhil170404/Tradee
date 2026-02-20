"""
ProTrader AI - Backtesting Engine
Real backtesting using vectorbt (free, fast, vectorized)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import yfinance as yf

# Try vectorbt, fall back to simple implementation if not installed
try:
    import vectorbt as vbt
    HAS_VECTORBT = True
except ImportError:
    HAS_VECTORBT = False
    print("vectorbt not installed. Using simple backtesting fallback.")


def get_historical_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch historical data for backtesting"""
    stock = yf.Ticker(ticker)
    df = stock.history(start=start_date, end=end_date)
    if df.empty:
        raise ValueError(f"No data found for {ticker} between {start_date} and {end_date}")
    return df


def calculate_rsi_series(prices: pd.Series, period: int = 14) -> pd.Series:
    """Calculate RSI for entire series (vectorized)"""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    avg_gain = gain.ewm(com=period-1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period-1, min_periods=period).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def calculate_macd_series(prices: pd.Series) -> Dict[str, pd.Series]:
    """Calculate MACD for entire series"""
    ema12 = prices.ewm(span=12, adjust=False).mean()
    ema26 = prices.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    histogram = macd_line - signal_line
    return {
        "macd": macd_line,
        "signal": signal_line,
        "histogram": histogram
    }


def backtest_rsi_strategy(
    ticker: str,
    start_date: str,
    end_date: str,
    rsi_period: int = 14,
    oversold: int = 35,      # More realistic threshold (was 30)
    overbought: int = 65,    # More realistic threshold (was 70)
    initial_capital: float = 100000
) -> Dict:
    """
    Backtest RSI mean-reversion strategy
    Buy when RSI < oversold, Sell when RSI > overbought
    """
    df = get_historical_data(ticker, start_date, end_date)
    prices = df['Close']
    
    # Calculate RSI
    rsi = calculate_rsi_series(prices, rsi_period)
    
    # Generate signals
    entries = rsi < oversold      # Buy signal when oversold
    exits = rsi > overbought       # Sell signal when overbought
    
    if HAS_VECTORBT:
        # Use vectorbt for efficient backtesting
        portfolio = vbt.Portfolio.from_signals(
            prices,
            entries=entries,
            exits=exits,
            init_cash=initial_capital,
            freq='1D'
        )
        
        stats = portfolio.stats()
        
        return {
            "strategy": "RSI Mean Reversion",
            "ticker": ticker,
            "period": f"{start_date} to {end_date}",
            "parameters": {
                "rsi_period": rsi_period,
                "oversold": oversold,
                "overbought": overbought
            },
            "results": {
                "total_return_pct": float(stats.get('Total Return [%]', 0)),
                "sharpe_ratio": float(stats.get('Sharpe Ratio', 0)),
                "sortino_ratio": float(stats.get('Sortino Ratio', 0)),
                "max_drawdown_pct": float(stats.get('Max Drawdown [%]', 0)),
                "win_rate_pct": float(stats.get('Win Rate [%]', 0)),
                "total_trades": int(stats.get('Total Trades', 0)),
                "profit_factor": float(stats.get('Profit Factor', 0)),
                "avg_trade_pct": float(stats.get('Avg Trade [%]', 0)),
                "final_value": float(portfolio.final_value())
            },
            "benchmark": {
                "buy_hold_return_pct": float((prices.iloc[-1] / prices.iloc[0] - 1) * 100)
            }
        }
    else:
        # Simple fallback backtesting
        return _simple_backtest(prices, entries, exits, initial_capital, "RSI Mean Reversion", ticker, start_date, end_date)


def backtest_macd_strategy(
    ticker: str,
    start_date: str,
    end_date: str,
    initial_capital: float = 100000
) -> Dict:
    """
    Backtest MACD crossover strategy
    Buy when MACD > Signal (bullish crossover)
    Sell when MACD < Signal (bearish crossover)
    """
    df = get_historical_data(ticker, start_date, end_date)
    prices = df['Close']
    
    # Calculate MACD
    macd_data = calculate_macd_series(prices)
    
    # Generate signals based on crossovers
    macd_above_signal = macd_data['macd'] > macd_data['signal']
    entries = macd_above_signal & ~macd_above_signal.shift(1).fillna(False)  # Bullish crossover
    exits = ~macd_above_signal & macd_above_signal.shift(1).fillna(True)      # Bearish crossover
    
    if HAS_VECTORBT:
        portfolio = vbt.Portfolio.from_signals(
            prices,
            entries=entries,
            exits=exits,
            init_cash=initial_capital,
            freq='1D'
        )
        
        stats = portfolio.stats()
        
        return {
            "strategy": "MACD Crossover",
            "ticker": ticker,
            "period": f"{start_date} to {end_date}",
            "parameters": {
                "fast_period": 12,
                "slow_period": 26,
                "signal_period": 9
            },
            "results": {
                "total_return_pct": float(stats.get('Total Return [%]', 0)),
                "sharpe_ratio": float(stats.get('Sharpe Ratio', 0)),
                "sortino_ratio": float(stats.get('Sortino Ratio', 0)),
                "max_drawdown_pct": float(stats.get('Max Drawdown [%]', 0)),
                "win_rate_pct": float(stats.get('Win Rate [%]', 0)),
                "total_trades": int(stats.get('Total Trades', 0)),
                "profit_factor": float(stats.get('Profit Factor', 0)),
                "avg_trade_pct": float(stats.get('Avg Trade [%]', 0)),
                "final_value": float(portfolio.final_value())
            },
            "benchmark": {
                "buy_hold_return_pct": float((prices.iloc[-1] / prices.iloc[0] - 1) * 100)
            }
        }
    else:
        return _simple_backtest(prices, entries, exits, initial_capital, "MACD Crossover", ticker, start_date, end_date)


def backtest_combined_strategy(
    ticker: str,
    start_date: str,
    end_date: str,
    initial_capital: float = 100000
) -> Dict:
    """
    Backtest combined RSI + MACD strategy
    Buy when: RSI < 40 AND MACD histogram > 0 (momentum turning)
    Sell when: RSI > 60 AND MACD histogram < 0
    """
    df = get_historical_data(ticker, start_date, end_date)
    prices = df['Close']
    
    # Calculate indicators
    rsi = calculate_rsi_series(prices)
    macd_data = calculate_macd_series(prices)
    
    # Combined signals - more conservative
    entries = (rsi < 40) & (macd_data['histogram'] > 0)
    exits = (rsi > 60) & (macd_data['histogram'] < 0)
    
    if HAS_VECTORBT:
        portfolio = vbt.Portfolio.from_signals(
            prices,
            entries=entries,
            exits=exits,
            init_cash=initial_capital,
            freq='1D'
        )
        
        stats = portfolio.stats()
        
        return {
            "strategy": "Combined RSI + MACD",
            "ticker": ticker,
            "period": f"{start_date} to {end_date}",
            "parameters": {
                "rsi_entry": 40,
                "rsi_exit": 60,
                "macd_confirmation": True
            },
            "results": {
                "total_return_pct": float(stats.get('Total Return [%]', 0)),
                "sharpe_ratio": float(stats.get('Sharpe Ratio', 0)),
                "sortino_ratio": float(stats.get('Sortino Ratio', 0)),
                "max_drawdown_pct": float(stats.get('Max Drawdown [%]', 0)),
                "win_rate_pct": float(stats.get('Win Rate [%]', 0)),
                "total_trades": int(stats.get('Total Trades', 0)),
                "profit_factor": float(stats.get('Profit Factor', 0)),
                "avg_trade_pct": float(stats.get('Avg Trade [%]', 0)),
                "final_value": float(portfolio.final_value())
            },
            "benchmark": {
                "buy_hold_return_pct": float((prices.iloc[-1] / prices.iloc[0] - 1) * 100)
            }
        }
    else:
        return _simple_backtest(prices, entries, exits, initial_capital, "Combined RSI + MACD", ticker, start_date, end_date)


# Transaction costs (realistic for India: ~0.1% per trade including brokerage, STT, etc.)
TRANSACTION_COST_PCT = 0.001  # 0.1% per transaction

def _simple_backtest(
    prices: pd.Series,
    entries: pd.Series,
    exits: pd.Series,
    initial_capital: float,
    strategy_name: str,
    ticker: str,
    start_date: str,
    end_date: str
) -> Dict:
    """Simple backtesting fallback when vectorbt is not available"""
    capital = initial_capital
    position = 0
    trades = []
    entry_price = 0
    
    # Track portfolio value over time for metrics calculation
    portfolio_values = []
    
    for i in range(len(prices)):
        # Calculate current portfolio value
        if position > 0:
            current_value = position * prices.iloc[i]
        else:
            current_value = capital
        portfolio_values.append(current_value)
        
        if entries.iloc[i] and position == 0:
            # Buy
            position = capital / prices.iloc[i]
            entry_price = prices.iloc[i]
            capital = 0
        elif exits.iloc[i] and position > 0:
            # Sell
            capital = position * prices.iloc[i]
            profit_pct = (prices.iloc[i] - entry_price) / entry_price * 100
            trades.append(profit_pct)
            position = 0
    
    # Close any open position
    if position > 0:
        capital = position * prices.iloc[-1]
        profit_pct = (prices.iloc[-1] - entry_price) / entry_price * 100
        trades.append(profit_pct)
    
    final_value = capital
    total_return = (final_value - initial_capital) / initial_capital * 100
    
    # Calculate simple metrics
    winning_trades = [t for t in trades if t > 0]
    losing_trades = [t for t in trades if t < 0]
    win_rate = len(winning_trades) / len(trades) * 100 if trades else 0
    
    # Calculate Sharpe Ratio (using daily returns)
    portfolio_series = pd.Series(portfolio_values)
    daily_returns = portfolio_series.pct_change().dropna()
    
    if len(daily_returns) > 1 and daily_returns.std() > 0:
        # Annualized Sharpe Ratio (assuming 252 trading days)
        sharpe_ratio = (daily_returns.mean() / daily_returns.std()) * np.sqrt(252)
        sharpe_ratio = round(sharpe_ratio, 2)
    else:
        sharpe_ratio = 0.0
    
    # Calculate Max Drawdown
    portfolio_series = pd.Series(portfolio_values)
    cummax = portfolio_series.cummax()
    drawdown = (portfolio_series - cummax) / cummax * 100
    max_drawdown = abs(drawdown.min())
    max_drawdown = round(max_drawdown, 2) if not pd.isna(max_drawdown) else 0.0
    
    # Calculate Sortino Ratio (downside deviation only)
    negative_returns = daily_returns[daily_returns < 0]
    if len(negative_returns) > 0 and negative_returns.std() > 0:
        sortino_ratio = (daily_returns.mean() / negative_returns.std()) * np.sqrt(252)
        sortino_ratio = round(sortino_ratio, 2)
    else:
        sortino_ratio = sharpe_ratio  # Use Sharpe if no negative returns
    
    # Calculate profit factor
    gross_profit = sum([t for t in trades if t > 0]) if winning_trades else 0
    gross_loss = abs(sum([t for t in trades if t < 0])) if losing_trades else 1
    profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else gross_profit
    
    # Average trade
    avg_trade = round(sum(trades) / len(trades), 2) if trades else 0
    
    # Calculate transaction costs
    total_transactions = len(trades) * 2  # Buy and sell for each trade
    transaction_cost_total = total_transactions * TRANSACTION_COST_PCT * 100  # as percentage
    adjusted_return = total_return - transaction_cost_total
    adjusted_final_value = initial_capital * (1 + adjusted_return / 100)
    
    # Statistical significance warning
    is_statistically_significant = len(trades) >= 10
    warning = None
    if len(trades) < 10:
        warning = f"⚠️ Only {len(trades)} trades - results NOT statistically significant (need 10+ trades)"
    elif len(trades) < 30:
        warning = f"⚠️ Only {len(trades)} trades - results have limited significance (recommend 30+ trades)"
    
    return {
        "strategy": strategy_name,
        "ticker": ticker,
        "period": f"{start_date} to {end_date}",
        "results": {
            "total_return_pct": round(adjusted_return, 2),  # After transaction costs
            "gross_return_pct": round(total_return, 2),      # Before costs
            "transaction_costs_pct": round(transaction_cost_total, 2),
            "win_rate_pct": round(win_rate, 2),
            "total_trades": len(trades),
            "final_value": round(adjusted_final_value, 2),
            "sharpe_ratio": sharpe_ratio,
            "sortino_ratio": sortino_ratio,
            "max_drawdown_pct": max_drawdown,
            "profit_factor": profit_factor,
            "avg_trade_pct": avg_trade,
            "is_significant": is_statistically_significant
        },
        "benchmark": {
            "buy_hold_return_pct": round((prices.iloc[-1] / prices.iloc[0] - 1) * 100, 2)
        },
        "warning": warning
    }


def run_full_backtest(
    ticker: str,
    start_date: str,
    end_date: str,
    initial_capital: float = 100000
) -> Dict:
    """
    Run all backtesting strategies and compare results
    """
    results = {
        "ticker": ticker,
        "period": f"{start_date} to {end_date}",
        "initial_capital": initial_capital,
        "timestamp": datetime.now().isoformat(),
        "strategies": []
    }
    
    try:
        # RSI Strategy
        rsi_result = backtest_rsi_strategy(ticker, start_date, end_date, initial_capital=initial_capital)
        results["strategies"].append(rsi_result)
    except Exception as e:
        results["strategies"].append({"strategy": "RSI", "error": str(e)})
    
    try:
        # MACD Strategy
        macd_result = backtest_macd_strategy(ticker, start_date, end_date, initial_capital=initial_capital)
        results["strategies"].append(macd_result)
    except Exception as e:
        results["strategies"].append({"strategy": "MACD", "error": str(e)})
    
    try:
        # Combined Strategy
        combined_result = backtest_combined_strategy(ticker, start_date, end_date, initial_capital=initial_capital)
        results["strategies"].append(combined_result)
    except Exception as e:
        results["strategies"].append({"strategy": "Combined", "error": str(e)})
    
    # Find best strategy
    valid_strategies = [s for s in results["strategies"] if "error" not in s]
    if valid_strategies:
        best = max(valid_strategies, key=lambda x: x["results"].get("sharpe_ratio", 0) if isinstance(x["results"].get("sharpe_ratio"), (int, float)) else 0)
        results["best_strategy"] = best["strategy"]
        results["recommendation"] = f"Based on Sharpe Ratio, {best['strategy']} performed best"
    
    return results


# Quick test
if __name__ == "__main__":
    print("Testing backtesting module...")
    result = run_full_backtest("RELIANCE.NS", "2023-01-01", "2024-01-01")
    import json
    print(json.dumps(result, indent=2, default=str))
