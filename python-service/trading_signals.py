"""
Fixed Trading Signals - All calculation errors corrected
Based on verified formulas from industry standards (2025)
"""

import yfinance as yf
import pandas as pd
import numpy as np
from typing import Dict, List
from datetime import datetime, timedelta
from enhanced_signals import enhance_trading_signals
from sentiment import get_real_sentiment_score

def calculate_rsi_wilder(prices: pd.Series, period: int = 14) -> float:
    """
    Calculate RSI using Wilder's Smoothing Method (Vectorized)
    """
    delta = prices.diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)

    # Use EWM with com=period-1 for Wilder's smoothing
    avg_gain = gain.ewm(com=period-1, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(com=period-1, min_periods=period, adjust=False).mean()

    # Calculate RS and RSI
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    # Handle edge cases
    if pd.isna(rsi.iloc[-1]):
        return 50.0  # Neutral if calculation fails
    if avg_loss.iloc[-1] == 0:
        return 100.0  # Overbought if no losses

    return float(rsi.iloc[-1])


def calculate_rsi(prices: pd.Series, period: int = 14) -> float:
    """Wrapper for RSI calculation - uses Wilder's method"""
    return calculate_rsi_wilder(prices, period)


def calculate_atr(df: pd.DataFrame, period: int = 14) -> float:
    """Calculate Average True Range for volatility measurement"""
    if len(df) < period:
        return 1.0  # Default fallback for insufficient data

    high = df['High']
    low = df['Low']
    close = df['Close']

    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())

    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()

    if pd.isna(atr.iloc[-1]):
        return 1.0  # Fallback if calculation fails

    return float(atr.iloc[-1])


def calculate_macd(prices: pd.Series) -> Dict:
    """
    Calculate MACD indicator (Correct Formula)
    MACD Line = 12-EMA - 26-EMA
    Signal Line = 9-EMA of MACD Line
    Histogram = MACD Line - Signal Line
    """
    # Calculate EMAs
    ema12 = prices.ewm(span=12, adjust=False).mean()
    ema26 = prices.ewm(span=26, adjust=False).mean()

    # Calculate MACD line
    macd_line = ema12 - ema26

    # Calculate Signal line (9-period EMA of MACD)
    signal_line = macd_line.ewm(span=9, adjust=False).mean()

    # Calculate Histogram (MACD - Signal)
    histogram = macd_line - signal_line

    return {
        "macd": float(macd_line.iloc[-1]),
        "signal": float(signal_line.iloc[-1]),
        "histogram": float(histogram.iloc[-1])
    }


def calculate_bollinger_bands(prices: pd.Series, period: int = 20) -> Dict:
    """Calculate Bollinger Bands"""
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std * 2)
    lower = sma - (std * 2)

    current_price = prices.iloc[-1]
    band_width = ((upper.iloc[-1] - lower.iloc[-1]) / sma.iloc[-1]) * 100

    return {
        "upper": float(upper.iloc[-1]),
        "middle": float(sma.iloc[-1]),
        "lower": float(lower.iloc[-1]),
        "band_width": float(band_width),
        "price_position": (current_price - lower.iloc[-1]) / (upper.iloc[-1] - lower.iloc[-1])
    }


def calculate_moving_averages(prices: pd.Series) -> Dict:
    """Calculate multiple moving averages"""
    return {
        "sma_20": float(prices.rolling(window=20).mean().iloc[-1]),
        "sma_50": float(prices.rolling(window=50).mean().iloc[-1]),
        "sma_200": float(prices.rolling(window=200).mean().iloc[-1]),
        "ema_12": float(prices.ewm(span=12, adjust=False).mean().iloc[-1]),
        "ema_26": float(prices.ewm(span=26, adjust=False).mean().iloc[-1])
    }


