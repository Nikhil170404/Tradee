-- ProTrader AI - Production Database Schema
-- Real-time alerts, portfolio tracking, user preferences
-- Run this in Supabase SQL editor to create tables

-- ============================================
-- USERS & PREFERENCES
-- ============================================

-- User alert preferences
CREATE TABLE IF NOT EXISTS public.alert_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users(id)

    -- Alert types enabled
    entry_signals_enabled BOOLEAN DEFAULT true,
    exit_signals_enabled BOOLEAN DEFAULT true,
    stop_loss_alerts_enabled BOOLEAN DEFAULT true,
    take_profit_alerts_enabled BOOLEAN DEFAULT true,

    -- Notification channels
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,

    -- Frequency control (prevent spam)
    max_alerts_per_day INTEGER DEFAULT 20,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',

    -- Filter preferences
    min_confidence TEXT DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH
    min_overall_score INTEGER DEFAULT 60,
    timeframes TEXT[] DEFAULT ARRAY['SWING', 'LONG_TERM'], -- INTRADAY | SWING | LONG_TERM

    -- Contact info
    email TEXT,
    phone TEXT,
    webhook_url TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WATCHLIST & PORTFOLIO
-- ============================================

-- User watchlists (existing table, enhanced)
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    ticker TEXT NOT NULL,
    name TEXT,
    notes TEXT,
    alert_on_signal BOOLEAN DEFAULT true, -- Alert when signal changes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_ticker ON public.watchlists(ticker);

