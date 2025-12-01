"""
FIXED: Sector-Aware Fundamental Scoring
Problem: Old code used banking sector thresholds for ALL stocks
Solution: Different thresholds for different sectors
"""

from typing import Dict, List


def get_stock_sector_from_ticker(ticker: str) -> str:
    """Determine stock sector from ticker using mapping"""
    # Use same mapping as stock_screener.py
    ticker_to_sector = {
        # Banking & Financial Services
        "HDFCBANK.NS": "Banking", "ICICIBANK.NS": "Banking", "SBIN.NS": "Banking",
        "KOTAKBANK.NS": "Banking", "AXISBANK.NS": "Banking", "INDUSINDBK.NS": "Banking",
        "BAJFINANCE.NS": "Banking", "BAJAJFINSV.NS": "Banking",
        "SBILIFE.NS": "Banking", "HDFCLIFE.NS": "Banking",

        # IT
        "TCS.NS": "IT", "INFY.NS": "IT", "HCLTECH.NS": "IT",
        "WIPRO.NS": "IT", "TECHM.NS": "IT", "LTIM.NS": "IT",

        # Automobiles
        "MARUTI.NS": "Automobile", "TATAMOTORS.NS": "Automobile",
        "M&M.NS": "Automobile", "EICHERMOT.NS": "Automobile",
        "HEROMOTOCO.NS": "Automobile", "BAJAJ-AUTO.NS": "Automobile",

        # Pharma
        "SUNPHARMA.NS": "Pharma", "DRREDDY.NS": "Pharma",
        "CIPLA.NS": "Pharma", "DIVISLAB.NS": "Pharma", "APOLLOHOSP.NS": "Pharma",

        # FMCG
        "HINDUNILVR.NS": "FMCG", "ITC.NS": "FMCG", "NESTLEIND.NS": "FMCG",
        "BRITANNIA.NS": "FMCG", "TATACONSUM.NS": "FMCG",
        "TITAN.NS": "FMCG", "ASIANPAINT.NS": "FMCG",

        # Metals
        "TATASTEEL.NS": "Metals", "JSWSTEEL.NS": "Metals",
        "HINDALCO.NS": "Metals", "COALINDIA.NS": "Metals",

        # Energy / Oil & Gas
        "RELIANCE.NS": "Energy", "ONGC.NS": "Energy", "BPCL.NS": "Energy",
        "POWERGRID.NS": "Energy", "NTPC.NS": "Energy",

        # Construction
        "ULTRACEMCO.NS": "Construction", "GRASIM.NS": "Construction",
        "LT.NS": "Construction", "ADANIPORTS.NS": "Construction",
        "BHARTIARTL.NS": "Construction",
        "UPL.NS": "Construction",
        "ADANIENT.NS": "Construction"
    }

    return ticker_to_sector.get(ticker, "General")


def get_stock_sector(info: Dict) -> str:
    """Determine stock sector from company info or ticker"""
    # PRIORITY 1: Use ticker symbol if available (most accurate)
    ticker = info.get('symbol', '')
    if ticker:
        sector = get_stock_sector_from_ticker(ticker)
        if sector != "General":
            return sector

    # PRIORITY 2: Fallback to parsing Yahoo Finance sector/industry
    sector = info.get('sector', '')
    industry = info.get('industry', '')

    # Map to broad categories
    if 'Bank' in sector or 'Financial' in sector:
        return 'Banking'
    elif 'Technology' in sector or 'IT' in industry or 'Software' in industry:
        return 'IT'
    elif 'Auto' in sector or 'Vehicle' in industry or 'Motor' in industry:
        return 'Automobile'
    elif 'Pharma' in sector or 'Healthcare' in sector or 'Drug' in industry:
        return 'Pharma'
    elif 'FMCG' in sector or 'Consumer' in sector:
        return 'FMCG'
    elif 'Metal' in sector or 'Steel' in industry or 'Aluminum' in industry:
        return 'Metals'
    elif 'Energy' in sector or 'Oil' in industry or 'Gas' in industry:
        return 'Energy'
    elif 'Cement' in industry or 'Construction' in sector:
        return 'Construction'
    else:
        return 'General'


