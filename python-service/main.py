"""
ProTrader AI - Python FastAPI Service
Advanced technical analysis and sentiment analysis
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import yfinance as yf
from indicators import (
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_sma,
    calculate_all_indicators
)
from sentiment import analyze_sentiment_vader, analyze_news_sentiment
from trading_signals import analyze_trading_signals
from enhanced_signals import enhance_trading_signals

app = FastAPI(
    title="ProTrader AI Python Service",
    description="Advanced quantitative analysis for ProTrader AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/indicators/{ticker}",
            "/sentiment/text",
            "/sentiment/news",
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
        # Fetch data
        stock = yf.Ticker(request.ticker)
        df = stock.history(period=request.period, interval=request.interval)

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
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, interval=interval)

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

@app.post("/backtest")
async def backtest_strategy(ticker: str, start_date: str, end_date: str):
    """
    Backtest a trading strategy (placeholder for future implementation)
    """
    return {
        "message": "Backtesting endpoint - coming soon!",
        "ticker": ticker,
        "start_date": start_date,
        "end_date": end_date
    }

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
