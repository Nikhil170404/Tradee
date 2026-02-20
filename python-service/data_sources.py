"""
Data Sources Module
Handles fallback logic between yfinance and Alpha Vantage
"""

import yfinance as yf
import requests
from typing import Dict, Optional, List
import pandas as pd
import os
from datetime import datetime

class DataSource:
    def __init__(self):
        self.alpha_vantage_key = os.getenv("ALPHA_VANTAGE_KEY", "DEMO") # Free tier key
        
    def get_stock_data(self, ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
        """
        Get stock data with fallback mechanism
        1. Try yfinance
        2. Fallback to Alpha Vantage (Free tier)
        """
        try:
            # 1. Try yfinance
            stock = yf.Ticker(ticker)
            df = stock.history(period=period, interval=interval)
            
            if not df.empty:
                return df
                
            raise Exception("yfinance returned empty data")
            
        except Exception as e:
            print(f"yfinance failed for {ticker}: {str(e)}")
            return self._fetch_alpha_vantage(ticker, period)

    def _fetch_alpha_vantage(self, ticker: str, period: str) -> pd.DataFrame:
        """Fetch from Alpha Vantage Free API"""
        print(f"Falling back to Alpha Vantage for {ticker}")
        
        # Clean ticker for AV (remove .NS etc if needed, though AV supports some)
        av_ticker = ticker.replace('.NS', '') # AV mostly US, but supports BSE/NSE with prefix
        
        # Mapping period to function
        function = "TIME_SERIES_DAILY"
        
        url = f"https://www.alphavantage.co/query?function={function}&symbol={av_ticker}&apikey={self.alpha_vantage_key}&outputsize=full&datatype=json"
        
        try:
            response = requests.get(url)
            data = response.json()
            
            if "Time Series (Daily)" not in data:
                print(f"Alpha Vantage error: {data.get('Note', 'Unknown error')}")
                return pd.DataFrame()
            
            # Parse response
            ts_data = data["Time Series (Daily)"]
            df = pd.DataFrame.from_dict(ts_data, orient='index')
            
            # Rename columns to match yfinance
            df = df.rename(columns={
                "1. open": "Open",
                "2. high": "High",
                "3. low": "Low",
                "4. close": "Close",
                "5. volume": "Volume"
            })
            
            # Convert types
            for col in df.columns:
                df[col] = pd.to_numeric(df[col])
                
            # Parse index
            df.index = pd.to_datetime(df.index)
            df = df.sort_index()
            
            # Filter by period (approximate)
            if period == "1y":
                start_date = pd.Timestamp.now() - pd.DateOffset(years=1)
                df = df[df.index >= start_date]
            
            return df
            
        except Exception as e:
            print(f"Alpha Vantage failed: {str(e)}")
            return pd.DataFrame()

data_source = DataSource()
