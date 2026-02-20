-- =============================================================================
-- ProTrader AI - Complete Database Schema v2.0
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table (if not using Supabase Auth profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"theme": "dark", "currency": "INR", "notifications": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  target_price DECIMAL(18, 2),
  alert_enabled BOOLEAN DEFAULT false,
  UNIQUE(user_id, ticker)
);

-- Portfolio holdings table
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL CHECK (quantity > 0),
  avg_price DECIMAL(18, 2) NOT NULL CHECK (avg_price > 0),
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  target_price DECIMAL(18, 2) NOT NULL CHECK (target_price > 0),
  condition VARCHAR(10) NOT NULL CHECK (condition IN ('above', 'below')),
  active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily stock picks history
CREATE TABLE IF NOT EXISTS daily_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pick_date DATE NOT NULL UNIQUE,
  ticker VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL,
  sector VARCHAR(50),
  signal VARCHAR(20),
  target_price DECIMAL(18, 2),
  reasoning JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  ticker VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- BACKTESTING TABLES
-- =============================================================================

-- Backtest results history
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital DECIMAL(18, 2) NOT NULL,
  strategy_name VARCHAR(50) NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  results JSONB NOT NULL,
  -- Extracted metrics for querying
  total_return_pct DECIMAL(10, 4),
  sharpe_ratio DECIMAL(10, 4),
  max_drawdown_pct DECIMAL(10, 4),
  win_rate_pct DECIMAL(10, 4),
  total_trades INTEGER,
  final_value DECIMAL(18, 2),
  -- Comparison
  benchmark_return_pct DECIMAL(10, 4),
  beat_benchmark BOOLEAN GENERATED ALWAYS AS (total_return_pct > benchmark_return_pct) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User custom strategies
CREATE TABLE IF NOT EXISTS user_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  strategy_type VARCHAR(50) NOT NULL, -- 'RSI', 'MACD', 'Combined', 'Custom'
  parameters JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  avg_return DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Strategy performance tracking
CREATE TABLE IF NOT EXISTS strategy_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES user_strategies(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  test_date DATE NOT NULL,
  return_pct DECIMAL(10, 4),
  sharpe_ratio DECIMAL(10, 4),
  win_rate_pct DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(strategy_id, ticker, test_date)
);

-- =============================================================================
-- NOTIFICATIONS & SESSIONS
-- =============================================================================

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'price_alert', 'daily_pick', 'backtest_complete', 'system'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions/preferences cache
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data JSONB DEFAULT '{}'::jsonb,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- MARKET DATA CACHE
-- =============================================================================

-- Stock data cache (to reduce API calls)
CREATE TABLE IF NOT EXISTS stock_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker VARCHAR(20) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  signals JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '15 minutes'
);

