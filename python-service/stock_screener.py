"""
Stock Screener with Intelligent Caching & Rate Limiting
Analyzes Nifty 50 stocks without hitting Yahoo Finance rate limits
"""

import yfinance as yf
import pandas as pd
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List
from pathlib import Path
import threading
from trading_signals import analyze_trading_signals
from enhanced_signals import enhance_trading_signals

# Cache configuration
CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_DURATION = timedelta(minutes=15)  # Refresh every 15 minutes

# Rate limiting configuration
REQUEST_DELAY = 0.5  # 500ms between requests = 2 requests/second (safe)
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds

# Nifty 50 stocks list (as of 2025)
NIFTY_50_STOCKS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "BAJFINANCE.NS",
    "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS",
    "HCLTECH.NS", "SUNPHARMA.NS", "TITAN.NS", "WIPRO.NS", "ULTRACEMCO.NS",
    "NESTLEIND.NS", "TATAMOTORS.NS", "BAJAJFINSV.NS", "POWERGRID.NS", "NTPC.NS",
    "M&M.NS", "ONGC.NS", "TECHM.NS", "TATASTEEL.NS", "ADANIPORTS.NS",
    "COALINDIA.NS", "HINDALCO.NS", "INDUSINDBK.NS", "DRREDDY.NS", "CIPLA.NS",
    "EICHERMOT.NS", "JSWSTEEL.NS", "GRASIM.NS", "BRITANNIA.NS", "APOLLOHOSP.NS",
    "DIVISLAB.NS", "BPCL.NS", "TATACONSUM.NS", "HEROMOTOCO.NS", "ADANIENT.NS",
    "UPL.NS", "BAJAJ-AUTO.NS", "SBILIFE.NS", "HDFCLIFE.NS", "LTIM.NS"
]

# Sector mapping for Nifty 50 stocks
STOCK_SECTORS = {
    # Banking & Financial Services
    "HDFCBANK.NS": "Banking", "ICICIBANK.NS": "Banking", "SBIN.NS": "Banking",
    "KOTAKBANK.NS": "Banking", "AXISBANK.NS": "Banking", "INDUSINDBK.NS": "Banking",
    "BAJFINANCE.NS": "Financial Services", "BAJAJFINSV.NS": "Financial Services",
    "SBILIFE.NS": "Financial Services", "HDFCLIFE.NS": "Financial Services",

    # IT & Technology
    "TCS.NS": "IT", "INFY.NS": "IT", "HCLTECH.NS": "IT",
    "WIPRO.NS": "IT", "TECHM.NS": "IT", "LTIM.NS": "IT",

    # Energy & Oil/Gas
    "RELIANCE.NS": "Energy", "ONGC.NS": "Oil & Gas", "BPCL.NS": "Oil & Gas",
    "POWERGRID.NS": "Power", "NTPC.NS": "Power", "COALINDIA.NS": "Mining",

    # Automobiles
    "MARUTI.NS": "Automobiles", "TATAMOTORS.NS": "Automobiles",
    "M&M.NS": "Automobiles", "EICHERMOT.NS": "Automobiles",
    "HEROMOTOCO.NS": "Automobiles", "BAJAJ-AUTO.NS": "Automobiles",

    # Metals & Mining
    "TATASTEEL.NS": "Metals", "JSWSTEEL.NS": "Metals",
    "HINDALCO.NS": "Metals", "COALINDIA.NS": "Mining",

    # Pharmaceuticals
    "SUNPHARMA.NS": "Pharma", "DRREDDY.NS": "Pharma",
    "CIPLA.NS": "Pharma", "DIVISLAB.NS": "Pharma", "APOLLOHOSP.NS": "Healthcare",

    # FMCG & Consumer
    "HINDUNILVR.NS": "FMCG", "ITC.NS": "FMCG", "NESTLEIND.NS": "FMCG",
    "BRITANNIA.NS": "FMCG", "TATACONSUM.NS": "FMCG",
    "TITAN.NS": "Consumer Goods", "ASIANPAINT.NS": "Consumer Goods",

    # Cement & Construction
    "ULTRACEMCO.NS": "Cement", "GRASIM.NS": "Cement",
    "LT.NS": "Construction", "ADANIPORTS.NS": "Infrastructure",

    # Telecom & Others
    "BHARTIARTL.NS": "Telecom",
    "UPL.NS": "Chemicals",
    "ADANIENT.NS": "Conglomerate"
}

