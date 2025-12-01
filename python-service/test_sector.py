"""Test sector detection in the same way the API does"""
import yfinance as yf
from fundamental_scoring_fixed import calculate_fundamental_score_sector_aware

# Get Maruti data
ticker = "MARUTI.NS"
stock = yf.Ticker(ticker)
info = stock.info

# Add ticker to info (same as trading_signals.py line 593-595)
info_with_ticker = dict(info)
info_with_ticker['symbol'] = ticker

print(f"Ticker: {ticker}")
print(f"Symbol in info_with_ticker: {info_with_ticker.get('symbol')}")
print(f"Yahoo Finance sector: {info.get('sector', 'N/A')}")
print(f"Yahoo Finance industry: {info.get('industry', 'N/A')}")
print()

# Call the scoring function
result = calculate_fundamental_score_sector_aware(info_with_ticker)

print(f"Detected Sector: {result.get('sector')}")
print(f"Fundamental Score: {result.get('score')}")
print("\nSignals:")
for signal in result.get('signals', []):
    print(f"  {signal['name']}: {signal['score']}/100")
