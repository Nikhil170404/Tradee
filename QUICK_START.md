# ProTrader AI - Quick Start Guide

## 🚨 IMPORTANT: DISK SPACE WARNING

Your C: drive is **95% full** (only 13GB free). You MUST free up space before proceeding!

## Step 1: Free Up Disk Space (CRITICAL!)

```bash
# Clean npm cache (already done)
npm cache clean --force

# Check disk space
df -h
```

**You need at least 2-3GB free space. Do this:**
1. Empty your **Recycle Bin**
2. Delete files from `C:\Users\Prashant\AppData\Local\Temp`
3. Run **Windows Disk Cleanup** (search in Windows)
4. Check your **Downloads** folder
5. Delete old files you don't need

## Step 2: Install Dependencies

Once you have freed up space:

```bash
cd "c:\Users\Prashant\OneDrive\Desktop\New folder\protrader-ai"
npm install
```

This will take 5-10 minutes and download ~500MB.

## Step 3: Get Free API Keys

### 1. Supabase (Database - Required)
- Go to: https://supabase.com
- Create free account
- Click "New Project"
- Copy your URL and anon key from Settings > API

### 2. Upstash Redis (Caching - Required)
- Go to: https://upstash.com
- Create free account
- Click "Create Database"
- Select "Redis"
- Copy REST URL and Token

### 3. News API (Optional for now)
- Go to: https://newsapi.org
- Sign up for free tier (100 requests/day)
- Get API key

### 4. Alpha Vantage (Optional for now)
- Go to: https://www.alphavantage.co
- Get free API key (500 calls/day)

## Step 4: Configure Environment

```bash
# Copy example file
copy .env.local.example .env.local

# Edit with Notepad
notepad .env.local
```

Fill in your API keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
NEWS_API_KEY=your_news_api_key (optional)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key (optional)
PYTHON_SERVICE_URL=http://localhost:8000
```

## Step 5: Run the App

```bash
npm run dev
```

Then open: **http://localhost:3000**

## What You Can Do Now

✅ **Working Features:**
- View market indices (NIFTY, SENSEX, S&P500, NASDAQ, DOW)
- Search for any stock (try AAPL, TSLA, MSFT)
- View real-time quotes (15min delay)
- Modern dark mode dashboard

🚧 **Coming Next (need to add code):**
- Stock detail page with charts
- Technical indicators (RSI, MACD, SMA)
- Sentiment analysis
- Daily AI stock picker
- Stock screener
- Portfolio tracker

## Project Structure

```
protrader-ai/
├── app/
│   ├── (dashboard)/
│   │   └── page.tsx          ✅ Main dashboard (working!)
│   ├── api/
│   │   └── market/
│   │       ├── quote/        ✅ Get stock quotes
│   │       ├── chart/        ✅ Get chart data
│   │       ├── indices/      ✅ Get market indices
│   │       └── search/       ✅ Search stocks
│   ├── layout.tsx            ✅ Root layout
│   └── globals.css           ✅ Styles
├── components/
│   ├── ui/                   ✅ Button, Card, Input
│   ├── charts/               ⏳ Empty (add TradingView)
│   ├── dashboard/            ⏳ Empty (add components)
│   └── stock/                ⏳ Empty (add stock page)
├── lib/
│   ├── api/
│   │   └── yahoo.ts          ✅ Yahoo Finance API
│   ├── db/
│   │   ├── supabase.ts       ✅ Database client
│   │   └── redis.ts          ✅ Cache client
│   └── utils.ts              ✅ Helper functions
└── package.json              ✅ All dependencies listed
```

## Testing the App

1. **View Dashboard**: http://localhost:3000
2. **Check Market Indices**: Should see NIFTY, SENSEX, etc.
3. **Search Stock**: Type "AAPL" and hit search
4. **Test API**: 
   - http://localhost:3000/api/market/indices
   - http://localhost:3000/api/market/quote?ticker=AAPL

## Troubleshooting

### npm install fails with "ENOSPC"
- **Cause**: Not enough disk space
- **Fix**: Free up more space (see Step 1)

### "Module not found" errors
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API returns errors
- Check `.env.local` is configured correctly
- Verify API keys are valid
- Check internet connection
- Yahoo Finance API works without keys!

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

## Next Steps

Once basic app is running, you can add:

1. **Stock Detail Page** - Show full stock analysis
2. **Charts** - TradingView Lightweight Charts
3. **Technical Indicators** - RSI, MACD, Bollinger Bands
4. **Python Service** - Advanced calculations

See `PROJECT_STATUS.md` for detailed roadmap.

## Getting Help

- Read: `README.md` - Full documentation
- Read: `PROJECT_STATUS.md` - What's done/todo
- Read: `INSTALL_INSTRUCTIONS.txt` - Detailed setup

## Important Files

- `package.json` - All dependencies
- `.env.local.example` - Environment variables template
- `tailwind.config.ts` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration

## Free Tier Limits

- **Yahoo Finance**: Unlimited, 15min delay
- **Supabase**: 500MB database, 2GB bandwidth/month
- **Upstash**: 10,000 commands/day
- **News API**: 100 requests/day
- **Alpha Vantage**: 500 calls/day

More than enough for personal use!

## Have Fun!

You're building a professional-grade trading platform for FREE! 

Next session we can add:
- Beautiful TradingView charts
- AI stock picker algorithm
- Sentiment analysis
- Whatever you want!

Happy trading! 📈🚀
