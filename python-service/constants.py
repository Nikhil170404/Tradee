"""
ProTrader AI - Constants and Configuration
All magic numbers and configuration values should be defined here.
"""

# =============================================================================
# SIGNAL THRESHOLDS
# =============================================================================

# Overall signal thresholds (0-100 scale)
SIGNAL_THRESHOLDS = {
    "STRONG_BUY": 70,
    "BUY": 58,
    "NEUTRAL_HIGH": 58,
    "NEUTRAL_LOW": 42,
    "SELL": 30,
    "STRONG_SELL": 0,
}

# Confidence level thresholds
CONFIDENCE_THRESHOLDS = {
    "HIGH": 70,
    "MEDIUM": 50,
    "LOW": 0,
}

# =============================================================================
# TECHNICAL INDICATOR SETTINGS
# =============================================================================

# RSI (Relative Strength Index)
RSI = {
    "PERIOD": 14,
    "OVERSOLD": 30,
    "OVERBOUGHT": 70,
    "NEUTRAL_LOW": 40,
    "NEUTRAL_HIGH": 60,
}

# MACD (Moving Average Convergence Divergence)
MACD = {
    "FAST_PERIOD": 12,
    "SLOW_PERIOD": 26,
    "SIGNAL_PERIOD": 9,
}

# Moving Averages
MOVING_AVERAGES = {
    "SHORT": 20,
    "MEDIUM": 50,
    "LONG": 200,
}

# Bollinger Bands
BOLLINGER = {
    "PERIOD": 20,
    "STD_DEV": 2,
}

# ADX (Average Directional Index)
ADX = {
    "PERIOD": 14,
    "STRONG_TREND": 25,
    "VERY_STRONG_TREND": 50,
}

# ATR (Average True Range)
ATR = {
    "PERIOD": 14,
}

# VWAP
VWAP = {
    "STD_MULTIPLIER_1": 1,
    "STD_MULTIPLIER_2": 2,
}

# =============================================================================
# WEIGHT CONFIGURATIONS
# =============================================================================

# Overall score weights
SCORE_WEIGHTS = {
    "TECHNICAL": 0.50,
    "FUNDAMENTAL": 0.30,
    "SENTIMENT": 0.20,
}

# Technical indicator weights
TECHNICAL_WEIGHTS = {
    "RSI": 20,
    "MACD": 25,
    "BOLLINGER": 15,
    "MOVING_AVERAGES": 20,
    "VOLUME": 10,
    "MOMENTUM": 10,
}

# =============================================================================
# CACHE SETTINGS
# =============================================================================

CACHE = {
    "DURATION_MINUTES": 15,
    "MAX_ENTRIES": 100,
    "DIRECTORY": "cache",
}

# =============================================================================
# RATE LIMITING
# =============================================================================

RATE_LIMIT = {
    "REQUESTS_PER_MINUTE": 60,
    "REQUEST_DELAY_SECONDS": 0.5,
    "MAX_RETRIES": 3,
    "RETRY_DELAY_SECONDS": 5,
}

# =============================================================================
# BACKTESTING DEFAULTS
# =============================================================================

BACKTEST = {
    "DEFAULT_INITIAL_CAPITAL": 100000,
    "MIN_CAPITAL": 1000,
    "MAX_CAPITAL": 100000000,
    "DEFAULT_PERIOD_DAYS": 365,
}

# =============================================================================
# RISK MANAGEMENT
# =============================================================================

RISK = {
    "MAX_POSITION_SIZE_PERCENT": 10,
    "DEFAULT_STOP_LOSS_MULTIPLIER": 1.5,  # ATR multiplier
    "DEFAULT_TAKE_PROFIT_MULTIPLIER": 2.0,  # ATR multiplier
    "MAX_CONFLICTS_BEFORE_UNSAFE": 2,
}

# =============================================================================
# SECTOR CLASSIFICATIONS
# =============================================================================

SECTORS = [
    "Banking",
    "IT",
    "Automobile",
    "Pharma",
    "FMCG",
    "Metals",
    "Energy",
    "Construction",
    "General",
]

# =============================================================================
# NIFTY 50 STOCKS
# =============================================================================

NIFTY_50_STOCKS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
    "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "SUNPHARMA.NS",
    "BAJFINANCE.NS", "TITAN.NS", "ULTRACEMCO.NS", "NTPC.NS", "ONGC.NS",
    "TATAMOTORS.NS", "POWERGRID.NS", "M&M.NS", "NESTLEIND.NS", "TATASTEEL.NS",
    "WIPRO.NS", "HCLTECH.NS", "COALINDIA.NS", "ADANIENT.NS", "ADANIPORTS.NS",
    "BAJAJFINSV.NS", "JSWSTEEL.NS", "DRREDDY.NS", "GRASIM.NS", "INDUSINDBK.NS",
    "BPCL.NS", "DIVISLAB.NS", "CIPLA.NS", "BRITANNIA.NS", "EICHERMOT.NS",
    "TECHM.NS", "HEROMOTOCO.NS", "TATACONSUM.NS", "BAJAJ-AUTO.NS", "UPL.NS",
    "APOLLOHOSP.NS", "SBILIFE.NS", "HDFCLIFE.NS", "LTIM.NS", "HINDALCO.NS"
]

# =============================================================================
# API ENDPOINTS (for documentation)
# =============================================================================

API_ENDPOINTS = [
    "/health",
    "/indicators/{ticker}",
    "/sentiment/text",
    "/sentiment/news",
    "/sentiment/news/general",
    "/quote/{ticker}",
    "/chart/{ticker}",
    "/fundamentals/{ticker}",
    "/signals/{ticker}",
    "/screener/nifty50",
    "/backtest",
]