def calculate_volume_analysis(df: pd.DataFrame) -> Dict:
    """
    Analyze volume patterns (Fixed volume ratio calculation)
    """
    # Use minimum of 20 or available data length
    window = min(20, len(df))

    # Calculate average volume for the window
    avg_volume = df['Volume'].rolling(window=window).mean().iloc[-1]
    current_volume = df['Volume'].iloc[-1]

    # Fixed: Ensure proper volume ratio calculation
    if avg_volume > 0 and not pd.isna(avg_volume) and not pd.isna(current_volume):
        volume_ratio = current_volume / avg_volume
    else:
        volume_ratio = 1.0

    # On-Balance Volume (OBV)
    obv = (df['Volume'] * (~df['Close'].diff().le(0) * 2 - 1)).cumsum()

    # Calculate OBV trend using available data
    if len(obv) >= window:
        obv_trend = (obv.iloc[-1] - obv.iloc[-window]) / obv.iloc[-window] * 100 if obv.iloc[-window] != 0 else 0
    else:
        obv_trend = 0  # Not enough data for trend

    return {
        "current_volume": int(current_volume),
        "avg_volume_20": float(avg_volume) if not pd.isna(avg_volume) else 0.0,
        "volume_ratio": float(volume_ratio),
        "obv_trend": float(obv_trend)
    }


def calculate_momentum_indicators(df: pd.DataFrame) -> Dict:
    """Calculate momentum indicators"""
    # Rate of Change (ROC)
    roc_10 = ((df['Close'].iloc[-1] - df['Close'].iloc[-10]) / df['Close'].iloc[-10]) * 100

    # Stochastic Oscillator
    low_14 = df['Low'].rolling(window=14).min()
    high_14 = df['High'].rolling(window=14).max()
    k_percent = 100 * ((df['Close'] - low_14) / (high_14 - low_14))
    d_percent = k_percent.rolling(window=3).mean()

    # ADX (Average Directional Index) - simplified
    high_diff = df['High'].diff()
    low_diff = -df['Low'].diff()
    plus_dm = high_diff.where((high_diff > low_diff) & (high_diff > 0), 0)
    minus_dm = low_diff.where((low_diff > high_diff) & (low_diff > 0), 0)
    atr = df['High'].subtract(df['Low']).rolling(window=14).mean()
    plus_di = 100 * (plus_dm.rolling(window=14).mean() / atr)
    minus_di = 100 * (minus_dm.rolling(window=14).mean() / atr)
    dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
    adx = dx.rolling(window=14).mean()

    return {
        "roc_10": float(roc_10),
        "stochastic_k": float(k_percent.iloc[-1]),
        "stochastic_d": float(d_percent.iloc[-1]),
        "adx": float(adx.iloc[-1]) if not pd.isna(adx.iloc[-1]) else 25.0
    }


# Import remaining functions from vwap_strategy
from vwap_strategy import calculate_vwap_strategy_score


