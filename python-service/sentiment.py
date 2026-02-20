"""
Sentiment Analysis using VADER
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import List, Dict

# Initialize VADER
vader_analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment_vader(text: str) -> Dict[str, float]:
    """Analyze sentiment using VADER"""
    scores = vader_analyzer.polarity_scores(text)
    return {
        "positive": scores['pos'],
        "negative": scores['neg'],
        "neutral": scores['neu'],
        "compound": scores['compound']
    }

def categorize_sentiment(compound_score: float) -> Dict[str, str]:
    """Categorize sentiment score into labels"""
    if compound_score >= 0.5:
        return {"label": "Very Bullish", "color": "darkgreen"}
    elif compound_score >= 0.2:
        return {"label": "Bullish", "color": "green"}
    elif compound_score >= 0.05:
        return {"label": "Slightly Bullish", "color": "lightgreen"}
    elif compound_score <= -0.5:
        return {"label": "Very Bearish", "color": "darkred"}
    elif compound_score <= -0.2:
        return {"label": "Bearish", "color": "red"}
    elif compound_score <= -0.05:
        return {"label": "Slightly Bearish", "color": "orange"}
    else:
        return {"label": "Neutral", "color": "gray"}

def analyze_news_sentiment(news_items: List[Dict[str, str]]) -> Dict:
    """Analyze sentiment of multiple news articles"""
    sentiments = []
    for item in news_items:
        text = f"{item.get('title', '')} {item.get('description', '')}"
        sentiment = analyze_sentiment_vader(text)
        sentiments.append({
            "title": item.get('title', '')[:50],
            "sentiment": sentiment
        })
    
    if sentiments:
        avg_compound = sum(s["sentiment"]["compound"] for s in sentiments) / len(sentiments)
        category = categorize_sentiment(avg_compound)
        return {
            "average_compound": avg_compound,
            "label": category["label"],
            "color": category["color"],
            "article_count": len(sentiments),
            "articles": sentiments
        }
    return {
        "average_compound": 0,
        "label": "No Data",
        "color": "gray",
        "article_count": 0,
        "articles": []
    }

def get_market_sentiment_indicator(sentiment_score: float) -> str:
    """Convert sentiment score to market indicator"""
    if sentiment_score > 0.5:
        return "Extremely Bullish"
    elif sentiment_score > 0.2:
        return "Bullish"
    elif sentiment_score > 0.05:
        return "Slightly Bullish"
    elif sentiment_score < -0.5:
        return "Extremely Bearish"
    elif sentiment_score < -0.2:
        return "Bearish"
    elif sentiment_score < -0.05:
        return "Slightly Bearish"
    else:
        return "Neutral"

def batch_analyze_sentiment(texts: List[str]) -> List[Dict]:
    """Analyze sentiment for multiple texts efficiently"""
    results = []
    for text in texts:
        sentiment = analyze_sentiment_vader(text)
        category = categorize_sentiment(sentiment["compound"])
        results.append({
            "text": text[:100] + "..." if len(text) > 100 else text,
            "sentiment": sentiment,
            "label": category["label"],
            "color": category["color"]
        })
    return results


def get_real_sentiment_score(ticker: str) -> Dict:
    """
    Get REAL sentiment score for a stock ticker using yfinance news + VADER
    Returns score 0-100 (not hardcoded 50!)
    """
    import yfinance as yf
    from news_aggregator import get_aggregated_news
    
    try:
        # Use our new robust aggregator
        news = get_aggregated_news(ticker)
        
        if not news or len(news) == 0:
            # No news found - return neutral with note
            return {
                "score": 50,
                "compound": 0,
                "label": "Neutral",
                "color": "gray",
                "article_count": 0,
                "note": "No recent news found"
            }
        
        # Analyze each news article
        sentiments = []
        analyzed_news = []
        for article in news[:10]:  # Limit to 10 most recent
            title = article.get('title', '')
            # Some articles have 'summary' or 'description'
            summary = article.get('summary', '') or article.get('description', '')
            text = f"{title} {summary}"
            
            if text.strip():
                sentiment = analyze_sentiment_vader(text)
                sentiments.append(sentiment['compound'])
                
                # Add to analyzed news list
                item_category = categorize_sentiment(sentiment['compound'])
                analyzed_news.append({
                    "title": title,
                    "link": article.get('link', '#'),
                    "publisher": article.get('publisher', 'Yahoo Finance'),
                    "providerPublishTime": article.get('providerPublishTime', 0),
                    "sentiment": item_category['label'],
                    "sentiment_score": sentiment['compound']
                })
        
        if not sentiments:
            return {
                "score": 50,
                "compound": 0,
                "label": "Neutral",
                "color": "gray",
                "article_count": 0,
                "note": "No analyzable news content"
            }
        
        # Calculate average sentiment
        avg_compound = sum(sentiments) / len(sentiments)
        
        # Convert compound (-1 to 1) to score (0 to 100)
        # -1 = 0, 0 = 50, 1 = 100
        score = int((avg_compound + 1) * 50)
        score = max(0, min(100, score))  # Clamp to 0-100
        
        category = categorize_sentiment(avg_compound)
        
        return {
            "score": score,
            "compound": round(avg_compound, 4),
            "label": category["label"],
            "color": category["color"],
            "article_count": len(sentiments),
            "news": analyzed_news,
            "note": f"Analyzed {len(sentiments)} recent articles"
        }
        
    except Exception as e:
        # On error, return neutral with error note
        return {
            "score": 50,
            "compound": 0,
            "label": "Neutral",
            "color": "gray",
            "article_count": 0,
            "error": str(e)
        }