def get_sector(ticker: str) -> str:
    """Get sector for a stock ticker"""
    return STOCK_SECTORS.get(ticker, "Other")

class StockCache:
    """Thread-safe cache for stock data"""

    def __init__(self):
        self.cache = {}
        self.lock = threading.Lock()

    def get(self, ticker: str) -> Dict:
        """Get cached data if fresh"""
        with self.lock:
            cache_file = CACHE_DIR / f"{ticker.replace('.', '_')}.json"

            # Check file cache
            if cache_file.exists():
                try:
                    with open(cache_file, 'r') as f:
                        data = json.load(f)

                    cached_time = datetime.fromisoformat(data['cached_at'])
                    if datetime.now() - cached_time < CACHE_DURATION:
                        return data['signals']
                except Exception as e:
                    print(f"Cache read error for {ticker}: {e}")

            return None

    def set(self, ticker: str, signals: Dict):
        """Save data to cache"""
        with self.lock:
            cache_file = CACHE_DIR / f"{ticker.replace('.', '_')}.json"

            try:
                cache_data = {
                    'ticker': ticker,
                    'cached_at': datetime.now().isoformat(),
                    'signals': signals
                }

                with open(cache_file, 'w') as f:
                    json.dump(cache_data, f)
            except Exception as e:
                print(f"Cache write error for {ticker}: {e}")

# Global cache instance
stock_cache = StockCache()

def get_stock_signals_cached(ticker: str) -> Dict:
    """
    Get stock signals with caching and rate limiting
    """
    # Check cache first
    cached_data = stock_cache.get(ticker)
    if cached_data:
        return cached_data

    # Fetch fresh data with rate limiting
    for attempt in range(MAX_RETRIES):
        try:
            # Rate limiting delay
            time.sleep(REQUEST_DELAY)

            # Analyze signals with enhancements
            signals = analyze_trading_signals(ticker)

            # Enhance signals (score capping, conflict detection, risk management)
            if 'error' not in signals:
                signals = enhance_trading_signals(signals)
                stock_cache.set(ticker, signals)

            return signals

        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                print(f"Retry {attempt + 1} for {ticker}: {e}")
                time.sleep(RETRY_DELAY)
            else:
                return {
                    "error": f"Failed after {MAX_RETRIES} attempts: {str(e)}",
                    "ticker": ticker
                }

def screen_nifty50(force_refresh: bool = False) -> Dict:
    """
    Screen all Nifty 50 stocks with intelligent caching

    Time estimate:
    - With cache: <1 second (instant)
    - Cold start: ~25-50 seconds (50 stocks × 0.5s delay)
    - Partial refresh: 5-15 seconds (only stale data)
    """
    start_time = time.time()
    results = []
    errors = []
    cache_hits = 0
    fresh_fetches = 0

    print(f"Starting Nifty 50 screening... (force_refresh={force_refresh})")

    for i, ticker in enumerate(NIFTY_50_STOCKS):
        # Check cache first if not forcing refresh
        if not force_refresh:
            cached = stock_cache.get(ticker)
            if cached:
                results.append(cached)
                cache_hits += 1
                continue

        # Fetch fresh data
        print(f"Fetching {ticker} ({i+1}/{len(NIFTY_50_STOCKS)})...")
        signals = get_stock_signals_cached(ticker)

        if 'error' in signals:
            errors.append(signals)
        else:
            results.append(signals)
            fresh_fetches += 1

    # Calculate statistics
    successful = [r for r in results if 'error' not in r]

    # Sort and categorize stocks
    categorized = categorize_stocks(successful)

    elapsed = time.time() - start_time

    return {
        "summary": {
            "total_stocks": len(NIFTY_50_STOCKS),
            "successful": len(successful),
            "errors": len(errors),
            "cache_hits": cache_hits,
            "fresh_fetches": fresh_fetches,
            "time_taken_seconds": round(elapsed, 2),
            "timestamp": datetime.now().isoformat()
        },
        "categories": categorized,
        "all_stocks": successful,
        "errors": errors
    }