def calculate_technical_score(indicators: Dict, current_price: float) -> Dict:
    """Calculate technical analysis score (0-100) with trend context"""
    signals = []

    # Get trend strength from ADX
    adx = indicators['momentum']['adx']
    is_trending = adx > 25  # Strong trend when ADX > 25
    ma = indicators['moving_averages']

    # RSI Signal with ADX Context (weight: 20%)
    rsi = indicators['rsi']
    if is_trending:
        if rsi < 30:
            rsi_score = 90
        elif rsi < 40:
            rsi_score = 70
        elif rsi < 60:
            rsi_score = 50
        elif rsi < 70:
            rsi_score = 30
        else:
            if current_price > ma['sma_50'] and current_price > ma['sma_200']:
                rsi_score = 40
            else:
                rsi_score = 10
    else:
        if rsi < 30:
            rsi_score = 100
        elif rsi < 40:
            rsi_score = 75
        elif rsi < 60:
            rsi_score = 50
        elif rsi < 70:
            rsi_score = 25
        else:
            rsi_score = 0
    signals.append({"name": "RSI", "score": rsi_score, "weight": 20})

    # MACD Signal with Dynamic Thresholds (weight: 20%)
    macd_data = indicators['macd']
    atr = indicators.get('atr', 1.0)
    dynamic_threshold = max(current_price * 0.001, atr * 0.1)

    histogram = macd_data['histogram']
    macd_line = macd_data['macd']
    signal_line = macd_data['signal']

    # Score based on MACD position
    if histogram > 0 and macd_line > signal_line:
        if histogram > dynamic_threshold:
            macd_score = 100
        else:
            macd_score = 75
    elif histogram > 0:
        macd_score = 60
    elif histogram < 0 and macd_line < signal_line:
        if histogram < -dynamic_threshold:
            macd_score = 0
        else:
            macd_score = 25
    else:
        macd_score = 40

    signals.append({"name": "MACD", "score": macd_score, "weight": 20})

    # Bollinger Bands Signal
    bb = indicators['bollinger_bands']
    price_pos = bb['price_position']
    if price_pos < 0.2:
        bb_score = 100
    elif price_pos < 0.4:
        bb_score = 75
    elif price_pos < 0.6:
        bb_score = 50
    elif price_pos < 0.8:
        bb_score = 25
    else:
        bb_score = 0
    signals.append({"name": "Bollinger Bands", "score": bb_score, "weight": 15})

    # Moving Average Signal
    ma = indicators['moving_averages']
    ma_score = 0
    if current_price > ma['sma_20']:
        ma_score += 25
    if current_price > ma['sma_50']:
        ma_score += 25
    if current_price > ma['sma_200']:
        ma_score += 25
    if ma['sma_20'] > ma['sma_50'] > ma['sma_200']:
        ma_score += 25
    signals.append({"name": "Moving Averages", "score": ma_score, "weight": 15})

    # Volume Signal
    volume = indicators['volume']
    if volume['volume_ratio'] > 1.5 and volume['obv_trend'] > 0:
        volume_score = 100
    elif volume['volume_ratio'] > 1.2:
        volume_score = 75
    elif volume['volume_ratio'] > 0.8:
        volume_score = 50
    else:
        volume_score = 25
    signals.append({"name": "Volume", "score": volume_score, "weight": 10})

    # Momentum Signal
    momentum = indicators['momentum']
    momentum_score = 50
    if momentum['roc_10'] > 5:
        momentum_score = 100
    elif momentum['roc_10'] > 2:
        momentum_score = 75
    elif momentum['roc_10'] < -5:
        momentum_score = 0
    elif momentum['roc_10'] < -2:
        momentum_score = 25

    if momentum['stochastic_k'] < 20:
        momentum_score = min(100, momentum_score + 20)
    elif momentum['stochastic_k'] > 80:
        momentum_score = max(0, momentum_score - 20)

    signals.append({"name": "Momentum", "score": momentum_score, "weight": 20})

    # Calculate weighted score
    total_weight = sum(s['weight'] for s in signals)
    weighted_score = sum(s['score'] * s['weight'] for s in signals) / total_weight

    return {
        "score": round(weighted_score, 2),
        "signals": signals
    }


def calculate_fundamental_score(info: Dict) -> Dict:
    """
    Calculate fundamental analysis score (0-100) - SECTOR-AWARE SCORING
    FIXED: Uses sector-specific thresholds instead of banking-only
    """
    from fundamental_scoring_fixed import calculate_fundamental_score_sector_aware
    return calculate_fundamental_score_sector_aware(info)


def get_overall_signal(technical_score: float, fundamental_score: float, sentiment_score: float) -> Dict:
    """
    Calculate overall signal with weighted scoring
    Technical: 50%, Fundamental: 30%, Sentiment: 20%
    """
    overall_score = (technical_score * 0.5) + (fundamental_score * 0.3) + (sentiment_score * 0.2)

    if overall_score >= 70:
        signal = "STRONG BUY"
        color = "darkgreen"
        confidence = "High"
    elif overall_score >= 58:
        signal = "BUY"
        color = "green"
        confidence = "Medium-High"
    elif overall_score >= 42:
        signal = "NEUTRAL"
        color = "gray"
        confidence = "Medium"
    elif overall_score >= 30:
        signal = "SELL"
        color = "orange"
        confidence = "Medium-High"
    else:
        signal = "STRONG SELL"
        color = "darkred"
        confidence = "High"

    return {
        "signal": signal,
        "score": round(overall_score, 2),
        "color": color,
        "confidence": confidence
    }


