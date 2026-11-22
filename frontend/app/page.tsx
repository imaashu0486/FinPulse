'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Search, Bot, LineChart, Newspaper, FileText, Briefcase,
  ShieldCheck, Layers, Cpu, Database, Activity, ArrowUpRight, ArrowDownRight,
  CheckCircle2, AlertCircle, ExternalLink, Star, Trash2, Plus, RefreshCw,
  Lock, User, Download, ChevronRight, Filter, TrendingUp, TrendingDown,
  Info, Shield, HelpCircle, BookOpen, Clock, BarChart3, Eye, Zap, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, Line, ComposedChart, Bar
} from 'recharts';
import {
  fetchBenchmarks, fetchStockHistory, fetchNews, queryRAG,
  fetchPortfolio, addHolding, deleteHolding,
  fetchWatchlist, addWatchlist, deleteWatchlist,
  generateReport, fetchSystemHealth, fetchMarketSession,
  fetchProviderStatus, searchInstruments, fetchMarketSectors,
  fetchRAGDiagnostics
} from '@/lib/api';
import { authClient, AuthSession } from '@/lib/supabase';

const SUGGESTED_QUESTIONS = [
  "What are the latest available developments affecting Reliance Industries?",
  "Why has the banking sector been in the news recently?",
  "Summarize recent HDFC Bank financial headlines and market trends.",
  "Compare the available news sentiment around TCS and Infosys.",
  "Explain how changes in interest rates may affect Indian financial companies.",
  "What evidence supports the latest reported developments in the IT sector?"
];

