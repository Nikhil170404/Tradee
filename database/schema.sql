-- ProTrader AI Database Schema for Supabase
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (if not using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, ticker)
);

-- Portfolio holdings table
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  target_price DECIMAL(18, 2) NOT NULL CHECK (target_price > 0),
  condition VARCHAR(10) NOT NULL CHECK (condition IN ('above', 'below')),
  active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily stock picks history
CREATE TABLE IF NOT EXISTS daily_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pick_date DATE NOT NULL UNIQUE,
  ticker VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL,
  target_price DECIMAL(18, 2),
  reasoning JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  ticker VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_ticker ON watchlist(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_ticker ON portfolio(ticker);
CREATE INDEX IF NOT EXISTS idx_alerts_user_active ON price_alerts(user_id, active);
CREATE INDEX IF NOT EXISTS idx_daily_picks_date ON daily_picks(pick_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY "Users can view own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON watchlist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own portfolio" ON portfolio
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio" ON portfolio
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio" ON portfolio
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio" ON portfolio
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts" ON price_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON price_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON price_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON price_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Daily picks are public (everyone can view)
CREATE POLICY "Daily picks are viewable by everyone" ON daily_picks
  FOR SELECT USING (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON portfolio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate portfolio value
CREATE OR REPLACE FUNCTION calculate_portfolio_value(p_user_id UUID)
RETURNS TABLE(
  total_value DECIMAL,
  total_cost DECIMAL,
  total_gain DECIMAL,
  total_gain_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(quantity * avg_price) as total_value,
    SUM(quantity * avg_price) as total_cost,
    0::DECIMAL as total_gain,
    0::DECIMAL as total_gain_percent
  FROM portfolio
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE watchlist IS 'User stock watchlists';
COMMENT ON TABLE portfolio IS 'User portfolio holdings';
COMMENT ON TABLE price_alerts IS 'Price alert configurations';
COMMENT ON TABLE daily_picks IS 'AI-generated daily stock picks';
COMMENT ON TABLE activity_log IS 'User activity tracking';