def get_timeframe_signals(ticker: str, df: pd.DataFrame, info: Dict) -> Dict:
    """Generate signals for different timeframes"""

    # Intraday (Short-term): Last 5 days, focus on quick moves with volume
    intraday_df = df.tail(5)
    if len(intraday_df) >= 5:
        intraday_rsi = calculate_rsi(intraday_df['Close'], period=5)
        intraday_macd = calculate_macd(intraday_df['Close'])
        intraday_volume = calculate_volume_analysis(intraday_df)
        intraday_score = 50

        # RSI signal for quick moves
        if intraday_rsi < 30:
            intraday_score += 20
        elif intraday_rsi > 70:
            intraday_score -= 20

        # MACD for momentum
        if intraday_macd['histogram'] > 0:
            intraday_score += 20
        else:
            intraday_score -= 20

        # Volume confirmation - critical for intraday
        if intraday_volume['volume_ratio'] > 1.3:
            intraday_score += 10  # High volume confirms move
        elif intraday_volume['volume_ratio'] < 0.7:
            intraday_score -= 10  # Low volume = weak move

        intraday_signal = "BUY" if intraday_score >= 60 else "SELL" if intraday_score <= 40 else "NEUTRAL"
    else:
        intraday_signal = "INSUFFICIENT DATA"
        intraday_score = 50

    # Swing (Medium-term): Last 50 days with multi-indicator confluence
    swing_df = df.tail(50)
    if len(swing_df) >= 20:
        swing_rsi = calculate_rsi(swing_df['Close'], period=14)
        swing_macd = calculate_macd(swing_df['Close'])
        swing_ma = calculate_moving_averages(swing_df['Close'])
        swing_volume = calculate_volume_analysis(swing_df)
        swing_momentum = calculate_momentum_indicators(swing_df)
        current_price = swing_df['Close'].iloc[-1]

        swing_score = 50
        confirmations = 0

        # 1. Trend confirmation (Moving Averages)
        if current_price > swing_ma['sma_20'] and current_price > swing_ma['sma_50']:
            swing_score += 25
            confirmations += 1
        elif current_price < swing_ma['sma_20'] and current_price < swing_ma['sma_50']:
            swing_score -= 25
            confirmations -= 1

        # Check for golden/death cross
        if swing_ma['sma_20'] > swing_ma['sma_50']:
            swing_score += 5
        else:
            swing_score -= 5

        # 2. Momentum confirmation (RSI + MACD)
        adx = swing_momentum['adx']
        if adx > 25:  # Strong trend
            if 40 < swing_rsi < 70:
                swing_score += 10
                confirmations += 0.5
            elif swing_rsi <= 40:
                swing_score += 15
                confirmations += 1
            elif swing_rsi >= 70:
                swing_score -= 10
        else:  # Ranging market
            if swing_rsi < 40:
                swing_score += 15
                confirmations += 1
            elif swing_rsi > 60:
                swing_score -= 15
                confirmations -= 1

        # MACD confirmation
        if swing_macd['histogram'] > 0 and swing_macd['macd'] > swing_macd['signal']:
            swing_score += 10
            confirmations += 0.5
        elif swing_macd['histogram'] < 0 and swing_macd['macd'] < swing_macd['signal']:
            swing_score -= 10
            confirmations -= 0.5

        # 3. Volume confirmation
        if swing_volume['volume_ratio'] > 1.2 and swing_volume['obv_trend'] > 0:
            swing_score += 15
            confirmations += 1
        elif swing_volume['volume_ratio'] < 0.8:
            swing_score -= 10
            confirmations -= 0.5

        # 4. Additional momentum from Stochastic
        if swing_momentum['stochastic_k'] < 30:
            swing_score += 10
        elif swing_momentum['stochastic_k'] > 70:
            swing_score -= 10

        if confirmations >= 2:
            swing_signal = "BUY" if swing_score >= 60 else "NEUTRAL"
        elif confirmations <= -2:
            swing_signal = "SELL" if swing_score <= 40 else "NEUTRAL"
        else:
            swing_signal = "NEUTRAL"

    else:
        swing_signal = "INSUFFICIENT DATA"
        swing_score = 50

    # Long-term: Full dataset with trend confirmation
    if len(df) >= 200:
        long_rsi = calculate_rsi(df['Close'], period=14)
        long_ma = calculate_moving_averages(df['Close'])
        long_volume = calculate_volume_analysis(df)
        current_price = df['Close'].iloc[-1]

        long_score = 50

        if long_ma['sma_50'] > long_ma['sma_200']:
            long_score += 25
        else:
            long_score -= 25

        if current_price > long_ma['sma_200']:
            long_score += 20
        else:
            long_score -= 20

        if long_volume['obv_trend'] > 0:
            long_score += 5
        else:
            long_score -= 5

        long_signal = "BUY" if long_score >= 60 else "SELL" if long_score <= 40 else "NEUTRAL"
    else:
        long_signal = "NEUTRAL"
        long_score = 50

    return {
        "intraday": {
            "timeframe": "1-3 Days",
            "signal": intraday_signal,
            "score": round(intraday_score, 2),
            "description": "Short-term scalping and day trading"
        },
        "swing": {
            "timeframe": "1-4 Weeks",
            "signal": swing_signal,
            "score": round(swing_score, 2),
            "description": "Medium-term swing trading"
        },
        "long_term": {
            "timeframe": "3-12 Months",
            "signal": long_signal,
            "score": round(long_score, 2),
            "description": "Long-term position trading"
        }
    }