def calculate_fundamental_score_sector_aware(info: Dict) -> Dict:
    """
    Calculate fundamental score with SECTOR-SPECIFIC thresholds

    Each sector has different normal ranges:
    - Banking: Low P/E (5-15), High margins (30%+)
    - IT: High P/E (20-35), High margins (15-25%)
    - Auto: Medium P/E (15-30), Medium margins (8-12%)
    - Pharma: High P/E (25-40), High margins (15-25%)
    - FMCG: High P/E (40-60), High margins (12-18%)
    """
    sector = get_stock_sector(info)
    signals = []

    # P/E Ratio - SECTOR SPECIFIC
    pe = info.get('trailingPE') or info.get('forwardPE')
    if pe:
        pe_score = score_pe_ratio(pe, sector)
        signals.append({"name": "P/E Ratio", "score": pe_score, "weight": 25})

    # P/B Ratio - SECTOR SPECIFIC
    pb = info.get('priceToBook')
    if pb:
        pb_score = score_pb_ratio(pb, sector)
        signals.append({"name": "P/B Ratio", "score": pb_score, "weight": 15})

    # ROE - UNIVERSAL (high is always good)
    roe = info.get('returnOnEquity')
    if roe:
        roe_percent = roe * 100
        if roe_percent > 18:
            roe_score = 100
        elif roe_percent > 15:
            roe_score = 75
        elif roe_percent > 12:
            roe_score = 50
        elif roe_percent > 8:
            roe_score = 25
        else:
            roe_score = 0
        signals.append({"name": "ROE", "score": roe_score, "weight": 20})

    # Debt/Equity - SECTOR SPECIFIC
    debt_to_equity = info.get('debtToEquity')
    if debt_to_equity is not None:
        debt_score = score_debt_to_equity(debt_to_equity, sector)
        signals.append({"name": "Debt/Equity", "score": debt_score, "weight": 20})

    # Profit Margin - SECTOR SPECIFIC
    profit_margin = info.get('profitMargins')
    if profit_margin:
        margin_percent = profit_margin * 100
        margin_score = score_profit_margin(margin_percent, sector)
        signals.append({"name": "Profit Margin", "score": margin_score, "weight": 20})

    if not signals:
        return {"score": 50, "signals": []}

    total_weight = sum(s['weight'] for s in signals)
    weighted_score = sum(s['score'] * s['weight'] for s in signals) / total_weight

    return {
        "score": round(weighted_score, 2),
        "signals": signals,
        "sector": sector  # Include sector for debugging
    }


def score_pe_ratio(pe: float, sector: str) -> int:
    """
    Score P/E ratio based on sector norms

    Sector Benchmarks (2025):
    - Banking: 5-15 (low multiples)
    - IT: 20-35 (high growth premium)
    - Auto: 15-30 (cyclical, moderate)
    - Pharma: 25-40 (growth + margins)
    - FMCG: 40-60 (defensive premium)
    - Metals: 8-20 (cyclical, low)
    - Energy: 10-25 (capital intensive)
    """
    if sector == 'Banking':
        if pe < 8:
            return 100  # Very cheap
        elif pe < 12:
            return 75   # Fair value
        elif pe < 18:
            return 50   # Moderate
        elif pe < 25:
            return 25   # Expensive
        else:
            return 0    # Very expensive

    elif sector == 'IT':
        if pe < 20:
            return 100  # Undervalued
        elif pe < 28:
            return 75   # Fair value
        elif pe < 35:
            return 50   # Moderate
        elif pe < 45:
            return 25   # Expensive
        else:
            return 0    # Bubble

    elif sector == 'Automobile':
        # MARUTI FIX: Auto sector avg P/E = 21.6
        if pe < 15:
            return 100  # Very cheap
        elif pe < 22:  # Around industry average
            return 75   # Fair value
        elif pe < 30:
            return 50   # Moderate (Maruti 25.94 gets ~40)
        elif pe < 40:
            return 25   # Expensive
        else:
            return 0    # Overvalued

    elif sector == 'Pharma':
        if pe < 20:
            return 100
        elif pe < 30:
            return 75
        elif pe < 40:
            return 50
        elif pe < 55:
            return 25
        else:
            return 0

    elif sector == 'FMCG':
        if pe < 35:
            return 100
        elif pe < 50:
            return 75
        elif pe < 65:
            return 50
        elif pe < 80:
            return 25
        else:
            return 0

    else:  # General / Metals / Energy
        if pe < 12:
            return 100
        elif pe < 20:
            return 75
        elif pe < 30:
            return 50
        elif pe < 40:
            return 25
        else:
            return 0


