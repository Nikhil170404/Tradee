import { ChartData } from '../api/yahoo';

export interface TechnicalIndicators {
  rsi: number | null;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  signals: {
    rsi: 'buy' | 'sell' | 'neutral';
    macd: 'buy' | 'sell' | 'neutral';
    sma: 'buy' | 'sell' | 'neutral';
    overall: 'buy' | 'sell' | 'neutral';
  };
}

// Calculate RSI (Relative Strength Index)
export function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate subsequent values using smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      avgGain = (avgGain * (period - 1) + difference) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - difference) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
}

// Calculate SMA (Simple Moving Average)
export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;

  const slice = prices.slice(-period);
  const sum = slice.reduce((acc, price) => acc + price, 0);
  return sum / period;
}

// Calculate EMA (Exponential Moving Average)
export function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// Calculate MACD (Moving Average Convergence Divergence)
export function calculateMACD(prices: number[]): {
  macd: number;
  signal: number;
  histogram: number;
} | null {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  if (!ema12 || !ema26) return null;

  const macd = ema12 - ema26;

  // Calculate signal line (9-day EMA of MACD)
  const macdHistory = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    if (e12 && e26) {
      macdHistory.push(e12 - e26);
    }
  }

  const signal = calculateEMA(macdHistory, 9) || 0;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number; middle: number; lower: number } | null {
  const sma = calculateSMA(prices, period);
  if (!sma) return null;

  const slice = prices.slice(-period);
  const squaredDiffs = slice.map((price) => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
  const standardDeviation = Math.sqrt(variance);

  return {
    upper: sma + standardDeviation * stdDev,
    middle: sma,
    lower: sma - standardDeviation * stdDev,
  };
}

// Get all technical indicators for a stock
export function calculateAllIndicators(chartData: ChartData[]): TechnicalIndicators {
  const closePrices = chartData.map((d) => d.close).filter((p) => p !== null);

  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  const sma20 = calculateSMA(closePrices, 20);
  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);
  const bollingerBands = calculateBollingerBands(closePrices);

  // Generate signals
  const currentPrice = closePrices[closePrices.length - 1];

  // RSI Signal
  let rsiSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (rsi !== null) {
    if (rsi < 30) rsiSignal = 'buy';
    else if (rsi > 70) rsiSignal = 'sell';
  }

  // MACD Signal
  let macdSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (macd) {
    if (macd.histogram > 0 && macd.macd > macd.signal) macdSignal = 'buy';
    else if (macd.histogram < 0 && macd.macd < macd.signal) macdSignal = 'sell';
  }

  // SMA Signal (Golden/Death Cross)
  let smaSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (sma20 && sma50) {
    if (currentPrice > sma20 && sma20 > sma50) smaSignal = 'buy';
    else if (currentPrice < sma20 && sma20 < sma50) smaSignal = 'sell';
  }

  // Overall signal (majority)
  const signals = [rsiSignal, macdSignal, smaSignal];
  const buyCount = signals.filter((s) => s === 'buy').length;
  const sellCount = signals.filter((s) => s === 'sell').length;

  let overallSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (buyCount >= 2) overallSignal = 'buy';
  else if (sellCount >= 2) overallSignal = 'sell';

  return {
    rsi,
    macd,
    sma20,
    sma50,
    sma200,
    bollingerBands,
    signals: {
      rsi: rsiSignal,
      macd: macdSignal,
      sma: smaSignal,
      overall: overallSignal,
    },
  };
}

// Calculate indicator series for charting
export function calculateIndicatorSeries(chartData: ChartData[]) {
  const closePrices = chartData.map((d) => d.close);

  return chartData.map((point, index) => {
    const priceSlice = closePrices.slice(0, index + 1);

    return {
      timestamp: point.timestamp,
      sma20: calculateSMA(priceSlice, 20),
      sma50: calculateSMA(priceSlice, 50),
      sma200: calculateSMA(priceSlice, 200),
      rsi: calculateRSI(priceSlice),
    };
  });
}