def categorize_stocks(stocks: List[Dict]) -> Dict:
    """
    Categorize stocks by various criteria
    """
    # Best overall stocks (high overall score)
    best_stocks = sorted(
        stocks,
        key=lambda x: x.get('overall_signal', {}).get('score', 0),
        reverse=True
    )[:10]

    # Best for long-term (high fundamental score)
    best_longterm = sorted(
        stocks,
        key=lambda x: x.get('fundamental_analysis', {}).get('score', 0),
        reverse=True
    )[:10]

    # Best for intraday (high VWAP strategy score)
    best_intraday = sorted(
        [s for s in stocks if s.get('vwap_strategy', {}).get('score', 0) > 50],
        key=lambda x: x.get('vwap_strategy', {}).get('score', 0),
        reverse=True
    )[:10]

    # Best for swing (high technical + momentum)
    best_swing = sorted(
        stocks,
        key=lambda x: (
            x.get('technical_analysis', {}).get('score', 0) * 0.6 +
            x.get('timeframe_signals', {}).get('swing', {}).get('score', 0) * 0.4
        ),
        reverse=True
    )[:10]

    # Strong buy signals - FIXED: More realistic criteria
    # Look for high confidence + good scores, not just signal label
    strong_buy = sorted(
        [s for s in stocks if (
            # High overall score
            s.get('overall_signal', {}).get('score', 0) >= 60 and
            # High confidence (or at least medium)
            s.get('confidence_level', 'Low') in ['High', 'Medium'] and
            # Low conflict count (max 1)
            s.get('signal_conflicts', {}).get('conflict_count', 99) <= 1 and
            # Decent volume
            s.get('key_indicators', {}).get('volume_ratio', 0) >= 0.7 and
            # Either BUY signal OR high score with bullish timeframes
            (s.get('overall_signal', {}).get('signal') in ['STRONG BUY', 'BUY'] or
             (s.get('overall_signal', {}).get('score', 0) >= 65 and
              s.get('timeframe_signals', {}).get('long_term', {}).get('signal') == 'BUY'))
        )],
        key=lambda x: x.get('overall_signal', {}).get('score', 0),
        reverse=True
    )[:10]

    # Strong sell signals - FIXED: More realistic criteria
    strong_sell = sorted(
        [s for s in stocks if (
            # Low overall score
            s.get('overall_signal', {}).get('score', 0) <= 40 and
            # Either SELL signal OR low score with bearish timeframes
            (s.get('overall_signal', {}).get('signal') in ['STRONG SELL', 'SELL'] or
             (s.get('overall_signal', {}).get('score', 0) <= 35 and
              s.get('timeframe_signals', {}).get('long_term', {}).get('signal') == 'SELL'))
        )],
        key=lambda x: x.get('overall_signal', {}).get('score', 0)
    )[:10]

    # Top gainers (positive momentum)
    gainers = sorted(
        [s for s in stocks if s.get('key_indicators', {}).get('rsi', 50) > 50],
        key=lambda x: x.get('key_indicators', {}).get('rsi', 0),
        reverse=True
    )[:10]

    # Top losers (negative momentum)
    losers = sorted(
        [s for s in stocks if s.get('key_indicators', {}).get('rsi', 50) < 50],
        key=lambda x: x.get('key_indicators', {}).get('rsi', 0)
    )[:10]

    # Value picks (low P/E, high score)
    value_picks = sorted(
        [s for s in stocks if s.get('fundamental_analysis', {}).get('score', 0) > 60],
        key=lambda x: x.get('fundamental_analysis', {}).get('score', 0),
        reverse=True
    )[:10]

    # Sector analysis - Calculate average score per sector
    sector_performance = analyze_sector_performance(stocks)

    return {
        "best_overall": format_stock_list(best_stocks),
        "best_longterm": format_stock_list(best_longterm),
        "best_intraday": format_stock_list(best_intraday),
        "best_swing": format_stock_list(best_swing),
        "strong_buy": format_stock_list(strong_buy),
        "strong_sell": format_stock_list(strong_sell),
        "top_gainers": format_stock_list(gainers),
        "top_losers": format_stock_list(losers),
        "value_picks": format_stock_list(value_picks),
        "sector_analysis": sector_performance
    }

