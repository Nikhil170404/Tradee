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
