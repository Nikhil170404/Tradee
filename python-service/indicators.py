"""
Technical Indicators using TA-Lib
"""

import pandas as pd
import numpy as np
try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False
    print("Warning: TA-Lib not available. Using fallback calculations.")

def calculate_rsi(df: pd.DataFrame, period: int = 14) -> float:
    """Calculate RSI"""
    if TALIB_AVAILABLE:
        rsi = talib.RSI(df['Close'], timeperiod=period)
        return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None
    else:
        # Fallback implementation
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None

def calculate_macd(df: pd.DataFrame):
    """Calculate MACD"""
    if TALIB_AVAILABLE:
        macd, signal, hist = talib.MACD(df['Close'], fastperiod=12, slowperiod=26, signalperiod=9)
        return {
            "macd": float(macd.iloc[-1]) if not pd.isna(macd.iloc[-1]) else None,
            "signal": float(signal.iloc[-1]) if not pd.isna(signal.iloc[-1]) else None,
            "histogram": float(hist.iloc[-1]) if not pd.isna(hist.iloc[-1]) else None
        }
    else:
        # Fallback implementation
        exp1 = df['Close'].ewm(span=12, adjust=False).mean()
        exp2 = df['Close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        hist = macd - signal
        return {
            "macd": float(macd.iloc[-1]) if not pd.isna(macd.iloc[-1]) else None,
            "signal": float(signal.iloc[-1]) if not pd.isna(signal.iloc[-1]) else None,
            "histogram": float(hist.iloc[-1]) if not pd.isna(hist.iloc[-1]) else None
        }

def calculate_sma(df: pd.DataFrame, period: int) -> float:
    """Calculate Simple Moving Average"""
    if TALIB_AVAILABLE:
        sma = talib.SMA(df['Close'], timeperiod=period)
        return float(sma.iloc[-1]) if not pd.isna(sma.iloc[-1]) else None
    else:
        sma = df['Close'].rolling(window=period).mean()
        return float(sma.iloc[-1]) if not pd.isna(sma.iloc[-1]) else None

def calculate_ema(df: pd.DataFrame, period: int) -> float:
    """Calculate Exponential Moving Average"""
    if TALIB_AVAILABLE:
        ema = talib.EMA(df['Close'], timeperiod=period)
        return float(ema.iloc[-1]) if not pd.isna(ema.iloc[-1]) else None
    else:
        ema = df['Close'].ewm(span=period, adjust=False).mean()
        return float(ema.iloc[-1]) if not pd.isna(ema.iloc[-1]) else None

def calculate_bollinger_bands(df: pd.DataFrame, period: int = 20, std_dev: int = 2):
    """Calculate Bollinger Bands"""
    if TALIB_AVAILABLE:
        upper, middle, lower = talib.BBANDS(df['Close'], timeperiod=period, nbdevup=std_dev, nbdevdn=std_dev)
        return {
            "upper": float(upper.iloc[-1]) if not pd.isna(upper.iloc[-1]) else None,
            "middle": float(middle.iloc[-1]) if not pd.isna(middle.iloc[-1]) else None,
            "lower": float(lower.iloc[-1]) if not pd.isna(lower.iloc[-1]) else None
        }
    else:
        middle = df['Close'].rolling(window=period).mean()
        std = df['Close'].rolling(window=period).std()
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        return {
            "upper": float(upper.iloc[-1]) if not pd.isna(upper.iloc[-1]) else None,
            "middle": float(middle.iloc[-1]) if not pd.isna(middle.iloc[-1]) else None,
            "lower": float(lower.iloc[-1]) if not pd.isna(lower.iloc[-1]) else None
        }

def calculate_stochastic(df: pd.DataFrame, period: int = 14):
    """Calculate Stochastic Oscillator"""
    if TALIB_AVAILABLE:
        slowk, slowd = talib.STOCH(df['High'], df['Low'], df['Close'],
                                    fastk_period=period, slowk_period=3, slowd_period=3)
        return {
            "k": float(slowk.iloc[-1]) if not pd.isna(slowk.iloc[-1]) else None,
            "d": float(slowd.iloc[-1]) if not pd.isna(slowd.iloc[-1]) else None
        }
    else:
        low_min = df['Low'].rolling(window=period).min()
        high_max = df['High'].rolling(window=period).max()
        k = 100 * ((df['Close'] - low_min) / (high_max - low_min))
        d = k.rolling(window=3).mean()
        return {
            "k": float(k.iloc[-1]) if not pd.isna(k.iloc[-1]) else None,
            "d": float(d.iloc[-1]) if not pd.isna(d.iloc[-1]) else None
        }

def calculate_atr(df: pd.DataFrame, period: int = 14) -> float:
    """Calculate Average True Range"""
    if TALIB_AVAILABLE:
        atr = talib.ATR(df['High'], df['Low'], df['Close'], timeperiod=period)
        return float(atr.iloc[-1]) if not pd.isna(atr.iloc[-1]) else None
    else:
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = tr.rolling(window=period).mean()
        return float(atr.iloc[-1]) if not pd.isna(atr.iloc[-1]) else None

def generate_signals(df: pd.DataFrame, indicators: dict) -> dict:
    """Generate buy/sell signals based on indicators"""
    signals = {
        "rsi": "neutral",
        "macd": "neutral",
        "sma": "neutral",
        "overall": "neutral"
    }

    # RSI Signal
    if indicators["rsi"] is not None:
        if indicators["rsi"] < 30:
            signals["rsi"] = "buy"
        elif indicators["rsi"] > 70:
            signals["rsi"] = "sell"

    # MACD Signal
    if indicators["macd"] and indicators["macd"]["histogram"] is not None:
        if indicators["macd"]["histogram"] > 0:
            signals["macd"] = "buy"
        elif indicators["macd"]["histogram"] < 0:
            signals["macd"] = "sell"

    # SMA Signal (Price vs SMA50)
    current_price = float(df['Close'].iloc[-1])
    if indicators["sma50"] is not None:
        if current_price > indicators["sma50"]:
            signals["sma"] = "buy"
        elif current_price < indicators["sma50"]:
            signals["sma"] = "sell"

    # Overall signal (majority vote)
    buy_count = sum(1 for s in [signals["rsi"], signals["macd"], signals["sma"]] if s == "buy")
    sell_count = sum(1 for s in [signals["rsi"], signals["macd"], signals["sma"]] if s == "sell")

    if buy_count >= 2:
        signals["overall"] = "buy"
    elif sell_count >= 2:
        signals["overall"] = "sell"

    return signals

def calculate_all_indicators(df: pd.DataFrame) -> dict:
    """Calculate all indicators and generate signals"""
    indicators = {
        "rsi": calculate_rsi(df),
        "macd": calculate_macd(df),
        "sma20": calculate_sma(df, 20),
        "sma50": calculate_sma(df, 50),
        "sma200": calculate_sma(df, 200),
        "ema12": calculate_ema(df, 12),
        "ema26": calculate_ema(df, 26),
        "bollinger_bands": calculate_bollinger_bands(df),
        "stochastic": calculate_stochastic(df),
        "atr": calculate_atr(df)
    }

    # Generate signals
    signals = generate_signals(df, indicators)
    indicators["signals"] = signals

    return indicators