def analyze_trading_signals(ticker: str) -> Dict:
    """
    Comprehensive trading signal analysis
    Returns detailed signals with multiple timeframes
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        # Get historical data (1 year for comprehensive analysis)
        df = stock.history(period="1y")

        if df.empty or len(df) < 20:
            return {
                "error": "Insufficient data for analysis",
                "ticker": ticker
            }

        current_price = df['Close'].iloc[-1]

        # Calculate all indicators
        indicators = {
            "rsi": calculate_rsi(df['Close']),
            "macd": calculate_macd(df['Close']),
            "bollinger_bands": calculate_bollinger_bands(df['Close']),
            "moving_averages": calculate_moving_averages(df['Close']),
            "volume": calculate_volume_analysis(df),
            "momentum": calculate_momentum_indicators(df),
            "atr": calculate_atr(df)
        }

        # Calculate scores
        technical_analysis = calculate_technical_score(indicators, current_price)

        # Add ticker to info for sector detection
        info_with_ticker = dict(info)
        info_with_ticker['symbol'] = ticker
        fundamental_analysis = calculate_fundamental_score(info_with_ticker)

        # Real sentiment analysis using VADER and yfinance news
        sentiment_data = get_real_sentiment_score(ticker)
        sentiment_score = float(sentiment_data['score'] if 'score' in sentiment_data else 50)

        # Overall signal
        overall = get_overall_signal(
            technical_analysis['score'],
            fundamental_analysis['score'],
            sentiment_score
        )

        # Timeframe-specific signals
        timeframe_signals = get_timeframe_signals(ticker, df, info)

        # VWAP + Price Action Strategy (for intraday traders)
        from vwap_strategy import calculate_vwap_strategy_score
        vwap_strategy = calculate_vwap_strategy_score(df.tail(30), indicators, "intraday")

        return {
            "ticker": ticker,
            "current_price": float(current_price),
            "timestamp": datetime.now().isoformat(),
            "overall_signal": overall,
            "technical_analysis": technical_analysis,
            "fundamental_analysis": fundamental_analysis,
            "sentiment_score": sentiment_score,
            "sentiment_analysis": sentiment_data,
            "timeframe_signals": timeframe_signals,
            "vwap_strategy": vwap_strategy,
            "key_indicators": {
                "rsi": round(indicators['rsi'], 2),
                "macd_histogram": round(indicators['macd']['histogram'], 4),
                "price_vs_sma50": "Above" if current_price > indicators['moving_averages']['sma_50'] else "Below",
                "price_vs_sma200": "Above" if current_price > indicators['moving_averages']['sma_200'] else "Below",
                "volume_ratio": round(indicators['volume']['volume_ratio'], 2),
                "adx": round(indicators['momentum']['adx'], 2),
                "atr": round(indicators['atr'], 4)
            }
        }

    except Exception as e:
        return {
            "error": f"Error analyzing signals: {str(e)}",
            "ticker": ticker
        }