def score_pb_ratio(pb: float, sector: str) -> int:
    """Score P/B ratio (lower is better, except for asset-light sectors)"""
    if sector in ['Banking', 'Metals', 'Energy', 'Construction']:
        # Asset-heavy sectors: P/B matters more
        if pb < 0.8:
            return 100
        elif pb < 1.2:
            return 75
        elif pb < 2.0:
            return 50
        elif pb < 3.0:
            return 25
        else:
            return 0
    else:
        # Asset-light sectors (IT, FMCG, Pharma): P/B less relevant
        if pb < 3:
            return 100
        elif pb < 6:
            return 75
        elif pb < 10:
            return 50
        elif pb < 15:
            return 25
        else:
            return 0


def score_debt_to_equity(debt_to_equity: float, sector: str) -> int:
    """Score Debt/Equity ratio (sector-specific tolerance)"""
    if sector == 'Banking':
        # Banks have naturally high D/E due to deposits
        if debt_to_equity < 50:
            return 100
        elif debt_to_equity < 100:
            return 75
        elif debt_to_equity < 150:
            return 50
        else:
            return 25

    elif sector in ['Energy', 'Construction', 'Metals']:
        # Capital-intensive: moderate debt OK
        if debt_to_equity < 30:
            return 100
        elif debt_to_equity < 60:
            return 75
        elif debt_to_equity < 100:
            return 50
        elif debt_to_equity < 150:
            return 25
        else:
            return 0

    else:  # IT, Auto, Pharma, FMCG
        # Lower debt preferred
        if debt_to_equity < 10:  # Maruti 0.10 = 100 score!
            return 100
        elif debt_to_equity < 30:
            return 75
        elif debt_to_equity < 60:
            return 50
        elif debt_to_equity < 100:
            return 25
        else:
            return 0


def score_profit_margin(margin_percent: float, sector: str) -> int:
    """
    Score profit margin based on sector norms

    MARUTI FIX: Auto sector typical margin = 8-12%
    Margin 9.48% should score ~60/100, NOT 0/100
    """
    if sector == 'Banking':
        # Banking: High margins (30-50%)
        if margin_percent > 40:
            return 100
        elif margin_percent > 30:
            return 75
        elif margin_percent > 20:
            return 50
        elif margin_percent > 10:
            return 25
        else:
            return 0

    elif sector == 'IT':
        # IT: High margins (15-25%)
        if margin_percent > 20:
            return 100
        elif margin_percent > 15:
            return 75
        elif margin_percent > 10:
            return 50
        elif margin_percent > 5:
            return 25
        else:
            return 0

    elif sector == 'Automobile':
        # FIXED: Auto margins are LOWER (8-12% is good)
        if margin_percent > 12:
            return 100  # Exceptional
        elif margin_percent > 9:  # Maruti 9.48% = ~75 score
            return 75   # Good
        elif margin_percent > 6:
            return 50   # Fair
        elif margin_percent > 3:
            return 25   # Poor
        else:
            return 0    # Loss-making

    elif sector == 'Pharma':
        # Pharma: High margins (15-25%)
        if margin_percent > 20:
            return 100
        elif margin_percent > 15:
            return 75
        elif margin_percent > 10:
            return 50
        elif margin_percent > 5:
            return 25
        else:
            return 0

    elif sector == 'FMCG':
        # FMCG: Medium margins (12-18%)
        if margin_percent > 15:
            return 100
        elif margin_percent > 12:
            return 75
        elif margin_percent > 8:
            return 50
        elif margin_percent > 4:
            return 25
        else:
            return 0

    elif sector == 'Metals':
        # Metals: Low margins (5-10%)
        if margin_percent > 10:
            return 100
        elif margin_percent > 7:
            return 75
        elif margin_percent > 4:
            return 50
        elif margin_percent > 2:
            return 25
        else:
            return 0

    else:  # General / Energy / Construction
        if margin_percent > 15:
            return 100
        elif margin_percent > 10:
            return 75
        elif margin_percent > 5:
            return 50
        elif margin_percent > 2:
            return 25
        else:
            return 0