-- User portfolios (holdings)
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    ticker TEXT NOT NULL,

    -- Entry details
    entry_date DATE NOT NULL,
    entry_price NUMERIC(10, 2) NOT NULL,
    shares NUMERIC(12, 4) NOT NULL,

    -- Risk management
    stop_loss NUMERIC(10, 2),
    take_profit NUMERIC(10, 2),
    trailing_stop_pct NUMERIC(5, 2) DEFAULT 10.0,
    trailing_stop_enabled BOOLEAN DEFAULT false,
    highest_price_since_entry NUMERIC(10, 2),

    -- Current status
    is_active BOOLEAN DEFAULT true,
    exit_date DATE,
    exit_price NUMERIC(10, 2),
    exit_reason TEXT, -- TAKE_PROFIT | STOP_LOSS | TRAILING_STOP | MANUAL | SIGNAL

    -- P&L
    profit_loss_amount NUMERIC(12, 2),
    profit_loss_pct NUMERIC(8, 2),

    -- Metadata
    notes TEXT,
    strategy_used TEXT, -- Which strategy generated this trade
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_ticker ON public.portfolios(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolios_active ON public.portfolios(is_active) WHERE is_active = true;

-- ============================================
-- ALERTS & NOTIFICATIONS
-- ============================================

-- Trading alerts history
CREATE TABLE IF NOT EXISTS public.trading_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    ticker TEXT NOT NULL,

    -- Alert type
    alert_type TEXT NOT NULL, -- ENTRY | EXIT | STOP_LOSS | TAKE_PROFIT | TRAILING_STOP | SIGNAL_CHANGE
    signal TEXT NOT NULL, -- BUY | SELL | NEUTRAL

    -- Price & levels
    current_price NUMERIC(10, 2) NOT NULL,
    entry_price NUMERIC(10, 2),
    stop_loss NUMERIC(10, 2),
    take_profit NUMERIC(10, 2),

    -- Signal details
    overall_score INTEGER,
    technical_score INTEGER,
    fundamental_score INTEGER,
    sentiment_score INTEGER,
    confidence_level TEXT, -- LOW | MEDIUM | HIGH
    timeframe TEXT, -- INTRADAY | SWING | LONG_TERM

    -- Risk metrics
    position_size_pct NUMERIC(5, 2),
    risk_reward_ratio NUMERIC(5, 2),

    -- Alert metadata
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | CRITICAL
    is_read BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Delivery status
    email_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,

    -- Related portfolio holding (if exiting position)
    portfolio_id UUID REFERENCES public.portfolios(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.trading_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_ticker ON public.trading_alerts(ticker);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.trading_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON public.trading_alerts(user_id, is_read) WHERE is_read = false;

-- Price alerts (user-defined triggers)
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    ticker TEXT NOT NULL,

    -- Alert condition
    condition TEXT NOT NULL, -- ABOVE | BELOW | CROSSES_ABOVE | CROSSES_BELOW
    target_price NUMERIC(10, 2) NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP WITH TIME ZONE,
    triggered_price NUMERIC(10, 2),

    -- Notification preferences
    notify_email BOOLEAN DEFAULT true,
    notify_push BOOLEAN DEFAULT false,
    notify_sms BOOLEAN DEFAULT false,

    -- Auto-disable after trigger
    one_time BOOLEAN DEFAULT true,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_ticker ON public.price_alerts(ticker);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON public.price_alerts(is_active) WHERE is_active = true;

-- ============================================
-- BACKTEST RESULTS
-- ============================================

-- Store backtest results for each stock/strategy
CREATE TABLE IF NOT EXISTS public.backtest_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- NULL = public/default backtest
    ticker TEXT NOT NULL,

    -- Strategy details
    strategy_name TEXT NOT NULL,
    strategy_config JSONB, -- Store full config

    -- Timeframe
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Performance metrics
    total_return_pct NUMERIC(8, 2),
    cagr_pct NUMERIC(8, 2),
    sharpe_ratio NUMERIC(8, 3),
    sortino_ratio NUMERIC(8, 3),
    max_drawdown_pct NUMERIC(8, 2),

    -- Trade stats
    total_trades INTEGER,
    win_rate_pct NUMERIC(5, 2),
    profit_factor NUMERIC(8, 2),
    avg_trade_duration_days NUMERIC(8, 1),

    -- Statistical significance
    is_significant BOOLEAN,
    confidence_level TEXT,

    -- Full results (JSON)
    full_results JSONB, -- Store entire backtest result

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backtest_ticker ON public.backtest_results(ticker);
CREATE INDEX IF NOT EXISTS idx_backtest_user_id ON public.backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_created_at ON public.backtest_results(created_at DESC);

-- ============================================
-- SIGNAL HISTORY (Track signal changes)
-- ============================================

-- Track when signals change for trending/pattern analysis
CREATE TABLE IF NOT EXISTS public.signal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker TEXT NOT NULL,

    -- Signal values
    overall_signal TEXT NOT NULL,
    overall_score INTEGER,
    confidence_level TEXT,

    -- Breakdown
    technical_score INTEGER,
    fundamental_score INTEGER,
    sentiment_score INTEGER,

    -- Timeframe signals
    intraday_signal TEXT,
    swing_signal TEXT,
    longterm_signal TEXT,

    -- Key indicators
    rsi NUMERIC(6, 2),
    macd_histogram NUMERIC(10, 4),
    current_price NUMERIC(10, 2),

    -- Change detection
    signal_changed BOOLEAN DEFAULT false,
    previous_signal TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signal_history_ticker ON public.signal_history(ticker);
CREATE INDEX IF NOT EXISTS idx_signal_history_created_at ON public.signal_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_history_ticker_date ON public.signal_history(ticker, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own alert preferences" ON public.alert_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alert preferences" ON public.alert_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own watchlists" ON public.watchlists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlists" ON public.watchlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own portfolio" ON public.portfolios
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own portfolio" ON public.portfolios
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts" ON public.trading_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own price alerts" ON public.price_alerts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own price alerts" ON public.price_alerts
    FOR ALL USING (auth.uid() = user_id);

-- Public read access for backtest results and signal history
CREATE POLICY "Anyone can view backtest results" ON public.backtest_results
    FOR SELECT USING (true);
CREATE POLICY "Anyone can view signal history" ON public.signal_history
    FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_alert_preferences_updated_at BEFORE UPDATE ON public.alert_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON public.price_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate current P&L for active positions
CREATE OR REPLACE FUNCTION calculate_position_pnl(
    p_entry_price NUMERIC,
    p_shares NUMERIC,
    p_current_price NUMERIC
)
RETURNS TABLE(profit_loss_amount NUMERIC, profit_loss_pct NUMERIC) AS $$
BEGIN
    RETURN QUERY SELECT
        (p_shares * p_current_price) - (p_shares * p_entry_price),
        (((p_shares * p_current_price) - (p_shares * p_entry_price)) / (p_shares * p_entry_price)) * 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample alert preferences (replace with actual user_id after auth setup)
-- INSERT INTO public.alert_preferences (user_id, email, webhook_url)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'user@example.com', NULL)
-- ON CONFLICT (user_id) DO NOTHING;
