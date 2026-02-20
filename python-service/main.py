"""
ProTrader AI - Python FastAPI Service
Advanced technical analysis and sentiment analysis
NOW WITH: 10-year backtest auto-integrated with signals
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from data_sources import data_source
from indicators import (
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_sma,
    calculate_all_indicators
)
from sentiment import analyze_sentiment_vader, analyze_news_sentiment, get_real_sentiment_score, categorize_sentiment
from news_aggregator import fetch_top_market_news
from trading_signals import analyze_trading_signals
from enhanced_signals import enhance_trading_signals
from backtesting import run_full_backtest

# Import enhanced backtesting
from backtesting_enhanced import run_production_backtest, BacktestConfig

app = FastAPI(
    title="ProTrader AI Python Service",
    description="Advanced quantitative analysis for ProTrader AI",
    version="2.0.0"
)

import os

# CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IndicatorRequest(BaseModel):
    ticker: str
    period: str = "1y"
    interval: str = "1d"

class SentimentRequest(BaseModel):
    text: str

class NewsItem(BaseModel):
    title: str
    description: Optional[str] = None

class NewsSentimentRequest(BaseModel):
    news: List[NewsItem]

@app.get("/")
def read_root():
    return {
        "service": "ProTrader AI Python Service",
        "version": "2.0.0",
        "status": "running",
        "new_features": [
            "10-year backtest auto-integrated with signals",
            "Best strategy recommendation with entry/exit",
            "Historical validation of current signals"
        ],
        "endpoints": [
            "/indicators/{ticker}",
            "/sentiment/text",
            "/sentiment/news",
            "/signals/{ticker}",
            "/signals/with-backtest/{ticker}",  # NEW
            "/backtest/enhanced/{ticker}",       # NEW
            "/health"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "protrader-ai-python"}

@app.post("/indicators")
async def get_indicators(request: IndicatorRequest):
    """
    Calculate all technical indicators for a stock
    """
    try:
        # Fetch data using robust data source
        df = data_source.get_stock_data(request.ticker, request.period, request.interval)

        if df.empty:
            raise HTTPException(status_code=404, detail="No data found for ticker")

        # Calculate indicators
        indicators = calculate_all_indicators(df)

        return {
            "ticker": request.ticker,
            "indicators": indicators,
            "data_points": len(df)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/indicators/{ticker}")
async def get_indicators_simple(ticker: str, period: str = "1y", interval: str = "1d"):
    """
    Simple GET endpoint for indicators
    """
    request = IndicatorRequest(ticker=ticker, period=period, interval=interval)
    return await get_indicators(request)

@app.post("/sentiment/text")
async def analyze_text_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of a single text using VADER
    """
    try:
        sentiment = analyze_sentiment_vader(request.text)
        return {
            "text": request.text[:100] + "..." if len(request.text) > 100 else request.text,
            "sentiment": sentiment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sentiment/news")
async def analyze_news_sentiment_endpoint(request: NewsSentimentRequest):
    """
    Analyze sentiment of multiple news articles
    """
    try:
        # Extract text from news items
        texts = [
            f"{item.title} {item.description or ''}"
            for item in request.news
        ]

        # Analyze each article
        sentiments = [analyze_sentiment_vader(text) for text in texts]

        # Calculate average
        avg_sentiment = sum(s["compound"] for s in sentiments) / len(sentiments)

        # Categorize
        if avg_sentiment > 0.3:
            label = "Very Bullish"
            color = "green"
        elif avg_sentiment > 0.1:
            label = "Bullish"
            color = "lightgreen"
        elif avg_sentiment < -0.3:
            label = "Very Bearish"
            color = "red"
        elif avg_sentiment < -0.1:
            label = "Bearish"
            color = "orange"
        else:
            label = "Neutral"
            color = "gray"

        return {
            "average_sentiment": avg_sentiment,
            "label": label,
            "color": color,
            "article_count": len(sentiments),
            "sentiments": sentiments
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sentiment/news/{ticker}")
async def get_stock_news_sentiment(ticker: str):
    """
    Get real-time news sentiment for a specific ticker
    """
    try:
        # Get real sentiment score which includes analyzed news articles
        result = get_real_sentiment_score(ticker)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sentiment/news/general")
async def get_general_market_news():
    """
    Get top general market news (Nifty 50, Global, Economy)
    """
    try:
        # Fetch top market news
        news_items = fetch_top_market_news(limit=20)

        # Analyze sentiment for each
        analyzed_news = []
        sentiments = []

        for item in news_items:
            # Analyze title
            sentiment = analyze_sentiment_vader(item['title'])
            sentiments.append(sentiment['compound'])

            # Categorize
            category = categorize_sentiment(sentiment['compound'])

            analyzed_news.append({
                "title": item['title'],
                "link": item['link'],
                "publisher": item['publisher'],
                "providerPublishTime": item['providerPublishTime'],
                "sentiment": category['label'],
                "sentiment_score": sentiment['compound']
            })

        # Calculate overall market sentiment
        if sentiments:
            avg_compound = sum(sentiments) / len(sentiments)
            overall_category = categorize_sentiment(avg_compound)
        else:
            avg_compound = 0
            overall_category = {"label": "Neutral", "color": "gray"}

        return {
            "market_sentiment": {
                "score": int((avg_compound + 1) * 50),
                "label": overall_category['label'],
                "color": overall_category['color']
            },
            "news": analyzed_news
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quote/{ticker}")
async def get_stock_quote(ticker: str):
    """
    Get real-time stock quote using yfinance
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Get the most recent data
        hist = stock.history(period="1d")
        if hist.empty:
            raise HTTPException(status_code=404, detail="No data found for ticker")

        current_price = hist['Close'].iloc[-1]
        previous_close = info.get('previousClose', current_price)
        change = current_price - previous_close
        change_percent = (change / previous_close * 100) if previous_close else 0

        return {
            "symbol": ticker,
            "name": info.get('longName') or info.get('shortName') or ticker,
            "price": float(current_price),
            "change": float(change),
            "changePercent": float(change_percent),
            "open": float(info.get('open', hist['Open'].iloc[-1])),
            "high": float(info.get('dayHigh', hist['High'].iloc[-1])),
            "low": float(info.get('dayLow', hist['Low'].iloc[-1])),
            "volume": int(info.get('volume', hist['Volume'].iloc[-1])),
            "previousClose": float(previous_close),
            "marketCap": info.get('marketCap', 0),
            "fiftyDayAvg": info.get('fiftyDayAverage', 0),
            "twoHundredDayAvg": info.get('twoHundredDayAverage', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quote: {str(e)}")

@app.get("/chart/{ticker}")
async def get_chart_data(ticker: str, period: str = "1y", interval: str = "1d"):
    """
    Get historical chart data using yfinance
    """
    try:
        # Use robust data source
        df = data_source.get_stock_data(ticker, period, interval)

        if df.empty:
            raise HTTPException(status_code=404, detail="No data found for ticker")

        # Convert to list of candles
        candles = []
        for index, row in df.iterrows():
            candles.append({
                "timestamp": int(index.timestamp() * 1000),
                "time": int(index.timestamp()),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })

        return candles
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chart data: {str(e)}")

@app.get("/fundamentals/{ticker}")
async def get_fundamentals(ticker: str):
    """
    Get fundamental data using yfinance
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        return {
            "ticker": ticker,
            "fundamentals": {
                "pe": info.get('trailingPE') or info.get('forwardPE'),
                "pb": info.get('priceToBook'),
                "roe": info.get('returnOnEquity'),
                "debtToEquity": info.get('debtToEquity'),
                "revenue": info.get('totalRevenue'),
                "eps": info.get('trailingEps') or info.get('forwardEps'),
                "dividendYield": info.get('dividendYield'),
                "profitMargin": info.get('profitMargins'),
                "bookValue": info.get('bookValue')
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching fundamentals: {str(e)}")

@app.get("/signals/{ticker}")
async def get_trading_signals(ticker: str, enhanced: bool = True):
    """
    Get comprehensive trading signals with multi-timeframe analysis
    Combines technical, fundamental, and sentiment analysis

    Parameters:
    - enhanced: If True (default), returns signals with:
        * Score capping (max 85, no unrealistic 100/100)
        * Signal conflict detection and warnings
        * Risk management (stop loss, take profit, position sizing)
        * Confidence levels (High/Medium/Low)
        * Trading recommendations
    """
    try:
        # Get raw signals
        result = analyze_trading_signals(ticker)

        # Enhance with production-ready features
        if enhanced and 'error' not in result:
            result = enhance_trading_signals(result)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing signals: {str(e)}")


@app.get("/signals/with-backtest/{ticker}")
async def get_signals_with_backtest(ticker: str):
    """
    🚀 NEW: Get trading signals WITH 10-year backtest validation

    Returns:
    - Current signals (buy/sell/neutral)
    - 10-year backtest results proving strategy works
    - Best strategy recommendation with entry/exit levels
    - Historical win rate and performance
    - Recommended position size based on backtest
    """
    try:
        print(f"Analyzing {ticker} with 10-year backtest validation...")

        # 1. Get current signals
        signals = analyze_trading_signals(ticker)
        if 'error' in signals:
            raise HTTPException(status_code=500, detail=signals['error'])

        signals = enhance_trading_signals(signals)

        # 2. Run 10-year backtest (2015-2025)
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=10*365)).strftime("%Y-%m-%d")

        print(f"Running backtest from {start_date} to {end_date}...")
        backtest = run_production_backtest(
            ticker=ticker,
            start_date=start_date,
            end_date=end_date,
            initial_capital=100000
        )

        # 3. Determine best strategy and recommendations
        best_strategy = determine_best_strategy(backtest, signals)

        # 4. Combine everything
        return {
            "ticker": ticker,
            "timestamp": datetime.now().isoformat(),

            # Current signals
            "current_signals": {
                "overall_signal": signals['overall_signal'],
                "overall_score": signals['overall_score'],
                "confidence": signals['confidence_level'],
                "technical_score": signals['technical_analysis']['score'],
                "fundamental_score": signals['fundamental_analysis']['score'],
                "sentiment_score": signals['sentiment_score'],
                "timeframes": {
                    "intraday": signals['timeframe_signals']['intraday'],
                    "swing": signals['timeframe_signals']['swing'],
                    "long_term": signals['timeframe_signals']['long_term']
                }
            },

            # 10-year backtest validation
            "backtest_validation": {
                "period": backtest['period'],
                "total_trades": backtest['trade_statistics']['total_trades'],
                "win_rate_pct": backtest['trade_statistics']['win_rate_pct'],
                "total_return_pct": backtest['performance']['total_return_pct'],
                "cagr_pct": backtest['performance']['cagr_pct'],
                "sharpe_ratio": backtest['performance']['sharpe_ratio'],
                "max_drawdown_pct": backtest['performance']['max_drawdown_pct'],
                "profit_factor": backtest['trade_statistics']['profit_factor'],
                "is_significant": backtest['trade_statistics']['is_statistically_significant'],
                "confidence_level": backtest['trade_statistics']['confidence_level'],
                "benchmark_return": backtest['performance']['benchmark_return_pct'],
                "alpha": backtest['performance']['alpha_vs_benchmark']
            },

            # Best strategy recommendation
            "best_strategy": best_strategy,

            # Full backtest (optional, can be hidden in UI)
            "full_backtest": backtest
        }

    except Exception as e:
        import traceback
        print(f"Error in signals_with_backtest: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


def determine_best_strategy(backtest: Dict[str, Any], signals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze backtest results and current signals to recommend best strategy
    """
    current_price = signals['current_price']

    # Extract backtest performance
    stats = backtest['trade_statistics']
    perf = backtest['performance']
    config = backtest['configuration']

    # Check if strategy is validated
    is_validated = stats['is_statistically_significant']
    win_rate = stats['win_rate_pct']
    total_trades = stats['total_trades']

    # Determine recommendation
    if not is_validated or total_trades < 30:
        recommendation = "⚠️ NOT ENOUGH DATA"
        confidence = "VERY_LOW"
        action = "DO NOT TRADE - Need more historical data for validation"
    elif win_rate < 45:
        recommendation = "❌ STRATEGY NOT PROFITABLE"
        confidence = "LOW"
        action = "DO NOT TRADE - Strategy has poor historical performance"
    elif win_rate >= 60 and perf['sharpe_ratio'] >= 1.0:
        recommendation = "✅ STRONG STRATEGY"
        confidence = "HIGH"
        action = "TRADE WITH CONFIDENCE - Strategy has excellent historical performance"
    elif win_rate >= 50:
        recommendation = "⚠️ MODERATE STRATEGY"
        confidence = "MEDIUM"
        action = "TRADE WITH CAUTION - Use smaller position size"
    else:
        recommendation = "⚠️ WEAK STRATEGY"
        confidence = "LOW"
        action = "AVOID - Strategy shows inconsistent results"

    # Calculate recommended entry/exit based on backtest
    stop_loss_pct = config['stop_loss_pct']
    take_profit_pct = config['take_profit_pct']

    entry_price = current_price
    stop_loss = round(current_price * (1 - stop_loss_pct / 100), 2)
    take_profit = round(current_price * (1 + take_profit_pct / 100), 2)

    # Position sizing based on historical performance
    if win_rate >= 60:
        position_size_pct = 5.0  # Aggressive
    elif win_rate >= 50:
        position_size_pct = 3.0  # Moderate
    else:
        position_size_pct = 1.0  # Conservative

    # Exit breakdown from backtest
    exit_breakdown = backtest['exit_breakdown']
    total_exits = sum(exit_breakdown.values())

    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "action": action,

        "historical_performance": {
            "win_rate_pct": win_rate,
            "total_trades": total_trades,
            "avg_trade_duration_days": stats['avg_trade_duration_days'],
            "profit_factor": stats['profit_factor'],
            "max_consecutive_losses": stats['max_consecutive_losses']
        },

        "entry_exit_levels": {
            "current_price": current_price,
            "recommended_entry": entry_price,
            "stop_loss": stop_loss,
            "stop_loss_pct": -stop_loss_pct,
            "take_profit": take_profit,
            "take_profit_pct": take_profit_pct,
            "risk_reward_ratio": round(take_profit_pct / stop_loss_pct, 2),
            "trailing_stop_pct": config['trailing_stop_pct']
        },

        "position_sizing": {
            "recommended_position_pct": position_size_pct,
            "max_position_pct": config['max_position_pct'],
            "risk_per_trade_pct": config['risk_per_trade_pct']
        },

        "exit_statistics": {
            "take_profit_exits": exit_breakdown.get('take_profit', 0),
            "stop_loss_exits": exit_breakdown.get('stop_loss', 0),
            "trailing_stop_exits": exit_breakdown.get('trailing_stop', 0),
            "signal_exits": exit_breakdown.get('signal_exit', 0),
            "take_profit_rate_pct": round(exit_breakdown.get('take_profit', 0) / total_exits * 100, 1) if total_exits > 0 else 0
        },

        "validation_status": {
            "is_statistically_significant": is_validated,
            "confidence_level": stats['confidence_level'],
            "minimum_trades_met": total_trades >= 30,
            "sample_size": total_trades,
            "years_tested": 10
        }
    }


@app.get("/backtest/enhanced/{ticker}")
async def get_enhanced_backtest(
    ticker: str,
    start_date: str = None,
    end_date: str = None,
    initial_capital: float = 100000
):
    """
    Run production-ready 10-year backtest with risk management
    """
    try:
        # Default to 10 years if not specified
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=10*365)).strftime("%Y-%m-%d")

        result = run_production_backtest(ticker, start_date, end_date, initial_capital)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/backtest")
async def backtest_strategy(ticker: str, start_date: str, end_date: str, initial_capital: float = 100000):
    """
    Backtest trading strategies using vectorbt (if available) or fallback
    """
    try:
        results = run_full_backtest(ticker, start_date, end_date, initial_capital)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtesting failed: {str(e)}")

# Stock Screener Endpoints
from stock_screener import (
    screen_nifty50,
    get_stock_comparison,
    clear_cache
)

@app.get("/screener/nifty50")
async def screen_nifty_50(force_refresh: bool = False):
    """
    Screen all Nifty 50 stocks with intelligent caching

    - First run: ~25-50 seconds (fetches all stocks)
    - Subsequent runs: <1 second (uses cache for 15 minutes)
    - force_refresh=true: Clears cache and re-fetches all

    Returns categorized stocks:
    - Best overall, longterm, intraday, swing
    - Strong buy/sell signals
    - Top gainers/losers
    - Value picks
    """
    try:
        result = screen_nifty50(force_refresh=force_refresh)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error screening stocks: {str(e)}")

@app.post("/screener/compare")
async def compare_stocks(tickers: List[str]):
    """
    Compare multiple stocks side by side
    """
    try:
        result = get_stock_comparison(tickers)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comparing stocks: {str(e)}")

@app.post("/screener/clear-cache")
async def clear_screener_cache():
    """
    Clear all cached stock data
    """
    try:
        result = clear_cache()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
