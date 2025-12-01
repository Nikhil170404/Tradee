import axios from 'axios';

const YAHOO_FINANCE_API = 'https://query2.finance.yahoo.com/v7/finance';
const YAHOO_FINANCE_API_V7 = 'https://query2.finance.yahoo.com/v7/finance';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
}

export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FundamentalData {
  ticker: string;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  debtToEquity: number | null;
  revenue: number | null;
  eps: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
  bookValue: number | null;
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_API}/quote`, {
      params: {
        symbols: ticker,
      },
    });

    const data = response.data.quoteResponse.result[0];

    return {
      symbol: data.symbol,
      name: data.longName || data.shortName,
      price: data.regularMarketPrice,
      change: data.regularMarketChange,
      changePercent: data.regularMarketChangePercent,
      volume: data.regularMarketVolume,
      marketCap: data.marketCap,
      open: data.regularMarketOpen,
      high: data.regularMarketDayHigh,
      low: data.regularMarketDayLow,
      previousClose: data.regularMarketPreviousClose,
      fiftyDayAvg: data.fiftyDayAverage,
      twoHundredDayAvg: data.twoHundredDayAverage,
    };
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    throw new Error('Failed to fetch stock quote');
  }
}

export async function getChartData(
  ticker: string,
  period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' = '1y',
  interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' = '1d'
): Promise<ChartData[]> {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_API}/chart/${ticker}`, {
      params: {
        range: period,
        interval: interval,
      },
    });

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    return timestamps.map((timestamp: number, index: number) => ({
      timestamp: timestamp * 1000,
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index],
    }));
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw new Error('Failed to fetch chart data');
  }
}

export async function getFundamentalData(ticker: string): Promise<FundamentalData> {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_API}/quote`, {
      params: {
        symbols: ticker,
      },
    });

    const data = response.data.quoteResponse.result[0];

    return {
      ticker: data.symbol,
      pe: data.trailingPE || null,
      pb: data.priceToBook || null,
      roe: data.returnOnEquity || null,
      debtToEquity: data.debtToEquity || null,
      revenue: data.totalRevenue || null,
      eps: data.epsTrailingTwelveMonths || null,
      dividendYield: data.dividendYield || null,
      profitMargin: data.profitMargins || null,
      bookValue: data.bookValue || null,
    };
  } catch (error) {
    console.error('Error fetching fundamental data:', error);
    throw new Error('Failed to fetch fundamental data');
  }
}

export async function searchStocks(query: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v1/finance/search`,
      {
        params: {
          q: query,
          quotesCount: 10,
          newsCount: 0,
        },
      }
    );

    return response.data.quotes.map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname,
      type: quote.quoteType,
      exchange: quote.exchange,
    }));
  } catch (error) {
    console.error('Error searching stocks:', error);
    throw new Error('Failed to search stocks');
  }
}

export async function getMarketIndices(): Promise<any[]> {
  const indices = ['^GSPC', '^DJI', '^IXIC', '^NSEI', '^BSESN'];

  try {
    const promises = indices.map(ticker => getStockQuote(ticker));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error fetching market indices:', error);
    throw new Error('Failed to fetch market indices');
  }
}