def analyze_sector_performance(stocks: List[Dict]) -> Dict:
    """
    Analyze performance by sector
    Shows which sectors are bullish/bearish
    """
    sector_data = {}

    for stock in stocks:
        ticker = stock.get('ticker')
        sector = get_sector(ticker)

        if sector not in sector_data:
            sector_data[sector] = {
                "stocks": [],
                "scores": [],
                "volumes": [],
                "sentiment": []
            }

        overall_score = stock.get('overall_signal', {}).get('score', 50)
        volume_ratio = stock.get('key_indicators', {}).get('volume_ratio', 1.0)

        sector_data[sector]["stocks"].append(ticker)
        sector_data[sector]["scores"].append(overall_score)
        sector_data[sector]["volumes"].append(volume_ratio)

    # Calculate sector metrics
    sector_summary = []

    for sector, data in sector_data.items():
        avg_score = sum(data["scores"]) / len(data["scores"])
        avg_volume = sum(data["volumes"]) / len(data["volumes"])
        stock_count = len(data["stocks"])

        # Determine sector trend
        if avg_score >= 60:
            trend = "BULLISH"
            emoji = "📈"
        elif avg_score >= 50:
            trend = "NEUTRAL"
            emoji = "➡️"
        else:
            trend = "BEARISH"
            emoji = "📉"

        # Volume strength
        if avg_volume >= 1.2:
            volume_strength = "HIGH"
        elif avg_volume >= 0.8:
            volume_strength = "MEDIUM"
        else:
            volume_strength = "LOW"

        sector_summary.append({
            "sector": sector,
            "trend": trend,
            "emoji": emoji,
            "avg_score": round(avg_score, 2),
            "avg_volume": round(avg_volume, 2),
            "volume_strength": volume_strength,
            "stock_count": stock_count,
            "stocks": data["stocks"]
        })

    # Sort by average score (best sectors first)
    sector_summary.sort(key=lambda x: x["avg_score"], reverse=True)

    return {
        "sectors": sector_summary,
        "bullish_sectors": [s for s in sector_summary if s["trend"] == "BULLISH"],
        "bearish_sectors": [s for s in sector_summary if s["trend"] == "BEARISH"],
        "top_sector": sector_summary[0] if sector_summary else None,
        "worst_sector": sector_summary[-1] if sector_summary else None
    }

def format_stock_list(stocks: List[Dict]) -> List[Dict]:
    """Format stock data for display with sector and enhanced info"""
    return [
        {
            "ticker": s.get('ticker'),
            "sector": get_sector(s.get('ticker')),
            "current_price": s.get('current_price'),
            "overall_signal": s.get('overall_signal', {}).get('signal'),
            "overall_score": s.get('overall_signal', {}).get('score'),
            "signal_strength": s.get('overall_signal', {}).get('strength', 'Unknown'),
            "confidence_level": s.get('confidence_level', 'Unknown'),
            "technical_score": s.get('technical_analysis', {}).get('score'),
            "fundamental_score": s.get('fundamental_analysis', {}).get('score'),
            "rsi": s.get('key_indicators', {}).get('rsi'),
            "macd_histogram": s.get('key_indicators', {}).get('macd_histogram'),
            "volume_ratio": s.get('key_indicators', {}).get('volume_ratio'),
            "intraday_signal": s.get('timeframe_signals', {}).get('intraday', {}).get('signal'),
            "swing_signal": s.get('timeframe_signals', {}).get('swing', {}).get('signal'),
            "longterm_signal": s.get('timeframe_signals', {}).get('long_term', {}).get('signal'),
            "vwap_score": s.get('vwap_strategy', {}).get('score'),
            "has_conflicts": s.get('signal_conflicts', {}).get('has_conflicts', False),
            "conflict_count": s.get('signal_conflicts', {}).get('conflict_count', 0),
            "risk_management": {
                "stop_loss": s.get('risk_management', {}).get('stop_loss'),
                "take_profit": s.get('risk_management', {}).get('take_profit'),
                "position_size_pct": s.get('risk_management', {}).get('position_size_pct', 0)
            },
            "trading_recommendation": s.get('trading_recommendation', {}).get('safety_level', 'Unknown'),
            "timestamp": s.get('timestamp')
        }
        for s in stocks
    ]

def get_stock_comparison(tickers: List[str]) -> Dict:
    """Compare multiple stocks side by side"""
    results = []

    for ticker in tickers:
        signals = get_stock_signals_cached(ticker)
        if 'error' not in signals:
            results.append(signals)

    return {
        "comparison": format_stock_list(results),
        "count": len(results)
    }

def clear_cache():
    """Clear all cached data"""
    try:
        for cache_file in CACHE_DIR.glob("*.json"):
            cache_file.unlink()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        return {"error": f"Failed to clear cache: {str(e)}"}