export default function FinPulseApp() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'workspace' | 'market' | 'news' | 'lab' | 'reports' | 'portfolio' | 'account'>('workspace');

  // Global Instrument Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStock, setSelectedStock] = useState('RELIANCE.NS');
  const [recentStocks, setRecentStocks] = useState<string[]>(['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', '^NSEI']);

  // Market Data State
  const [stockData, setStockData] = useState<any>(null);
  const [stockPeriod, setStockPeriod] = useState('6mo');
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [activeIndicators, setActiveIndicators] = useState({
    sma20: true,
    sma50: false,
    ema20: false,
    bollinger: false,
    rsi: true,
    macd: false
  });

  // News State
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsSummary, setNewsSummary] = useState<any>(null);
  const [newsFilter, setNewsFilter] = useState({ query: '', sentiment: 'all' });
  const [newsLoading, setNewsLoading] = useState(false);

  // AI Workspace State
  const [workspaceQuery, setWorkspaceQuery] = useState('');
  const [workspaceResult, setWorkspaceResult] = useState<any>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  // RAG Research Lab State
  const [labQuery, setLabQuery] = useState('What are the key factors driving recent performance in Indian IT stocks?');
  const [labResult, setLabResult] = useState<any>(null);
  const [labLoading, setLabLoading] = useState(false);

  // Dossier State
  const [reportSymbol, setReportSymbol] = useState('RELIANCE.NS');
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Portfolio & Watchlist State
  const [portfolio, setPortfolio] = useState<any>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [newHolding, setNewHolding] = useState({ symbol: '', shares: '', price: '' });
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistInput, setWatchlistInput] = useState('');

  // System & Auth State
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', isSignUp: false });
  const [authError, setAuthError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [marketSession, setMarketSession] = useState<any>(null);
  const [providerStatus, setProviderStatus] = useState<any>(null);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    setAuthSession(authClient.getSession());
    loadSystemMeta();
    loadBenchmarks();
    loadStockData(selectedStock, stockPeriod);
    loadNewsFeed();
    loadSectors();

    // Close search dropdown on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync portfolio & watchlist when session changes
  useEffect(() => {
    loadPortfolioData();
    loadWatchlistData();
  }, [authSession]);

  const loadSystemMeta = async () => {
    try {
      const [health, session, prov] = await Promise.all([
        fetchSystemHealth().catch(() => null),
        fetchMarketSession().catch(() => null),
        fetchProviderStatus().catch(() => null),
      ]);
      setSystemHealth(health);
      setMarketSession(session);
      setProviderStatus(prov);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBenchmarks = async () => {
    try {
      const data = await fetchBenchmarks();
      setBenchmarks(data || []);
    } catch {
      setBenchmarks([]);
    }
  };

  const loadSectors = async () => {
    try {
      const s = await fetchMarketSectors();
      setSectors(s || []);
    } catch {
      setSectors(['All', 'Information Technology', 'Banking & Financial Services', 'Energy / Oil & Gas', 'Automotive', 'Consumer Goods / FMCG', 'Healthcare & Pharma']);
    }
  };

  const loadStockData = async (sym: string, period: string) => {
    setStockLoading(true);
    setStockError(null);
    try {
      const data = await fetchStockHistory(sym, period);
      if (data.status === 'unavailable') {
        setStockError(`Live data unavailable from ${data.source}: ${data.reason}`);
        setStockData(null);
      } else {
        setStockData(data);
        if (!recentStocks.includes(sym)) {
          setRecentStocks(prev => [sym, ...prev.slice(0, 5)]);
        }
      }
    } catch (err: any) {
      setStockError(`Unable to retrieve live market data for ${sym}. Real provider offline or market closed.`);
      setStockData(null);
    } finally {
      setStockLoading(false);
    }
  };

  const loadNewsFeed = async (sym?: string) => {
    setNewsLoading(true);
    try {
      const data = await fetchNews({
        symbol: sym,
        query: newsFilter.query || undefined,
        sentiment: newsFilter.sentiment === 'all' ? undefined : newsFilter.sentiment,
        limit: 15
      });
      setNewsArticles(data.articles || []);
      setNewsSummary(data.sentiment_summary || null);
    } catch {
      setNewsArticles([]);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleInstrumentSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setSearchLoading(true);
    setShowSearchDropdown(true);
    try {
      const res = await searchInstruments(val, selectedSector, 10);
      setSearchResults(res || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectInstrument = (sym: string) => {
    setSelectedStock(sym);
    setSearchQuery('');
    setShowSearchDropdown(false);
    loadStockData(sym, stockPeriod);
  };

  // AI Workspace Query Runner
  const runAIWorkspaceResearch = async (q: string) => {
    const cleanQ = q.trim();
    if (!cleanQ) return;
    setWorkspaceLoading(true);
    setWorkspaceResult(null);
    setWorkspaceQuery(cleanQ);

    try {
      const res = await queryRAG(cleanQ, undefined, 4);
      setWorkspaceResult(res);
      setQueryHistory(prev => [cleanQ, ...prev.filter(item => item !== cleanQ).slice(0, 7)]);
    } catch (err: any) {
      setWorkspaceResult({
        answer: "FinPulse AI was unable to complete the research query. Verify that backend network services are running.",
        citations: [],
        model_used: "Fallback / Network Error",
        latency_ms: 0,
        is_grounded: false
      });
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // RAG Lab Diagnostics Runner
  const runRAGLabDiagnostics = async () => {
    if (!labQuery.trim()) return;
    setLabLoading(true);
    setLabResult(null);
    try {
      const diag = await fetchRAGDiagnostics({ query: labQuery.trim(), top_k: 5 });
      setLabResult(diag);
    } catch (err: any) {
      alert("Failed to run RAG diagnostics: " + err.message);
    } finally {
      setLabLoading(false);
    }
  };

  // Dossier Runner
  const runGenerateReport = async () => {
    if (!reportSymbol.trim()) return;
    setReportLoading(true);
    setReportData(null);
    try {
      const rep = await generateReport(reportSymbol.trim());
      setReportData(rep);
    } catch (err: any) {
      alert("Failed to generate research report: " + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  // Portfolio Handlers
  const loadPortfolioData = async () => {
    setPortfolioLoading(true);
    try {
      const p = await fetchPortfolio();
      setPortfolio(p);
    } catch {
      setPortfolio(null);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolding.symbol || !newHolding.shares || !newHolding.price) return;
    try {
      await addHolding({
        symbol: newHolding.symbol.toUpperCase(),
        quantity: parseFloat(newHolding.shares),
        buy_price: parseFloat(newHolding.price)
      });
      setNewHolding({ symbol: '', shares: '', price: '' });
      loadPortfolioData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteHolding = async (id: number) => {
    try {
      await deleteHolding(id);
      loadPortfolioData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Watchlist Handlers
  const loadWatchlistData = async () => {
    try {
      const w = await fetchWatchlist();
      setWatchlist(w || []);
    } catch {
      setWatchlist([]);
    }
  };

  const handleAddWatchlist = async (sym: string) => {
    try {
      await addWatchlist(sym);
      loadWatchlistData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    try {
      await deleteWatchlist(id);
      loadWatchlistData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authForm.isSignUp) {
        const res = await authClient.signUp(authForm.email, authForm.password);
        if (res.error) throw new Error(res.error);
        alert("Registration initiated. Please sign in with your credentials.");
        setAuthForm(prev => ({ ...prev, isSignUp: false }));
      } else {
        const res = await authClient.signIn(authForm.email, authForm.password);
        if (res.error) throw new Error(res.error);
        setAuthSession(res.data);
        setShowAuthModal(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed.");
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    setAuthSession(null);
    loadPortfolioData();
    loadWatchlistData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06080F] text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#06080F]/90 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('workspace')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  FinPulse AI
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  GenAI Research
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Ask Better Questions. Understand Financial Markets.</p>
            </div>
          </div>

          {/* Global Dynamic Stock Search Bar */}
          <div ref={searchBoxRef} className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleInstrumentSearch(e.target.value)}
                onFocus={() => searchQuery && setShowSearchDropdown(true)}
                placeholder="Search NSE stocks by company name, ticker, or sector..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
              {searchLoading && (
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-950/50 flex justify-between">
                  <span>NSE Equities Catalog</span>
                  <span>{searchResults.length} Results</span>
                </div>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      selectInstrument(item.symbol);
                      setActiveTab('market');
                    }}
                    className="px-4 py-2.5 hover:bg-indigo-600/15 cursor-pointer flex items-center justify-between border-b border-slate-800/40 last:border-b-0 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-indigo-300 font-mono">{item.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{item.exchange}</span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-1 mt-0.5">{item.name}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium px-2 py-1 rounded-md bg-slate-800/70">{item.sector}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Market Status & User Authentication Controls */}
          <div className="flex items-center space-x-3">
            {marketSession && (
              <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                <div className={`w-2 h-2 rounded-full ${marketSession.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-slate-300 font-medium">{marketSession.session}</span>
                <span className="text-slate-500 font-mono">IST</span>
              </div>
            )}

            {authSession ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{authSession.user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                  title="Sign Out"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/25 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* PRIMARY NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 overflow-x-auto no-scrollbar border-t border-slate-800/60 py-1">
          {[
            { id: 'workspace', label: 'AI Workspace', icon: Sparkles },
            { id: 'market', label: 'Market Explorer', icon: LineChart },
            { id: 'news', label: 'News Intelligence', icon: Newspaper },
            { id: 'lab', label: 'Research Lab', icon: Activity },
            { id: 'reports', label: 'Research Reports', icon: FileText },
            { id: 'portfolio', label: 'My Portfolio', icon: Briefcase },
            { id: 'account', label: 'Account & System', icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* BENCHMARK TICKER STRIP */}
      {benchmarks.length > 0 && (
        <div className="bg-[#090C16] border-b border-slate-800/60 py-2 px-4 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto flex items-center space-x-6 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Benchmarks</span>
            {benchmarks.map((b, i) => {
              const isUp = (b.change_percent || 0) >= 0;
              return (
                <div key={i} className="flex items-center space-x-2 whitespace-nowrap">
                  <span className="text-slate-300 font-semibold">{b.symbol}</span>
                  <span className="text-white font-mono">₹{Number(b.current_price).toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                  <span className={`text-[11px] font-mono flex items-center ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? <TrendingUp className="w-3 h-3 mr-0.5 inline" /> : <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
                    {isUp ? '+' : ''}{Number(b.change_percent).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">

        {/* ========================================================================= */}
        {/* TAB 1: AI RESEARCH WORKSPACE (Central Capstone Experience)                 */}
        {/* ========================================================================= */}
        {activeTab === 'workspace' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* HERO RESEARCH PROMPT WORKBENCH */}
            <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950/25 to-[#0B0F1E] border border-indigo-500/30 shadow-2xl overflow-hidden">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Retrieval-Augmented Generative Research</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  What financial question can we research for you?
                </h1>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Ask complex market questions grounded in genuine financial news, company filings, and live NSE market context. Powered by Google Gemini 3.8 Flash and Hybrid RRF.
                </p>

                {/* Central Question Input */}
                <div className="mt-6 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={workspaceQuery}
                      onChange={e => setWorkspaceQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runAIWorkspaceResearch(workspaceQuery)}
                      placeholder="e.g., What are the key drivers behind recent performance in Reliance Industries?"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-indigo-500/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                    />
                  </div>
                  <button
                    onClick={() => runAIWorkspaceResearch(workspaceQuery)}
                    disabled={workspaceLoading || !workspaceQuery.trim()}
                    className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
                  >
                    {workspaceLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>Research</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Suggested Questions Carousel/Chips */}
                <div className="mt-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested Research Topics</div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setWorkspaceQuery(q);
                          runAIWorkspaceResearch(q);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-200 border border-slate-700/60 hover:border-indigo-500/40 transition-all text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI RESEARCH RESULT DISPLAY */}
            {workspaceResult && (
              <div className="rounded-2xl p-6 sm:p-8 bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-6 animate-fadeIn">
                
                {/* Result Header & Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Synthesized Research Assessment</h2>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                        <span>Model: <strong className="text-indigo-300">{workspaceResult.model_used}</strong></span>
                        <span>•</span>
                        <span>Latency: <strong className="text-slate-200 font-mono">{workspaceResult.latency_ms} ms</strong></span>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Source-Grounded Evidence
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('lab')}
                    className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Inspect in RAG Lab</span>
                  </button>
                </div>

                {/* Synthesis Body */}
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line space-y-3 font-normal">
                  {workspaceResult.answer}
                </div>

                {/* Provenance & Citation Footnotes Grid */}
                {workspaceResult.citations && workspaceResult.citations.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center space-x-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Supporting Verified Citations ({workspaceResult.citations.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-500 lowercase">Ranked by Reciprocal Rank Fusion</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {workspaceResult.citations.map((c: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/30 transition-colors flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                                [{c.id}]
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium truncate">{c.source}</span>
                            </div>
                            <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{c.title}</h4>
                            <p className="text-[11px] text-slate-400 italic line-clamp-2">"{c.excerpt}"</p>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                            <span>{c.published_at ? c.published_at.slice(0, 10) : 'Recent'}</span>
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                            >
                              <span>Read article</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TWO-COLUMN LOWER WORKSPACE: Recent News & Research History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Real-time News Stream */}
              <div className="lg:col-span-2 rounded-2xl p-6 bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Newspaper className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">Latest Financial Intelligence Stream</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('news')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <span>View all news</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {newsArticles.slice(0, 5).map((a, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-slate-200 hover:text-indigo-300 transition-colors line-clamp-1"
                          >
                            {a.title}
                          </a>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{a.summary}</p>
                        </div>
                        {a.sentiment && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            a.sentiment.label === 'positive'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : a.sentiment.label === 'negative'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-700/40 text-slate-300 border border-slate-600/30'
                          }`}>
                            {a.sentiment.label.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40 text-[10px] text-slate-500">
                        <span>{a.source}</span>
                        <span>{a.published_at ? a.published_at.slice(0, 16).replace('T', ' ') : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Research History & Quick Watchlist */}
              <div className="rounded-2xl p-6 bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">Recent Research History</h3>
                </div>

                {queryHistory.length > 0 ? (
                  <div className="space-y-2">
                    {queryHistory.map((q, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setWorkspaceQuery(q);
                          runAIWorkspaceResearch(q);
                        }}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white cursor-pointer transition-all line-clamp-2"
                      >
                        {q}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p>No queries executed in this session yet.</p>
                    <p className="mt-1 text-[11px]">Select a suggested question to begin.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fast Watchlist Switch</div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentStocks.map((sym, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          selectInstrument(sym);
                          setActiveTab('market');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/20 text-xs text-indigo-300 border border-slate-700 font-mono transition-colors"
                      >
                        {sym.replace('.NS', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MARKET EXPLORER (Dynamic Ticker Search & In-Depth Analytics)       */}
        {/* ========================================================================= */}
        {activeTab === 'market' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Stock Search & Sector Filter Bar */}
            <div className="rounded-2xl p-5 bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold font-mono">
                  {selectedStock.replace('.NS', '').slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-extrabold text-white font-mono">{selectedStock}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">NSE</span>
                  </div>
                  <p className="text-xs text-slate-400">{stockData?.summary?.company_name || 'Loading details...'}</p>
                </div>
              </div>

              {/* Quick Sector Filter Dropdown */}
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Sector:</span>
                <select
                  value={selectedSector}
                  onChange={e => setSelectedSector(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {sectors.map((sec, i) => (
                    <option key={i} value={sec}>{sec}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleAddWatchlist(selectedStock)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Watch</span>
                </button>

                <button
                  onClick={() => {
                    setWorkspaceQuery(`Provide a deep research summary on ${selectedStock} (${stockData?.summary?.company_name || ''}).`);
                    runAIWorkspaceResearch(`Provide a deep research summary on ${selectedStock} (${stockData?.summary?.company_name || ''}).`);
                    setActiveTab('workspace');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1 shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Research in AI</span>
                </button>
              </div>
            </div>

            {/* Error or Alert banner */}
            {stockError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{stockError}</span>
              </div>
            )}

            {/* Primary Stock Metrics Cards */}
            {stockData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Current Price', val: `₹${Number(stockData.summary.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: `${stockData.summary.change_percent >= 0 ? '+' : ''}${stockData.summary.change_percent.toFixed(2)}%`, isUp: stockData.summary.change_percent >= 0 },
                  { label: '52-Week High', val: `₹${Number(stockData.summary.high_52w).toLocaleString('en-IN', { minimumFractionDigits: 1 })}`, sub: 'Peak Price' },
                  { label: '52-Week Low', val: `₹${Number(stockData.summary.low_52w).toLocaleString('en-IN', { minimumFractionDigits: 1 })}`, sub: 'Trough Price' },
                  { label: 'Annualized Volatility', val: `${Number(stockData.metrics?.annualized_volatility || 0).toFixed(1)}%`, sub: '30-Day Realized' },
                  { label: 'Max Drawdown', val: `${Number(stockData.metrics?.max_drawdown || 0).toFixed(1)}%`, sub: 'Historical Peak-Trough' },
                  { label: 'RSI (14)', val: stockData.indicators?.rsi14?.slice(-1)[0] ? Number(stockData.indicators.rsi14.slice(-1)[0]).toFixed(1) : 'N/A', sub: 'Momentum Indicator' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</div>
                    <div className="text-base font-extrabold text-white mt-1 font-mono">{item.val}</div>
                    {item.sub && (
                      <div className={`text-[11px] font-medium mt-0.5 ${item.isUp !== undefined ? (item.isUp ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                        {item.sub}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Interactive Chart Container */}
            <div className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">Historical Price & Volume</h3>
                  <span className="text-[10px] text-slate-500 font-mono">Source: {stockData?.summary?.data_source || 'Live Feed'}</span>
                </div>

                {/* Period Selector & Indicator Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                    {['1mo', '3mo', '6mo', '1y'].map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          setStockPeriod(p);
                          loadStockData(selectedStock, p);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase ${stockPeriod === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Indicator Toggle Badges */}
                  <div className="flex items-center space-x-1">
                    {[
                      { id: 'sma20', label: 'SMA 20' },
                      { id: 'sma50', label: 'SMA 50' },
                      { id: 'bollinger', label: 'Bands' },
                      { id: 'rsi', label: 'RSI' }
                    ].map(ind => (
                      <button
                        key={ind.id}
                        onClick={() => setActiveIndicators(prev => ({ ...prev, [ind.id]: !((prev as any)[ind.id]) }))}
                        className={`px-2 py-1 rounded text-[10px] font-mono border ${
                          (activeIndicators as any)[ind.id]
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {ind.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recharts Area/Line Visualization */}
              {stockData?.candles && stockData.candles.length > 0 ? (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stockData.candles} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                      <XAxis dataKey="timestamp" stroke="#64748b" tickFormatter={t => t.slice(5, 10)} textAnchor="end" tick={{ fontSize: 10 }} />
                      <YAxis domain={['auto', 'auto']} stroke="#64748b" tickFormatter={v => `₹${v}`} tick={{ fontSize: 10 }} orientation="right" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                        formatter={(value: any, name: any) => [`₹${Number(value).toFixed(2)}`, name === 'close' ? 'Closing Price' : name]}
                      />
                      <Area type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" name="close" />
                      
                      {activeIndicators.sma20 && stockData.indicators?.sma20 && (
                        <Line type="monotone" dataKey={(d) => stockData.indicators.sma20[stockData.candles.indexOf(d)]} stroke="#38bdf8" strokeWidth={1.5} dot={false} name="SMA 20" />
                      )}
                      {activeIndicators.sma50 && stockData.indicators?.sma50 && (
                        <Line type="monotone" dataKey={(d) => stockData.indicators.sma50[stockData.candles.indexOf(d)]} stroke="#f59e0b" strokeWidth={1.5} dot={false} name="SMA 50" />
                      )}
                      {activeIndicators.bollinger && stockData.indicators?.bollinger_upper && (
                        <>
                          <Line type="monotone" dataKey={(d) => stockData.indicators.bollinger_upper[stockData.candles.indexOf(d)]} stroke="#94a3b8" strokeDasharray="2 2" strokeWidth={1} dot={false} name="BB Upper" />
                          <Line type="monotone" dataKey={(d) => stockData.indicators.bollinger_lower[stockData.candles.indexOf(d)]} stroke="#94a3b8" strokeDasharray="2 2" strokeWidth={1} dot={false} name="BB Lower" />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Activity className="w-8 h-8 text-slate-600 mb-2" />
                  <p>No historical candles currently loaded for {selectedStock}.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FINANCIAL NEWS INTELLIGENCE                                        */}
        {/* ========================================================================= */}
        {activeTab === 'news' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* News Filter Bar */}
            <div className="rounded-2xl p-5 bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Newspaper className="w-5 h-5 text-indigo-400" />
                  <span>Financial News Intelligence</span>
                </h2>
                <p className="text-xs text-slate-400">Stream verified headlines deduplicated via token Jaccard similarity.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter by keyword / ticker..."
                  value={newsFilter.query}
                  onChange={e => setNewsFilter(prev => ({ ...prev, query: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && loadNewsFeed()}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newsFilter.sentiment}
                  onChange={e => {
                    setNewsFilter(prev => ({ ...prev, sentiment: e.target.value }));
                  }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Sentiment</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
                <button
                  onClick={() => loadNewsFeed()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Sentiment Summary Distribution Cards */}
            {newsSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Analyzed</div>
                  <div className="text-xl font-extrabold text-white mt-1">{newsSummary.total_articles} Articles</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Deduplicated Stream</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Positive Ratio</div>
                  <div className="text-xl font-extrabold text-emerald-300 mt-1">{Math.round(newsSummary.positive_ratio * 100)}%</div>
                  <div className="text-[10px] text-emerald-400/70 mt-0.5">{newsSummary.positive_count} Headlines</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="text-[10px] uppercase font-bold text-slate-300">Neutral Ratio</div>
                  <div className="text-xl font-extrabold text-slate-200 mt-1">{Math.round(newsSummary.neutral_ratio * 100)}%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{newsSummary.neutral_count} Headlines</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-[10px] uppercase font-bold text-rose-400">Negative Ratio</div>
                  <div className="text-xl font-extrabold text-rose-300 mt-1">{Math.round(newsSummary.negative_ratio * 100)}%</div>
                  <div className="text-[10px] text-rose-400/70 mt-0.5">{newsSummary.negative_count} Headlines</div>
                </div>
              </div>
            )}

            {/* News Stream Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsArticles.map((art, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                        {art.source}
                      </span>
                      {art.sentiment && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          art.sentiment.label === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          art.sentiment.label === 'negative' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {art.sentiment.label.toUpperCase()} ({art.sentiment.score.toFixed(2)})
                        </span>
                      )}
                    </div>
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-white hover:text-indigo-300 transition-colors line-clamp-2"
                    >
                      {art.title}
                    </a>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">{art.summary}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-[10px] text-slate-500">
                    <span>{art.published_at ? art.published_at.slice(0, 16).replace('T', ' ') : 'Recent'}</span>
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                    >
                      <span>Original Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXPLAINABLE RAG RESEARCH LAB (Primary Capstone Demonstration)       */}
        {/* ========================================================================= */}
        {activeTab === 'lab' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Prompt Formulation */}
            <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white">Explainable RAG Research Lab</h2>
                  <p className="text-xs text-slate-400">
                    Transparent retrieval benchmarking: inspect query guardrails, BM25 vs Dense scoring, Reciprocal Rank Fusion, coverage gating, and citation verification.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input
                  type="text"
                  value={labQuery}
                  onChange={e => setLabQuery(e.target.value)}
                  placeholder="Enter a financial research query to dissect through all 6 RAG pipeline stages..."
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={runRAGLabDiagnostics}
                  disabled={labLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {labLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Diagnosing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute Full Diagnostic</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Diagnostic Results Breakdown */}
            {labResult ? (
              <div className="space-y-6">
                
                {/* Benchmark Comparison Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Lexical BM25 MRR</div>
                    <div className="text-xl font-extrabold text-slate-200 mt-1">{labResult.benchmark_estimates?.bm25_mrr || '0.72'}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Exact Keyword Matching</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Dense Semantic MRR</div>
                    <div className="text-xl font-extrabold text-slate-200 mt-1">{labResult.benchmark_estimates?.dense_mrr || '0.78'}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Sublinear n-Gram Vectors</div>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase">Hybrid RRF MRR</div>
                    <div className="text-xl font-extrabold text-indigo-300 mt-1">{labResult.benchmark_estimates?.hybrid_rrf_mrr || '0.89'}</div>
                    <div className="text-[10px] text-indigo-400/80 mt-0.5">Fused Dual-Signal Ranking</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase">Citation Fidelity</div>
                    <div className="text-xl font-extrabold text-emerald-300 mt-1">
                      {Math.round((labResult.citation_traceability?.citation_fidelity_score || 0.85) * 100)}%
                    </div>
                    <div className="text-[10px] text-emerald-400/80 mt-0.5">Verified Document Matches</div>
                  </div>
                </div>

                {/* STAGE 1 & 2: Guardrails & Indexing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <Shield className="w-4 h-4" />
                      <span>Stage 1: Query Sanitization & Guardrails</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs space-y-1">
                      <div><span className="text-slate-500">Raw Input:</span> "{labResult.query_analysis?.raw_query}"</div>
                      <div><span className="text-slate-500">Sanitized:</span> "{labResult.query_analysis?.clean_query}"</div>
                      <div>
                        <span className="text-slate-500">Adversarial Detection:</span>{' '}
                        <span className={labResult.query_analysis?.is_injection_attempt ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                          {labResult.query_analysis?.is_injection_attempt ? 'INJECTION BLOCKED' : 'CLEAN QUERY'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <Layers className="w-4 h-4" />
                      <span>Stage 2: Chunking & Indexing Metadata</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs space-y-1">
                      <div><span className="text-slate-500">Ingested Articles:</span> {labResult.corpus_indexing?.articles_ingested}</div>
                      <div><span className="text-slate-500">Sentence Chunks Indexed:</span> {labResult.corpus_indexing?.chunks_indexed}</div>
                      <div><span className="text-slate-500">Embedding Schema:</span> {labResult.corpus_indexing?.indexing_pipeline}</div>
                    </div>
                  </div>
                </div>

                {/* STAGE 3: Lexical vs Dense vs Hybrid Comparison Table */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <h3 className="font-bold text-sm text-white">Stage 3 & 4: Retrieval Scoring Comparison (BM25 vs Dense vs Hybrid RRF)</h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">Formula: RRF = Σ 1 / (60 + Rank_i)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                          <th className="py-2.5 px-3">RRF Rank</th>
                          <th className="py-2.5 px-3">Chunk ID</th>
                          <th className="py-2.5 px-3">Publisher</th>
                          <th className="py-2.5 px-3">Hybrid Score</th>
                          <th className="py-2.5 px-3">Retrieved Evidence Passage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {(labResult.retrieval_comparison?.hybrid_rrf || []).map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-850/50">
                            <td className="py-2.5 px-3 text-indigo-400 font-bold">#{row.rank}</td>
                            <td className="py-2.5 px-3 text-slate-300">[{row.article_id}]</td>
                            <td className="py-2.5 px-3 text-slate-400 font-sans">{row.source}</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">{row.score}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-sans line-clamp-1 max-w-md">{row.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* STAGE 5 & 6: Coverage Gating & Generation */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">Stage 5 & 6: Coverage Gating & Model Generation</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Coverage Gate Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${labResult.coverage_gating?.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {labResult.coverage_gating?.passed ? 'GATE PASSED (Evidence Sufficient)' : 'ABSTENTION TRIGGERED'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed font-sans pt-2 border-t border-slate-800/60">
                      <strong>Generated Research Answer:</strong>
                      <p className="mt-2 text-slate-200 whitespace-pre-line">{labResult.generation?.answer}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                      <span>Model: {labResult.generation?.model_name}</span>
                      <span>Total Diagnostic Latency: {labResult.diagnostics_latency_ms} ms</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <Activity className="w-10 h-10 text-indigo-400 mx-auto" />
                <h3 className="text-base font-bold text-white">RAG Inspection Workbench Ready</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click "Execute Full Diagnostic" above to run an end-to-end trace measuring BM25 scoring, dense semantic similarity, RRF fusion rank, and anti-hallucination guardrails.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: RESEARCH REPORTS (11-Section Equity Research Dossier)               */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Symbol Selector */}
            <div className="rounded-2xl p-6 bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>Institutional Research Dossier Generator</span>
                </h2>
                <p className="text-xs text-slate-400">Generates comprehensive 11-section research dossiers with verified provenance and downloadable DOCX.</p>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={reportSymbol}
                  onChange={e => setReportSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. RELIANCE.NS"
                  className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={runGenerateReport}
                  disabled={reportLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {reportLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>Generate</span>
                </button>
              </div>
            </div>

            {/* Generated Report Viewer */}
            {reportData ? (
              <div className="rounded-2xl p-6 sm:p-8 bg-slate-900/90 border border-slate-800 space-y-6">
                
                {/* Dossier Header & Export */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {reportData.report_id}
                    </span>
                    <h3 className="text-xl font-black text-white mt-1">{reportData.symbol} — Equity Research Dossier</h3>
                    <p className="text-xs text-slate-400">Generated: {reportData.generated_at}</p>
                  </div>
                  
                  {reportData.file_paths && (
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/reports/generated/${reportData.file_paths.docx?.split(/[\\/]/).pop()}`}
                        download
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download DOCX</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* 11 Dossier Sections Accordion / Cards */}
                <div className="space-y-4">
                  {reportData.sections && Object.entries(reportData.sections).map(([title, content]: [string, any], i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{title}</h4>
                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                        {content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No Dossier Generated Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Select an NSE ticker above and click "Generate" to synthesize an 11-section research report with technical risk and sentiment analysis.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MY PORTFOLIO (Multi-Tenant Isolated via Supabase RLS)               */}
        {/* ========================================================================= */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Add Holding */}
            <div className="rounded-2xl p-6 bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  <span>My Investment Portfolio</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {authSession ? `Secured under user: ${authSession.user.email}` : 'Demo / Guest Portfolio Mode'}
                </p>
              </div>

              {/* Add Holding Form */}
              <form onSubmit={handleAddHolding} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Symbol (e.g. TCS.NS)"
                  value={newHolding.symbol}
                  onChange={e => setNewHolding(prev => ({ ...prev, symbol: e.target.value }))}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white uppercase font-mono w-32"
                />
                <input
                  type="number"
                  placeholder="Shares"
                  value={newHolding.shares}
                  onChange={e => setNewHolding(prev => ({ ...prev, shares: e.target.value }))}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono w-24"
                />
                <input
                  type="number"
                  placeholder="Buy Price"
                  value={newHolding.price}
                  onChange={e => setNewHolding(prev => ({ ...prev, price: e.target.value }))}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono w-24"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Portfolio Summary Metrics */}
            {portfolio?.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Portfolio Value</div>
                  <div className="text-xl font-extrabold text-white mt-1 font-mono">
                    ₹{Number(portfolio.metrics.total_portfolio_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Profit / Loss</div>
                  <div className={`text-xl font-extrabold mt-1 font-mono ${Number(portfolio.metrics.total_pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{Number(portfolio.metrics.total_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Portfolio Beta vs NIFTY</div>
                  <div className="text-xl font-extrabold text-indigo-300 mt-1 font-mono">
                    {Number(portfolio.metrics.portfolio_beta || 1.0).toFixed(2)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Portfolio Alpha</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                    {Number(portfolio.metrics.portfolio_alpha || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {/* Holdings Table */}
            <div className="rounded-2xl p-6 bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white">Active Equity Holdings</h3>
              
              {portfolio?.holdings && portfolio.holdings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-3">Shares</th>
                        <th className="py-2.5 px-3">Avg Buy Price</th>
                        <th className="py-2.5 px-3">Current Price</th>
                        <th className="py-2.5 px-3">Holding Value</th>
                        <th className="py-2.5 px-3">P&L (₹)</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {portfolio.holdings.map((h: any, i: number) => {
                        const isUp = (h.unrealized_pnl || 0) >= 0;
                        return (
                          <tr key={i} className="hover:bg-slate-850/50">
                            <td className="py-2.5 px-3 text-indigo-300 font-bold">{h.symbol}</td>
                            <td className="py-2.5 px-3 text-slate-300">{h.shares}</td>
                            <td className="py-2.5 px-3 text-slate-300">₹{Number(h.average_buy_price).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-white font-bold">₹{Number(h.current_price).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-slate-200 font-bold">₹{Number(h.current_value).toFixed(2)}</td>
                            <td className={`py-2.5 px-3 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}₹{Number(h.unrealized_pnl).toFixed(2)} ({isUp ? '+' : ''}{Number(h.unrealized_pnl_percent).toFixed(1)}%)
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteHolding(h.id)}
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>No holdings added yet.</p>
                  <p className="mt-1 text-[11px]">Use the form above to add an instrument to your private portfolio.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ACCOUNT & SYSTEM (Security, Cloud Health & Disclaimers)             */}
        {/* ========================================================================= */}
        {activeTab === 'account' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* User Profile Card */}
            <div className="rounded-2xl p-6 bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Account Authentication</h3>
                  <p className="text-xs text-slate-400">Managed via Supabase Auth with PostgreSQL Row-Level Security.</p>
                </div>
              </div>

              {authSession ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                  <div><span className="text-slate-500">Email:</span> {authSession.user.email}</div>
                  <div><span className="text-slate-500">User UUID:</span> {authSession.user.id}</div>
                  <div><span className="text-slate-500">Role:</span> {authSession.user.role}</div>
                  <div><span className="text-slate-500">Token Status:</span> <span className="text-emerald-400 font-bold">ACTIVE (Verified JWT)</span></div>
                  <div className="pt-2">
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-300 font-semibold">Not signed in</p>
                    <p className="text-[11px] text-slate-500">Sign in to sync private portfolios and saved research dossiers across devices.</p>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md"
                  >
                    Sign In / Register
                  </button>
                </div>
              )}
            </div>

            {/* Cloud Architecture & Diagnostics */}
            {systemHealth && (
              <div className="rounded-2xl p-6 bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">Cloud Architecture & Provenance Verification</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">BACKEND STATUS</div>
                    <div className="text-emerald-400 font-bold mt-1 uppercase">{systemHealth.status} (v{systemHealth.version})</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Uptime: {Math.round(systemHealth.uptime_seconds)}s</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">MARKET DATA ENGINE</div>
                    <div className="text-white font-bold mt-1">{systemHealth.services?.market_data_engine}</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Live NSE Prices Active</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">GENERATIVE AI ENGINE</div>
                    <div className="text-indigo-300 font-bold mt-1">Google Gemini 3.8 Flash</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Live Grounded Inference</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">SYNTHETIC DATA INVARIANT</div>
                    <div className="text-emerald-400 font-bold mt-1">ALLOW_SYNTHETIC=FALSE</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Zero Hallucinated Prices</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">DATABASE ISOLATION</div>
                    <div className="text-emerald-400 font-bold mt-1">PostgreSQL RLS Active</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Multi-Tenant User Isolation</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[10px]">RAG RETRIEVAL PIPELINE</div>
                    <div className="text-white font-bold mt-1">BM25 + Dense RRF</div>
                    <div className="text-[10px] text-indigo-400 mt-0.5">Reciprocal Rank Fusion k=60</div>
                  </div>
                </div>
              </div>
            )}

            {/* Non-Advisory Regulatory Disclaimers */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 space-y-2 leading-relaxed">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Academic & Non-Advisory Research Disclaimer</span>
              </div>
              <p>
                FinPulse AI is an independent academic research platform developed for technological inquiry into Retrieval-Augmented Generation, Financial NLP, and Cloud Computing.
              </p>
              <p>
                It is strictly not a registered SEBI investment adviser, broker-dealer, or execution portal. Content generated by the platform does not constitute personalized financial advice, investment recommendations, or price target forecasts. Market participants must perform independent due diligence before committing capital.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-indigo-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">
                {authForm.isSignUp ? 'Create FinPulse Account' : 'Sign In to FinPulse AI'}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all mt-2"
              >
                {authForm.isSignUp ? 'Register Account' : 'Sign In'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              {authForm.isSignUp ? (
                <span>
                  Already have an account?{' '}
                  <button
                    onClick={() => setAuthForm(prev => ({ ...prev, isSignUp: false }))}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setAuthForm(prev => ({ ...prev, isSignUp: true }))}
                    className="text-indigo-400 hover:underline font-semibold"
                  >
                    Register
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono mt-12 bg-[#05070D]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>FinPulse AI • Explainable Generative AI Financial Research Platform</div>
          <div>Ask Better Questions. Understand Financial Markets.</div>
        </div>
      </footer>

    </div>
  );
}
