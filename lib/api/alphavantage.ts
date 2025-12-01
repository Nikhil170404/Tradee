/**
 * Alpha Vantage API Integration
 * Provides reliable stock data as fallback to Yahoo Finance
 */

import axios from 'axios';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'PTOK1W7EDEVVZU6G';
const BASE_URL = 'https://www.alphavantage.co/query';

export interface AlphaVantageQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  marketCap?: number;
}

export interface AlphaVantageTimeSeries {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Get real-time quote for a stock
 */
export async function getQuote(symbol: string): Promise<AlphaVantageQuote> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: API_KEY,
      },
      timeout: 10000,
    });

    const quote = response.data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      throw new Error('No data returned from Alpha Vantage');
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

    return {
      symbol: quote['01. symbol'],
      name: quote['01. symbol'], // Alpha Vantage doesn't provide company name in quote
      price: price,
      change: change,
      changePercent: changePercent,
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      volume: parseInt(quote['06. volume']),
      previousClose: parseFloat(quote['08. previous close']),
    };
  } catch (error) {
    console.error('Alpha Vantage API Error:', error);
    throw error;
  }
}

/**
 * Get historical daily time series data
 */
export async function getDailyTimeSeries(
  symbol: string,
  outputSize: 'compact' | 'full' = 'compact'
): Promise<AlphaVantageTimeSeries[]> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        outputsize: outputSize, // compact = 100 days, full = 20+ years
        apikey: API_KEY,
      },
      timeout: 15000,
    });

    const timeSeries = response.data['Time Series (Daily)'];

    if (!timeSeries) {
      throw new Error('No time series data returned from Alpha Vantage');
    }

    const data: AlphaVantageTimeSeries[] = [];

    for (const [date, values] of Object.entries(timeSeries)) {
      data.push({
        date: date,
        open: parseFloat((values as any)['1. open']),
        high: parseFloat((values as any)['2. high']),
        low: parseFloat((values as any)['3. low']),
        close: parseFloat((values as any)['4. close']),
        volume: parseInt((values as any)['5. volume']),
      });
    }

    // Sort by date ascending
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Alpha Vantage Time Series Error:', error);
    throw error;
  }
}

/**
 * Get intraday time series data (for shorter timeframes)
 */
export async function getIntradayTimeSeries(
  symbol: string,
  interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min'
): Promise<AlphaVantageTimeSeries[]> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'TIME_SERIES_INTRADAY',
        symbol: symbol,
        interval: interval,
        apikey: API_KEY,
      },
      timeout: 15000,
    });

    const key = `Time Series (${interval})`;
    const timeSeries = response.data[key];

    if (!timeSeries) {
      throw new Error('No intraday data returned from Alpha Vantage');
    }

    const data: AlphaVantageTimeSeries[] = [];

    for (const [date, values] of Object.entries(timeSeries)) {
      data.push({
        date: date,
        open: parseFloat((values as any)['1. open']),
        high: parseFloat((values as any)['2. high']),
        low: parseFloat((values as any)['3. low']),
        close: parseFloat((values as any)['4. close']),
        volume: parseInt((values as any)['5. volume']),
      });
    }

    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Alpha Vantage Intraday Error:', error);
    throw error;
  }
}

/**
 * Get company overview (fundamental data)
 */
export async function getCompanyOverview(symbol: string): Promise<any> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: API_KEY,
      },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error('Alpha Vantage Overview Error:', error);
    throw error;
  }
}

/**
 * Search for stock symbols
 */
export async function searchSymbols(keywords: string): Promise<any[]> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: 'SYMBOL_SEARCH',
        keywords: keywords,
        apikey: API_KEY,
      },
      timeout: 10000,
    });

    return response.data.bestMatches || [];
  } catch (error) {
    console.error('Alpha Vantage Search Error:', error);
    return [];
  }
}
