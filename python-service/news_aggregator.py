"""
News Aggregator
Combines Google News RSS (Free, Real-time) with Yahoo Finance (Fallback)
"""

import requests
import xml.etree.ElementTree as ET
from datetime import datetime
import yfinance as yf
from typing import List, Dict

def fetch_google_news_rss(ticker: str, limit: int = 10) -> List[Dict]:
    """Fetch news from Google News RSS"""
    try:
        # specific query format for better results
        # Clean ticker for Google search
        clean_ticker = ticker.replace('.NS', '').replace('.BO', '')
        query = f"{clean_ticker} stock news"
        url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        
        response = requests.get(url, timeout=10)
        # response.raise_for_status() # Don't raise, just fallback
        
        if response.status_code != 200:
            return []
            
        root = ET.fromstring(response.content)
        news_items = []
        
        for item in root.findall('.//item')[:limit]:
            title = item.find('title').text if item.find('title') is not None else ''
            link = item.find('link').text if item.find('link') is not None else ''
            pub_date_str = item.find('pubDate').text if item.find('pubDate') is not None else ''
            
            # Simple timestamp parsing or current time fallback
            try:
                # E.g., Mon, 08 Dec 2025 10:00:00 GMT
                dt = datetime.strptime(pub_date_str, '%a, %d %b %Y %H:%M:%S %Z')
                timestamp = int(dt.timestamp())
            except Exception:
                timestamp = int(datetime.now().timestamp())

            source = item.find('source').text if item.find('source') is not None else 'Google News'
            
            news_items.append({
                "title": title,
                "link": link,
                "publisher": source,
                "providerPublishTime": timestamp,
                "type": "RSS"
            })
            
        return news_items
    except Exception as e:
        print(f"Google News RSS Error: {e}")
        return []

def fetch_yfinance_news(ticker: str, limit: int = 5) -> List[Dict]:
    """Fetch news from Yahoo Finance (Fallback)"""
    try:
        stock = yf.Ticker(ticker)
        news = stock.news
        results = []
        if news:
            for item in news[:limit]:
                results.append({
                    "title": item.get('title', ''),
                    "link": item.get('link', ''),
                    "publisher": item.get('publisher', 'Yahoo Finance'),
                    "providerPublishTime": item.get('providerPublishTime', int(datetime.now().timestamp())),
                    "type": "YFinance"
                })
        return results
    except Exception as e:
        print(f"YFinance News Error: {e}")
        return []

def get_aggregated_news(ticker: str, limit: int = 10) -> List[Dict]:
    """Get news from multiple sources"""
    # Try Google News first
    news = fetch_google_news_rss(ticker, limit)
    
    # If not enough news, try Yahoo Finance
    if len(news) < 3:
        yf_news = fetch_yfinance_news(ticker, limit - len(news))
        news.extend(yf_news)
    
    # Deduplicate by title
    seen_titles = set()
    unique_news = []
    for item in news:
        if item['title'] not in seen_titles:
            unique_news.append(item)
            seen_titles.add(item['title'])
            
    return unique_news[:limit]

def fetch_top_market_news(limit: int = 15) -> List[Dict]:
    """
    Fetch top market news covering:
    1. Nifty 50 & Sensex
    2. Global Markets (impacting India)
    3. Economy & Trends
    """
    topics = [
        "Nifty 50 stock market news",
        "Sensex live news",
        "Indian economy news",
        "Global stock market news India impact"
    ]
    
    all_news = []
    for topic in topics:
        try:
            # Fetch 5 items per topic
            topic_news = fetch_google_news_rss(topic, limit=5)
            all_news.extend(topic_news)
        except Exception:
            continue
            
    # Deduplicate and sort by time
    seen_titles = set()
    unique_news = []
    
    # Sort by time descending (newest first)
    all_news.sort(key=lambda x: x.get('providerPublishTime', 0), reverse=True)
    
    for item in all_news:
        if item['title'] not in seen_titles:
            unique_news.append(item)
            seen_titles.add(item['title'])
            
    return unique_news[:limit]
