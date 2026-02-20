/**
 * Centralized Configuration for ProTrader AI
 * All environment variables and config should be accessed through this file
 */

// Python backend service URL
export const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Supabase configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Environment detection
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// API configuration
export const API_CONFIG = {
    pythonService: PYTHON_SERVICE_URL,
    timeout: 30000, // 30 seconds
    retries: 3,
};

// Cache durations (in seconds)
export const CACHE_DURATIONS = {
    stockData: 15 * 60,      // 15 minutes
    screenerData: 15 * 60,   // 15 minutes
    newsData: 5 * 60,        // 5 minutes
    indicatorsData: 15 * 60, // 15 minutes
};

// Feature flags
export const FEATURES = {
    backtesting: true,
    portfolioTracking: true,
    priceAlerts: true,
    sentimentAnalysis: true,
};
