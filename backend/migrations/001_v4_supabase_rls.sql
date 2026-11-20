-- ==============================================================================
-- FINPULSE AI V4.0 — PRODUCTION DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Target Platform: Supabase PostgreSQL 15+
-- Author: Ashish Ranjan (Roll: 231210027) — NIT Delhi
-- Context: IBM SkillsBuild Internship
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    default_exchange TEXT DEFAULT 'NSE',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to automatically create a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. PORTFOLIOS & HOLDINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Primary Portfolio',
    currency TEXT NOT NULL DEFAULT 'INR',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own portfolios"
    ON public.portfolios FOR ALL
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(150),
    quantity NUMERIC(14, 4) NOT NULL CHECK (quantity > 0),
    buy_price NUMERIC(14, 4) NOT NULL CHECK (buy_price >= 0),
    buy_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON public.portfolio_holdings(symbol);

ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own holdings"
    ON public.portfolio_holdings FOR ALL
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. WATCHLISTS & ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default Watchlist',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own watchlists"
    ON public.watchlists FOR ALL
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.watchlist_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    watchlist_id UUID REFERENCES public.watchlists(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(150),
    exchange VARCHAR(20) DEFAULT 'NSE',
    notes TEXT,
    added_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON public.watchlist_items(symbol);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own watchlist items"
    ON public.watchlist_items FOR ALL
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. RESEARCH REPORTS & AI QUERY AUDIT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_reports (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    symbol VARCHAR(50) NOT NULL,
    title VARCHAR(250) NOT NULL,
    executive_summary TEXT NOT NULL,
    full_content TEXT NOT NULL,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_symbol ON public.research_reports(symbol);

ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and generate their own reports"
    ON public.research_reports FOR ALL
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_query_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    retrieved_sources JSONB DEFAULT '[]'::jsonb,
    is_grounded BOOLEAN DEFAULT true,
    model_used VARCHAR(50) DEFAULT 'gemini-1.5-flash',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_history_user_id ON public.ai_query_history(user_id);

ALTER TABLE public.ai_query_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI query history"
    ON public.ai_query_history FOR ALL
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. UPSTOX / BROKER TOKEN STORAGE (Per-User / System encrypted)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broker_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    broker_name VARCHAR(50) NOT NULL DEFAULT 'upstox',
    access_token TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, broker_name)
);

ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own broker connections"
    ON public.broker_connections FOR ALL
    USING (auth.uid() = user_id);