-- Sector performance history
CREATE TABLE IF NOT EXISTS sector_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  avg_score DECIMAL(10, 4),
  trend VARCHAR(20), -- 'BULLISH', 'BEARISH', 'NEUTRAL'
  top_stocks JSONB, -- Array of top performing tickers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sector, date)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_ticker ON watchlist(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_ticker ON portfolio(ticker);
CREATE INDEX IF NOT EXISTS idx_alerts_user_active ON price_alerts(user_id, active);
CREATE INDEX IF NOT EXISTS idx_daily_picks_date ON daily_picks(pick_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- Backtest indexes
CREATE INDEX IF NOT EXISTS idx_backtest_user ON backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_ticker ON backtest_results(ticker);
CREATE INDEX IF NOT EXISTS idx_backtest_strategy ON backtest_results(strategy_name);
CREATE INDEX IF NOT EXISTS idx_backtest_created ON backtest_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_strategies_user ON user_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_type ON user_strategies(strategy_type);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- Cache indexes
CREATE INDEX IF NOT EXISTS idx_stock_cache_ticker ON stock_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_cache_expires ON stock_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_sector_perf_date ON sector_performance(date DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Watchlist policies
CREATE POLICY "Users can view own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watchlist" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlist" ON watchlist
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlist" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Portfolio policies
CREATE POLICY "Users can view own portfolio" ON portfolio
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolio" ON portfolio
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio" ON portfolio
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio" ON portfolio
  FOR DELETE USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can view own alerts" ON price_alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON price_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON price_alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON price_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Activity log policies
CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Backtest policies
CREATE POLICY "Users can view own backtests" ON backtest_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own backtests" ON backtest_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own backtests" ON backtest_results
  FOR DELETE USING (auth.uid() = user_id);

-- Strategy policies (public strategies are viewable by all)
CREATE POLICY "Users can view own and public strategies" ON user_strategies
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own strategies" ON user_strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategies" ON user_strategies
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategies" ON user_strategies
  FOR DELETE USING (auth.uid() = user_id);

-- Notification policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Session policies
CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Daily picks are public
ALTER TABLE daily_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily picks are viewable by everyone" ON daily_picks
  FOR SELECT USING (true);

-- Stock cache is public (read-only for users)
ALTER TABLE stock_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stock cache is readable by everyone" ON stock_cache
  FOR SELECT USING (true);

-- Sector performance is public
ALTER TABLE sector_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sector performance is readable by everyone" ON sector_performance
  FOR SELECT USING (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_portfolio_updated_at ON portfolio;
CREATE TRIGGER update_portfolio_updated_at 
  BEFORE UPDATE ON portfolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON price_alerts;
CREATE TRIGGER update_alerts_updated_at 
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_strategies_updated_at ON user_strategies;
CREATE TRIGGER update_strategies_updated_at 
  BEFORE UPDATE ON user_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate portfolio value
CREATE OR REPLACE FUNCTION calculate_portfolio_value(
  p_user_id UUID, 
  current_prices JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  total_value DECIMAL,
  total_cost DECIMAL,
  total_gain DECIMAL,
  total_gain_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(
      COALESCE(
        (current_prices->>p.ticker)::DECIMAL * p.quantity, 
        p.avg_price * p.quantity
      )
    ) as total_value,
    SUM(p.quantity * p.avg_price) as total_cost,
    SUM(
      COALESCE(
        (current_prices->>p.ticker)::DECIMAL * p.quantity, 
        p.avg_price * p.quantity
      ) - (p.quantity * p.avg_price)
    ) as total_gain,
    CASE 
      WHEN SUM(p.quantity * p.avg_price) > 0 THEN
        (SUM(
          COALESCE(
            (current_prices->>p.ticker)::DECIMAL * p.quantity, 
            p.avg_price * p.quantity
          ) - (p.quantity * p.avg_price)
        ) / SUM(p.quantity * p.avg_price)) * 100
      ELSE 0
    END as total_gain_percent
  FROM portfolio p
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get best backtest strategy for a user
CREATE OR REPLACE FUNCTION get_best_strategy(p_user_id UUID)
RETURNS TABLE(
  strategy_name VARCHAR,
  avg_return DECIMAL,
  total_backtests BIGINT,
  best_return DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    br.strategy_name,
    AVG(br.total_return_pct)::DECIMAL as avg_return,
    COUNT(*) as total_backtests,
    MAX(br.total_return_pct)::DECIMAL as best_return
  FROM backtest_results br
  WHERE br.user_id = p_user_id
  GROUP BY br.strategy_name
  ORDER BY avg_return DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM stock_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE user_id = p_user_id AND read = false;
$$ LANGUAGE SQL;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action VARCHAR,
  p_ticker VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO activity_log (user_id, action, ticker, metadata)
  VALUES (p_user_id, p_action, p_ticker, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE watchlist IS 'User stock watchlists with optional alerts';
COMMENT ON TABLE portfolio IS 'User portfolio holdings';
COMMENT ON TABLE price_alerts IS 'Price alert configurations';
COMMENT ON TABLE daily_picks IS 'AI-generated daily stock picks';
COMMENT ON TABLE activity_log IS 'User activity tracking';
COMMENT ON TABLE backtest_results IS 'Historical backtest results for analysis';
COMMENT ON TABLE user_strategies IS 'User-defined custom trading strategies';
COMMENT ON TABLE strategy_performance IS 'Strategy performance tracking over time';
COMMENT ON TABLE notifications IS 'User notifications and alerts';
COMMENT ON TABLE stock_cache IS 'Cached stock data to reduce API calls';
COMMENT ON TABLE sector_performance IS 'Historical sector performance data';

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================

-- Insert sample daily picks
INSERT INTO daily_picks (pick_date, ticker, score, sector, signal, reasoning) VALUES
  (CURRENT_DATE, 'RELIANCE.NS', 78, 'Energy', 'STRONG BUY', '{"technical": 75, "fundamental": 80, "sentiment": 72}'::jsonb),
  (CURRENT_DATE - 1, 'TCS.NS', 72, 'IT', 'BUY', '{"technical": 70, "fundamental": 75, "sentiment": 68}'::jsonb),
  (CURRENT_DATE - 2, 'HDFCBANK.NS', 68, 'Banking', 'BUY', '{"technical": 65, "fundamental": 72, "sentiment": 65}'::jsonb)
ON CONFLICT (pick_date) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES (Run after creation)
-- =============================================================================

-- Check all tables were created
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check all RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Check all indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
