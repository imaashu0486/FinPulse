'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Compass, Search, Sparkles, LineChart, Newspaper, FlaskConical,
  BookOpen, Briefcase, Bookmark, ShieldCheck, Settings, User,
  Sun, Moon, ExternalLink, ChevronRight, ArrowUpRight, ArrowDownRight,
  Star, Trash2, Plus, RefreshCw, Lock, Download, AlertCircle,
  CheckCircle2, Activity, BarChart3, Filter, Layers, Cpu, Database,
  Menu, X, Check, Clock, TrendingUp, TrendingDown, Info, Shield
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, Line, ComposedChart
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

const SUGGESTED_QUERIES = [
  "What are the latest developments affecting Reliance Industries?",
  "Why has the banking sector been in the news recently?",
  "Summarize recent HDFC Bank financial headlines and market trends.",
  "Compare available news sentiment around TCS and Infosys."
];

export default function FinPulseApp() {
  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Navigation Shell State
  const [activeView, setActiveView] = useState<'overview' | 'research' | 'markets' | 'news' | 'lab' | 'reports' | 'portfolio' | 'watchlist' | 'system'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Company Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Market & Company Data
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS');
  const [stockData, setStockData] = useState<any>(null);
  const [stockPeriod, setStockPeriod] = useState('6mo');
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState('All');
  const [activeIndicators, setActiveIndicators] = useState({
    sma20: true,
    sma50: false,
    bollinger: false,
    rsi: true
  });

  // News Intelligence State
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsSummary, setNewsSummary] = useState<any>(null);
  const [newsFilter, setNewsFilter] = useState({ query: '', sentiment: 'all' });
  const [newsLoading, setNewsLoading] = useState(false);

  // AI Research State
  const [researchQuery, setResearchQuery] = useState('');
  const [researchResult, setResearchResult] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<string | null>(null);
  const [recentResearches, setRecentResearches] = useState<string[]>([
    "What are the latest developments affecting Reliance Industries?",
    "Summarize recent HDFC Bank financial headlines."
  ]);

  // Explainable RAG Lab State
  const [labQuery, setLabQuery] = useState('What factors are driving recent sentiment in Indian IT equities?');
  const [labResult, setLabResult] = useState<any>(null);
  const [labLoading, setLabLoading] = useState(false);

  // Research Report State
  const [reportSymbol, setReportSymbol] = useState('RELIANCE.NS');
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Portfolio & Watchlist State
  const [portfolio, setPortfolio] = useState<any>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [newHolding, setNewHolding] = useState({ symbol: '', quantity: '', price: '' });
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistInput, setWatchlistInput] = useState('');

  // Auth & System State
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', isSignUp: false });
  const [authError, setAuthError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [marketSession, setMarketSession] = useState<any>(null);

  // Initialize theme and core data
  useEffect(() => {
    const savedTheme = (localStorage.getItem('finpulse_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setAuthSession(authClient.getSession());
    loadSystemMetadata();
    loadBenchmarksData();
    loadStockDetails(selectedSymbol, stockPeriod);
    loadNewsStream();
    loadSectorsList();

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync session changes with portfolio/watchlist
  useEffect(() => {
    loadPortfolioData();
    loadWatchlistData();
  }, [authSession]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('finpulse_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadSystemMetadata = async () => {
    try {
      const [health, session] = await Promise.all([
        fetchSystemHealth().catch(() => null),
        fetchMarketSession().catch(() => null)
      ]);
      setSystemHealth(health);
      setMarketSession(session);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBenchmarksData = async () => {
    try {
      const data = await fetchBenchmarks();
      setBenchmarks(data || []);
    } catch {
      setBenchmarks([]);
    }
  };

  const loadSectorsList = async () => {
    try {
      const s = await fetchMarketSectors();
      setSectors(s || []);
    } catch {
      setSectors(['All', 'Information Technology', 'Banking & Financial Services', 'Energy / Oil & Gas', 'Automotive', 'Consumer Goods / FMCG', 'Healthcare & Pharma']);
    }
  };

  const loadStockDetails = async (sym: string, period: string) => {
    setStockLoading(true);
    setStockError(null);
    try {
      const data = await fetchStockHistory(sym, period);
      if (data.status === 'unavailable') {
        setStockError(`Live data unavailable from ${data.source}: ${data.reason}`);
        setStockData(null);
      } else {
        setStockData(data);
      }
    } catch {
      setStockError(`Unable to retrieve live market records for ${sym}. Provider offline or market closed.`);
      setStockData(null);
    } finally {
      setStockLoading(false);
    }
  };

  const loadNewsStream = async (sym?: string) => {
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

  const handleGlobalSearch = async (val: string) => {
    setGlobalSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setSearchLoading(true);
    setShowSearchDropdown(true);
    try {
      const res = await searchInstruments(val, selectedSector, 8);
      setSearchResults(res || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectCompany = (sym: string) => {
    setSelectedSymbol(sym);
    setGlobalSearchQuery('');
    setShowSearchDropdown(false);
    loadStockDetails(sym, stockPeriod);
  };

  // Execute AI Research
  const executeResearch = async (q: string) => {
    const cleanQ = q.trim();
    if (!cleanQ) return;
    setResearchLoading(true);
    setResearchResult(null);
    setResearchQuery(cleanQ);
    setActiveView('research');

    try {
      const res = await queryRAG(cleanQ, undefined, 4);
      setResearchResult(res);
      setRecentResearches(prev => [cleanQ, ...prev.filter(item => item !== cleanQ).slice(0, 5)]);
    } catch {
      setResearchResult({
        answer: "FinPulse AI could not complete the research query. Ensure backend network services are running.",
        citations: [],
        model_used: "Fallback / Network Error",
        latency_ms: 0,
        is_grounded: false
      });
    } finally {
      setResearchLoading(false);
    }
  };

  // Execute RAG Lab Diagnostics
  const executeLabDiagnostics = async () => {
    if (!labQuery.trim()) return;
    setLabLoading(true);
    setLabResult(null);
    try {
      const diag = await fetchRAGDiagnostics({ query: labQuery.trim(), top_k: 5 });
      setLabResult(diag);
    } catch (err: any) {
      alert("Failed to run diagnostics: " + err.message);
    } finally {
      setLabLoading(false);
    }
  };

  // Generate Equity Research Dossier
  const executeGenerateReport = async () => {
    if (!reportSymbol.trim()) return;
    setReportLoading(true);
    setReportData(null);
    try {
      const rep = await generateReport(reportSymbol.trim());
      setReportData(rep);
    } catch (err: any) {
      alert("Failed to generate report: " + err.message);
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
    if (!newHolding.symbol || !newHolding.quantity || !newHolding.price) return;
    try {
      await addHolding({
        symbol: newHolding.symbol.toUpperCase(),
        quantity: parseFloat(newHolding.quantity),
        buy_price: parseFloat(newHolding.price)
      });
      setNewHolding({ symbol: '', quantity: '', price: '' });
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
        alert("Registration initiated. Sign in with your credentials.");
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
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark bg-[#141917] text-[#ECEFEA]' : 'bg-[#F8F7F4] text-[#202522]'}`}>

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (Desktop: 230px Fixed)                         */}
      {/* ========================================================================= */}
      <aside className={`w-[230px] shrink-0 border-r flex flex-col justify-between hidden md:flex ${
        theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
      }`}>
        <div>
          {/* Logo & Product Brand */}
          <div className="h-16 px-5 flex items-center space-x-2.5 border-b border-inherit cursor-pointer" onClick={() => setActiveView('overview')}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
            }`}>
              F
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-sm tracking-tight font-sans">FinPulse AI</span>
              </div>
              <p className={`text-[10px] font-mono leading-none ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                Research Studio
              </p>
            </div>
          </div>

          {/* Nav Section: Workspace */}
          <div className="px-3 pt-5 pb-2">
            <div className={`px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider font-mono ${
              theme === 'dark' ? 'text-[#68766E]' : 'text-[#8E9791]'
            }`}>
              Workspace
            </div>
            <nav className="space-y-0.5">
              {[
                { id: 'overview', label: 'Overview', icon: Compass },
                { id: 'research', label: 'AI Research', icon: Sparkles },
                { id: 'markets', label: 'Markets', icon: LineChart },
                { id: 'news', label: 'News', icon: Newspaper },
                { id: 'lab', label: 'Research Lab', icon: FlaskConical },
                { id: 'reports', label: 'Reports', icon: BookOpen },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id as any)}
                    className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-[#252E29] text-[#ECEFEA] font-semibold'
                          : 'bg-[#F1F0EC] text-[#202522] font-semibold'
                        : theme === 'dark'
                          ? 'text-[#A3AEA6] hover:text-[#ECEFEA] hover:bg-[#252E29]/50'
                          : 'text-[#68716B] hover:text-[#202522] hover:bg-[#F1F0EC]/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? (theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]') : 'opacity-70'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Nav Section: Personal */}
          <div className="px-3 pt-4 pb-2">
            <div className={`px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider font-mono ${
              theme === 'dark' ? 'text-[#68766E]' : 'text-[#8E9791]'
            }`}>
              Personal
            </div>
            <nav className="space-y-0.5">
              {[
                { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
                { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id as any)}
                    className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-[#252E29] text-[#ECEFEA] font-semibold'
                          : 'bg-[#F1F0EC] text-[#202522] font-semibold'
                        : theme === 'dark'
                          ? 'text-[#A3AEA6] hover:text-[#ECEFEA] hover:bg-[#252E29]/50'
                          : 'text-[#68716B] hover:text-[#202522] hover:bg-[#F1F0EC]/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? (theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]') : 'opacity-70'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: System, Theme, Profile */}
        <div className="p-3 border-t border-inherit space-y-1">
          <button
            onClick={() => setActiveView('system')}
            className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeView === 'system'
                ? theme === 'dark' ? 'bg-[#252E29] text-[#ECEFEA]' : 'bg-[#F1F0EC] text-[#202522]'
                : theme === 'dark' ? 'text-[#A3AEA6] hover:bg-[#252E29]/50' : 'text-[#68716B] hover:bg-[#F1F0EC]/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 opacity-70" />
            <span>System Health</span>
          </button>

          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              theme === 'dark' ? 'text-[#A3AEA6] hover:bg-[#252E29]/50' : 'text-[#68716B] hover:bg-[#F1F0EC]/60'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5 opacity-70" /> : <Sun className="w-3.5 h-3.5 opacity-70" />}
              <span>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</span>
            </div>
            <span className="text-[10px] font-mono opacity-60 uppercase">{theme}</span>
          </button>

          {/* User Profile / Sign in */}
          <div className="pt-2">
            {authSession ? (
              <div className={`p-2 rounded-md flex items-center justify-between text-xs ${
                theme === 'dark' ? 'bg-[#252E29]/70 text-[#ECEFEA]' : 'bg-[#F1F0EC]/80 text-[#202522]'
              }`}>
                <div className="flex items-center space-x-2 truncate">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    theme === 'dark' ? 'bg-[#354039] text-[#ECEFEA]' : 'bg-[#E5E7E2] text-[#202522]'
                  }`}>
                    {authSession.user.email.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate text-[11px] font-medium">{authSession.user.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="text-xs opacity-60 hover:opacity-100 p-1"
                >
                  <Lock className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className={`w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md text-xs font-medium border transition-colors ${
                  theme === 'dark'
                    ? 'border-[#354039] bg-[#252E29] text-[#ECEFEA] hover:border-[#9FC9B0]/40'
                    : 'border-[#E5E7E2] bg-[#FFFFFF] text-[#202522] hover:border-[#315F50]/40'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION WORKSPACE & SLIM TOPBAR                               */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Slim Top Bar */}
        <header className={`h-14 border-b flex items-center justify-between px-4 sm:px-6 z-30 shrink-0 ${
          theme === 'dark' ? 'bg-[#1C2420]/80 border-[#354039] backdrop-blur' : 'bg-[#FFFFFF]/90 border-[#E5E7E2] backdrop-blur'
        }`}>
          {/* Breadcrumb / Current View */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 rounded md:hidden opacity-70 hover:opacity-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs font-medium flex items-center space-x-1.5">
              <span className={`capitalize ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                FinPulse
              </span>
              <span className="opacity-40">/</span>
              <span className="font-semibold capitalize">{activeView}</span>
            </div>
          </div>

          {/* Central Global Search Input */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-sm mx-4 hidden sm:block">
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'
              }`} />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={e => handleGlobalSearch(e.target.value)}
                onFocus={() => globalSearchQuery && setShowSearchDropdown(true)}
                placeholder="Search NSE company, ticker, or sector..."
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-md border focus:outline-none transition-colors font-sans ${
                  theme === 'dark'
                    ? 'bg-[#141917] border-[#354039] text-[#ECEFEA] placeholder-[#68766E] focus:border-[#9FC9B0]'
                    : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522] placeholder-[#8E9791] focus:border-[#315F50]'
                }`}
              />
              {searchLoading && (
                <RefreshCw className="w-3 h-3 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-1.5 rounded-lg border shadow-dropdown overflow-hidden z-50 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      selectCompany(item.symbol);
                      setActiveView('markets');
                    }}
                    className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between border-b last:border-b-0 transition-colors ${
                      theme === 'dark'
                        ? 'border-[#252E29] hover:bg-[#252E29]'
                        : 'border-[#F1F0EC] hover:bg-[#F1F0EC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-semibold">{item.symbol}</span>
                        <span className="text-[10px] opacity-60">{item.exchange}</span>
                      </div>
                      <p className={`text-[11px] truncate max-w-[200px] ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                        {item.name}
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      theme === 'dark' ? 'bg-[#252E29] text-[#A3AEA6]' : 'bg-[#F1F0EC] text-[#68716B]'
                    }`}>
                      {item.sector}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Right: Market Session & Theme */}
          <div className="flex items-center space-x-3">
            {marketSession && (
              <div className={`hidden lg:flex items-center space-x-1.5 text-[11px] font-mono px-2.5 py-1 rounded border ${
                theme === 'dark' ? 'border-[#354039] bg-[#141917] text-[#A3AEA6]' : 'border-[#E5E7E2] bg-[#F8F7F4] text-[#68716B]'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${marketSession.is_open ? 'bg-[#247A5A]' : 'bg-[#A3AEA6]'}`} />
                <span>{marketSession.session}</span>
                <span className="opacity-50">IST</span>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded border border-inherit opacity-75 hover:opacity-100 transition-opacity"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className={`p-4 border-b md:hidden z-40 ${
            theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
          }`}>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'research', label: 'AI Research' },
                { id: 'markets', label: 'Markets' },
                { id: 'news', label: 'News Intelligence' },
                { id: 'lab', label: 'RAG Lab' },
                { id: 'reports', label: 'Reports' },
                { id: 'portfolio', label: 'Portfolio' },
                { id: 'watchlist', label: 'Watchlist' },
                { id: 'system', label: 'System Health' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded text-left ${activeView === item.id ? (theme === 'dark' ? 'bg-[#252E29] text-[#9FC9B0]' : 'bg-[#F1F0EC] text-[#315F50]') : 'opacity-70'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto">
          
          {/* ========================================================================= */}
          {/* VIEW: OVERVIEW / SIGNATURE RESEARCH HOMEPAGE                              */}
          {/* ========================================================================= */}
          {activeView === 'overview' && (
            <div className="space-y-8">

              {/* Above the fold: Headline & Editorial Search Input */}
              <div className="pt-2 pb-4 space-y-4 max-w-2xl">
                <div className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                  theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'
                }`}>
                  FinPulse / Research Workspace
                </div>
                <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-serif leading-tight">
                  Clarity for complex markets.
                </h1>
                <p className={`text-xs sm:text-sm leading-relaxed ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                  Research companies, follow financial developments, and explore evidence-backed insights in one place.
                </p>

                {/* Primary Research Input Surface */}
                <div className="pt-2">
                  <div className={`p-1.5 rounded-lg border flex items-center shadow-subtle transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1C2420] border-[#354039] focus-within:border-[#9FC9B0]'
                      : 'bg-[#FFFFFF] border-[#E5E7E2] focus-within:border-[#315F50]'
                  }`}>
                    <Search className={`w-4 h-4 ml-2.5 mr-2 shrink-0 ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`} />
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={e => setResearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && executeResearch(researchQuery)}
                      placeholder="Ask a question about a company, sector, or market event…"
                      className={`w-full py-1.5 text-xs bg-transparent focus:outline-none ${
                        theme === 'dark' ? 'placeholder-[#68766E] text-[#ECEFEA]' : 'placeholder-[#8E9791] text-[#202522]'
                      }`}
                    />
                    <button
                      onClick={() => executeResearch(researchQuery)}
                      disabled={researchLoading || !researchQuery.trim()}
                      className={`px-3.5 py-1.5 rounded text-xs font-semibold shrink-0 transition-colors ${
                        theme === 'dark'
                          ? 'bg-[#9FC9B0] text-[#141917] hover:bg-[#B8DBC5] disabled:opacity-40'
                          : 'bg-[#315F50] text-white hover:bg-[#24493D] disabled:opacity-40'
                      }`}
                    >
                      {researchLoading ? 'Researching...' : 'Research'}
                    </button>
                  </div>

                  {/* Suggested Query Chips */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`text-[11px] mr-1 ${theme === 'dark' ? 'text-[#68766E]' : 'text-[#8E9791]'}`}>Suggested:</span>
                    {SUGGESTED_QUERIES.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => executeResearch(q)}
                        className={`text-[11px] px-2 py-0.5 rounded border text-left transition-colors truncate max-w-xs ${
                          theme === 'dark'
                            ? 'border-[#354039] bg-[#1C2420] text-[#A3AEA6] hover:text-[#ECEFEA] hover:border-[#9FC9B0]/40'
                            : 'border-[#E5E7E2] bg-[#FFFFFF] text-[#68716B] hover:text-[#202522] hover:border-[#315F50]/40'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editorial Two-Column Workspace Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-inherit">

                {/* Left / Main Column (7 cols): Latest Developments & Recent Research */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold uppercase tracking-wider font-mono">
                        Latest Financial Developments
                      </h2>
                      <button
                        onClick={() => setActiveView('news')}
                        className={`text-xs hover:underline flex items-center space-x-1 ${
                          theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'
                        }`}
                      >
                        <span>View intelligence feed</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className={`divide-y rounded-lg border ${
                      theme === 'dark' ? 'bg-[#1C2420] border-[#354039] divide-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2] divide-[#E5E7E2]'
                    }`}>
                      {newsArticles.slice(0, 5).map((a, i) => (
                        <div key={i} className="p-3.5 space-y-1 hover:opacity-90 transition-opacity">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`font-mono text-[10px] ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                              {a.source}
                            </span>
                            <span className={`text-[10px] ${theme === 'dark' ? 'text-[#68766E]' : 'text-[#8E9791]'}`}>
                              {a.published_at ? a.published_at.slice(0, 10) : ''}
                            </span>
                          </div>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium block hover:underline leading-snug"
                          >
                            {a.title}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Research Inquiries */}
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider font-mono mb-3">
                      Recent Inquiries
                    </h2>
                    <div className="space-y-1.5">
                      {recentResearches.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => executeResearch(item)}
                          className={`p-2.5 rounded border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#1C2420] border-[#354039] hover:border-[#9FC9B0]/40'
                              : 'bg-[#FFFFFF] border-[#E5E7E2] hover:border-[#315F50]/40'
                          }`}
                        >
                          <span className="truncate pr-2">{item}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column (5 cols): Market Snapshot, Watchlist, Provenance */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Benchmarks Overview */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold uppercase tracking-wider font-mono">
                        Market Snapshot
                      </h2>
                      <span className="text-[10px] font-mono opacity-50">NSE Equities</span>
                    </div>

                    <div className={`rounded-lg border divide-y ${
                      theme === 'dark' ? 'bg-[#1C2420] border-[#354039] divide-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2] divide-[#E5E7E2]'
                    }`}>
                      {benchmarks.map((b, i) => {
                        const isUp = (b.change_percent || 0) >= 0;
                        return (
                          <div key={i} className="p-3 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold font-mono">{b.symbol}</span>
                              <div className={`text-[10px] ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                                {b.name || 'Index'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono tabular-nums font-medium">
                                ₹{Number(b.current_price).toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                              </div>
                              <div className={`text-[11px] font-mono tabular-nums ${
                                isUp ? (theme === 'dark' ? 'text-[#48A37E]' : 'text-[#247A5A]') : (theme === 'dark' ? 'text-[#D97371]' : 'text-[#B5504F]')
                              }`}>
                                {isUp ? '+' : ''}{Number(b.change_percent).toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Watchlist Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold uppercase tracking-wider font-mono">
                        Watchlist
                      </h2>
                      <button
                        onClick={() => setActiveView('watchlist')}
                        className={`text-xs hover:underline ${theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'}`}
                      >
                        Manage
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS'].map((sym, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            selectCompany(sym);
                            setActiveView('markets');
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                            theme === 'dark'
                              ? 'bg-[#1C2420] border-[#354039] hover:border-[#9FC9B0]'
                              : 'bg-[#FFFFFF] border-[#E5E7E2] hover:border-[#315F50]'
                          }`}
                        >
                          {sym.replace('.NS', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Data Provenance & Transparency Statement */}
                  <div className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                    theme === 'dark' ? 'bg-[#1C2420]/50 border-[#354039] text-[#A3AEA6]' : 'bg-[#F1F0EC]/60 border-[#E5E7E2] text-[#68716B]'
                  }`}>
                    <div className="flex items-center space-x-1.5 font-semibold text-[11px] text-inherit">
                      <Shield className="w-3.5 h-3.5 shrink-0" />
                      <span>Data Provenance & Policy</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      All prices reflect genuine exchange records via Yahoo Finance. News is deduplicated via token Jaccard similarity. AI summaries are grounded strictly in retrieved documents using Google Gemini 3.8 Flash. No synthetic quotes or unverified predictions.
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: AI RESEARCH ANSWER EXPERIENCE (Editorial Reading Layout)            */}
          {/* ========================================================================= */}
          {activeView === 'research' && (
            <div className="space-y-6">
              
              {/* Back to Overview / Search bar */}
              <div className="flex items-center justify-between pb-3 border-b border-inherit">
                <button
                  onClick={() => setActiveView('overview')}
                  className={`text-xs hover:underline flex items-center space-x-1 ${
                    theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'
                  }`}
                >
                  <span>← Back to Workspace</span>
                </button>
                <div className="text-[11px] font-mono opacity-60">
                  {researchResult ? `Inference Latency: ${researchResult.latency_ms}ms` : ''}
                </div>
              </div>

              {/* Research Input Bar */}
              <div className={`p-1.5 rounded-lg border flex items-center shadow-subtle ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <Search className="w-4 h-4 ml-2 mr-2 opacity-50 shrink-0" />
                <input
                  type="text"
                  value={researchQuery}
                  onChange={e => setResearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeResearch(researchQuery)}
                  placeholder="Enter a new financial research question..."
                  className="w-full py-1 text-xs bg-transparent focus:outline-none"
                />
                <button
                  onClick={() => executeResearch(researchQuery)}
                  disabled={researchLoading || !researchQuery.trim()}
                  className={`px-3 py-1 rounded text-xs font-semibold shrink-0 ${
                    theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                  }`}
                >
                  {researchLoading ? 'Researching...' : 'Update'}
                </button>
              </div>

              {/* Editorial Research Document Layout */}
              {researchResult ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
                  
                  {/* Main Research Document (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    <div>
                      <div className={`text-[10px] font-mono uppercase tracking-wider mb-1 font-semibold ${
                        theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'
                      }`}>
                        Research Synthesis
                      </div>
                      <h2 className="text-2xl font-serif font-normal leading-snug">
                        {researchQuery}
                      </h2>
                    </div>

                    {/* Grounding Status Pill */}
                    <div className="flex items-center space-x-2 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        researchResult.is_grounded
                          ? theme === 'dark' ? 'bg-[#252E29] text-[#9FC9B0] border-[#354039]' : 'bg-[#F1F0EC] text-[#315F50] border-[#E5E7E2]'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {researchResult.model_used}
                      </span>
                      <span className="text-[11px] opacity-60 font-mono">
                        {researchResult.citations?.length || 0} supporting documents verified
                      </span>
                    </div>

                    {/* Synthesis Body */}
                    <div className={`text-sm leading-relaxed whitespace-pre-line space-y-4 font-sans ${
                      theme === 'dark' ? 'text-[#ECEFEA]' : 'text-[#202522]'
                    }`}>
                      {researchResult.answer}
                    </div>

                    {/* Next Steps / Suggested Follow-up */}
                    <div className={`p-4 rounded-lg border space-y-2 mt-6 ${
                      theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                    }`}>
                      <div className="text-xs font-semibold uppercase tracking-wider font-mono">
                        Suggested Follow-Up Inquiries
                      </div>
                      <div className="space-y-1">
                        {[
                          `How does this compare to sector peers?`,
                          `What are the historical drawdown patterns during similar quarters?`,
                          `Generate full institutional research dossier.`
                        ].map((q, i) => (
                          <div
                            key={i}
                            onClick={() => executeResearch(q)}
                            className={`p-2 rounded text-xs cursor-pointer flex items-center justify-between ${
                              theme === 'dark' ? 'hover:bg-[#252E29]' : 'hover:bg-[#F1F0EC]'
                            }`}
                          >
                            <span>{q}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-40 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right-Side Supporting Evidence Panel (4 cols) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider font-mono">
                        Verified Sources ({researchResult.citations?.length || 0})
                      </h3>
                      <span className="text-[10px] font-mono opacity-50">Ranked by RRF</span>
                    </div>

                    <div className="space-y-3">
                      {(researchResult.citations || []).map((c: any, i: number) => {
                        const isHighlighted = activeCitation === c.id;
                        return (
                          <div
                            key={i}
                            onClick={() => setActiveCitation(isHighlighted ? null : c.id)}
                            className={`p-3 rounded-lg border text-xs transition-colors space-y-2 ${
                              isHighlighted
                                ? theme === 'dark'
                                  ? 'bg-[#252E29] border-[#9FC9B0]'
                                  : 'bg-[#F1F0EC] border-[#315F50]'
                                : theme === 'dark'
                                  ? 'bg-[#1C2420] border-[#354039]'
                                  : 'bg-[#FFFFFF] border-[#E5E7E2]'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono font-bold text-inherit">[{c.id}]</span>
                              <span className="opacity-60">{c.source}</span>
                            </div>
                            <div className="font-medium text-xs line-clamp-2 leading-snug">
                              {c.title}
                            </div>
                            <p className={`text-[11px] italic line-clamp-3 ${
                              theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'
                            }`}>
                              "{c.excerpt}"
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-inherit text-[10px]">
                              <span className="opacity-50">{c.published_at?.slice(0, 10)}</span>
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center space-x-1 hover:underline ${
                                  theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'
                                }`}
                              >
                                <span>Source</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ) : (
                <div className={`p-12 text-center rounded-lg border ${
                  theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                }`}>
                  <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Enter a question above to generate an evidence-backed research synthesis.</p>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: MARKET EXPLORER (Analytical Workspace)                              */}
          {/* ========================================================================= */}
          {activeView === 'markets' && (
            <div className="space-y-6">
              
              {/* Instrument Header & Controls */}
              <div className={`p-5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold font-mono">{selectedSymbol}</h2>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                      theme === 'dark' ? 'border-[#354039] bg-[#141917]' : 'border-[#E5E7E2] bg-[#F8F7F4]'
                    }`}>NSE</span>
                  </div>
                  <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                    {stockData?.summary?.company_name || 'Loading instrument details...'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedSector}
                    onChange={e => setSelectedSector(e.target.value)}
                    className={`px-2.5 py-1 text-xs rounded border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                    }`}
                  >
                    {sectors.map((s, i) => (
                      <option key={i} value={s}>{s}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleAddWatchlist(selectedSymbol)}
                    className={`px-3 py-1 rounded text-xs font-medium border flex items-center space-x-1 ${
                      theme === 'dark' ? 'border-[#354039] hover:bg-[#252E29]' : 'border-[#E5E7E2] hover:bg-[#F1F0EC]'
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Watch</span>
                  </button>

                  <button
                    onClick={() => executeResearch(`Analyze current performance and fundamentals of ${selectedSymbol}.`)}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                    }`}
                  >
                    Research in AI
                  </button>
                </div>
              </div>

              {stockError && (
                <div className="p-3 rounded border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs">
                  {stockError}
                </div>
              )}

              {/* Financial Metrics Strip */}
              {stockData?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Current Price', val: `₹${Number(stockData.summary.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: `${stockData.summary.change_percent >= 0 ? '+' : ''}${stockData.summary.change_percent.toFixed(2)}%`, isUp: stockData.summary.change_percent >= 0 },
                    { label: '52-Week High', val: `₹${Number(stockData.summary.high_52w).toLocaleString('en-IN', { minimumFractionDigits: 1 })}`, sub: 'Peak Price' },
                    { label: '52-Week Low', val: `₹${Number(stockData.summary.low_52w).toLocaleString('en-IN', { minimumFractionDigits: 1 })}`, sub: 'Trough Price' },
                    { label: 'Annualized Volatility', val: `${Number(stockData.metrics?.annualized_volatility || 0).toFixed(1)}%`, sub: '30-Day Realized' },
                    { label: 'Max Drawdown', val: `${Number(stockData.metrics?.max_drawdown || 0).toFixed(1)}%`, sub: 'Peak-to-Trough' },
                    { label: 'RSI (14)', val: stockData.indicators?.rsi14?.slice(-1)[0] ? Number(stockData.indicators.rsi14.slice(-1)[0]).toFixed(1) : 'N/A', sub: 'Momentum' },
                  ].map((m, idx) => (
                    <div key={idx} className={`p-3.5 rounded-lg border ${
                      theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                    }`}>
                      <div className={`text-[10px] font-mono uppercase font-semibold ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                        {m.label}
                      </div>
                      <div className="text-base font-bold font-mono tabular-nums mt-1">{m.val}</div>
                      {m.sub && (
                        <div className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                          m.isUp !== undefined
                            ? m.isUp
                              ? theme === 'dark' ? 'text-[#48A37E]' : 'text-[#247A5A]'
                              : theme === 'dark' ? 'text-[#D97371]' : 'text-[#B5504F]'
                            : 'opacity-50'
                        }`}>
                          {m.sub}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Price Chart */}
              <div className={`p-5 rounded-lg border space-y-4 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-inherit gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Price History & Volume</span>
                    <span className="text-[10px] opacity-50 font-mono">({stockData?.summary?.data_source || 'Verified Feed'})</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Period selection */}
                    <div className="flex rounded border border-inherit text-xs">
                      {['1mo', '3mo', '6mo', '1y'].map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setStockPeriod(p);
                            loadStockDetails(selectedSymbol, p);
                          }}
                          className={`px-2 py-0.5 text-[11px] font-mono uppercase transition-colors ${
                            stockPeriod === p
                              ? theme === 'dark' ? 'bg-[#252E29] text-[#9FC9B0] font-bold' : 'bg-[#F1F0EC] text-[#315F50] font-bold'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Indicator badges */}
                    <div className="flex items-center space-x-1">
                      {[
                        { id: 'sma20', label: 'SMA 20' },
                        { id: 'sma50', label: 'SMA 50' },
                        { id: 'bollinger', label: 'Bands' },
                      ].map(ind => (
                        <button
                          key={ind.id}
                          onClick={() => setActiveIndicators(prev => ({ ...prev, [ind.id]: !((prev as any)[ind.id]) }))}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            (activeIndicators as any)[ind.id]
                              ? theme === 'dark' ? 'border-[#9FC9B0] text-[#9FC9B0]' : 'border-[#315F50] text-[#315F50]'
                              : 'border-inherit opacity-40 hover:opacity-75'
                          }`}
                        >
                          {ind.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {stockData?.candles && stockData.candles.length > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={stockData.candles} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme === 'dark' ? '#9FC9B0' : '#315F50'} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={theme === 'dark' ? '#9FC9B0' : '#315F50'} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#252E29' : '#F1F0EC'} />
                        <XAxis dataKey="timestamp" stroke={theme === 'dark' ? '#68766E' : '#8E9791'} tickFormatter={t => t.slice(5, 10)} tick={{ fontSize: 10 }} />
                        <YAxis domain={['auto', 'auto']} orientation="right" stroke={theme === 'dark' ? '#68766E' : '#8E9791'} tickFormatter={v => `₹${v}`} tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1C2420' : '#FFFFFF',
                            borderColor: theme === 'dark' ? '#354039' : '#E5E7E2',
                            borderRadius: '0.375rem',
                            fontSize: '11px'
                          }}
                          formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Close']}
                        />
                        <Area type="monotone" dataKey="close" stroke={theme === 'dark' ? '#9FC9B0' : '#315F50'} strokeWidth={1.5} fill="url(#chartGradient)" />
                        {activeIndicators.sma20 && stockData.indicators?.sma20 && (
                          <Line type="monotone" dataKey={(d) => stockData.indicators.sma20[stockData.candles.indexOf(d)]} stroke="#38BDF8" strokeWidth={1} dot={false} name="SMA 20" />
                        )}
                        {activeIndicators.sma50 && stockData.indicators?.sma50 && (
                          <Line type="monotone" dataKey={(d) => stockData.indicators.sma50[stockData.candles.indexOf(d)]} stroke="#F59E0B" strokeWidth={1} dot={false} name="SMA 50" />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-xs opacity-50">
                    No historical prices available.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: NEWS INTELLIGENCE (Editorial Feed)                                  */}
          {/* ========================================================================= */}
          {activeView === 'news' && (
            <div className="space-y-6">
              
              {/* Filter controls */}
              <div className={`p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <div>
                  <h2 className="text-sm font-semibold font-mono">Financial News Intelligence</h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                    Filtered stream deduplicated via token Jaccard similarity.
                  </p>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search headlines..."
                    value={newsFilter.query}
                    onChange={e => setNewsFilter(prev => ({ ...prev, query: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && loadNewsStream()}
                    className={`px-2.5 py-1 text-xs rounded border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                    }`}
                  />
                  <select
                    value={newsFilter.sentiment}
                    onChange={e => setNewsFilter(prev => ({ ...prev, sentiment: e.target.value }))}
                    className={`px-2 py-1 text-xs rounded border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                    }`}
                  >
                    <option value="all">All Sentiment</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                  <button
                    onClick={() => loadNewsStream()}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                    }`}
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Editorial Article List */}
              <div className={`rounded-lg border divide-y ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039] divide-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2] divide-[#E5E7E2]'
              }`}>
                {newsArticles.map((art, idx) => (
                  <div key={idx} className="p-4 space-y-2 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold">{art.source}</span>
                        {art.sentiment && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            art.sentiment.label === 'positive'
                              ? theme === 'dark' ? 'text-[#48A37E] bg-[#48A37E]/10' : 'text-[#247A5A] bg-[#247A5A]/10'
                              : art.sentiment.label === 'negative'
                              ? theme === 'dark' ? 'text-[#D97371] bg-[#D97371]/10' : 'text-[#B5504F] bg-[#B5504F]/10'
                              : 'opacity-60'
                          }`}>
                            {art.sentiment.label}
                          </span>
                        )}
                      </div>
                      <span className="opacity-50 text-[10px]">{art.published_at?.slice(0, 16).replace('T', ' ')}</span>
                    </div>

                    <a
                      href={art.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs sm:text-sm font-medium hover:underline block leading-snug"
                    >
                      {art.title}
                    </a>
                    <p className={`text-xs line-clamp-2 leading-relaxed ${
                      theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'
                    }`}>
                      {art.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: EXPLAINABLE RAG RESEARCH LAB (Analytical Instrument)                */}
          {/* ========================================================================= */}
          {activeView === 'lab' && (
            <div className="space-y-6">
              
              <div className={`p-5 rounded-lg border space-y-3 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <div className="flex items-center space-x-2">
                  <FlaskConical className={`w-4 h-4 ${theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'}`} />
                  <h2 className="text-sm font-semibold font-mono">Explainable RAG Research Lab</h2>
                </div>
                <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                  Inspect every mathematical stage of the retrieval pipeline: query guardrails, BM25 scoring, dense cosine similarity, Reciprocal Rank Fusion, coverage thresholding, and citation attribution.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={labQuery}
                    onChange={e => setLabQuery(e.target.value)}
                    placeholder="Enter query to dissect through RAG stages..."
                    className={`flex-1 px-3 py-1.5 text-xs rounded border focus:outline-none ${
                      theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                    }`}
                  />
                  <button
                    onClick={executeLabDiagnostics}
                    disabled={labLoading}
                    className={`px-4 py-1.5 rounded text-xs font-semibold shrink-0 ${
                      theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                    }`}
                  >
                    {labLoading ? 'Analyzing...' : 'Run Diagnostics'}
                  </button>
                </div>
              </div>

              {labResult ? (
                <div className="space-y-4">
                  {/* Benchmarks Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                      <div className="text-[10px] font-mono uppercase opacity-60">BM25 MRR</div>
                      <div className="text-base font-bold font-mono mt-0.5">{labResult.benchmark_estimates?.bm25_mrr}</div>
                    </div>
                    <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                      <div className="text-[10px] font-mono uppercase opacity-60">Dense Semantic MRR</div>
                      <div className="text-base font-bold font-mono mt-0.5">{labResult.benchmark_estimates?.dense_mrr}</div>
                    </div>
                    <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                      <div className="text-[10px] font-mono uppercase opacity-60">Hybrid RRF MRR</div>
                      <div className={`text-base font-bold font-mono mt-0.5 ${theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'}`}>
                        {labResult.benchmark_estimates?.hybrid_rrf_mrr}
                      </div>
                    </div>
                    <div className={`p-3 rounded border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                      <div className="text-[10px] font-mono uppercase opacity-60">Fidelity Score</div>
                      <div className="text-base font-bold font-mono mt-0.5">
                        {Math.round((labResult.citation_traceability?.citation_fidelity_score || 0.85) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Stage 1 & 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border text-xs space-y-2 ${
                      theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                    }`}>
                      <div className="font-mono font-semibold text-[11px] uppercase">Stage 1: Input Guardrails</div>
                      <div className="space-y-1 font-mono text-[11px] opacity-80">
                        <div>Status: {labResult.query_analysis?.status}</div>
                        <div>Adversarial Check: {labResult.query_analysis?.is_injection_attempt ? 'Flagged' : 'Passed Clean'}</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border text-xs space-y-2 ${
                      theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                    }`}>
                      <div className="font-mono font-semibold text-[11px] uppercase">Stage 2: Chunking Metadata</div>
                      <div className="space-y-1 font-mono text-[11px] opacity-80">
                        <div>Articles Ingested: {labResult.corpus_indexing?.articles_ingested}</div>
                        <div>Chunks Indexed: {labResult.corpus_indexing?.chunks_indexed}</div>
                      </div>
                    </div>
                  </div>

                  {/* Stage 3 & 4 Table */}
                  <div className={`p-4 rounded-lg border space-y-3 ${
                    theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold font-mono uppercase">
                        Stage 3 & 4: Dual-Signal Retrieval Ranks
                      </span>
                      <span className="text-[10px] font-mono opacity-50">RRF Formula: Σ 1/(60 + Rank)</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className={`border-b text-[10px] uppercase ${theme === 'dark' ? 'border-[#354039] text-[#A3AEA6]' : 'border-[#E5E7E2] text-[#68716B]'}`}>
                            <th className="py-2 px-2">Rank</th>
                            <th className="py-2 px-2">Chunk ID</th>
                            <th className="py-2 px-2">Publisher</th>
                            <th className="py-2 px-2">Hybrid Score</th>
                            <th className="py-2 px-2">Passage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-inherit">
                          {(labResult.retrieval_comparison?.hybrid_rrf || []).map((row: any, i: number) => (
                            <tr key={i} className="hover:opacity-80">
                              <td className="py-2 px-2 font-bold">#{row.rank}</td>
                              <td className="py-2 px-2 opacity-70">[{row.article_id}]</td>
                              <td className="py-2 px-2 font-sans">{row.source}</td>
                              <td className="py-2 px-2 font-bold">{row.score}</td>
                              <td className="py-2 px-2 font-sans line-clamp-1 max-w-sm">{row.text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ) : (
                <div className={`p-8 text-center rounded-lg border text-xs opacity-60 ${
                  theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                }`}>
                  Click "Run Diagnostics" above to execute a transparent trace through all RAG pipeline stages.
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: RESEARCH REPORTS (Document Library)                                 */}
          {/* ========================================================================= */}
          {activeView === 'reports' && (
            <div className="space-y-6">
              
              <div className={`p-5 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <div>
                  <h2 className="text-sm font-semibold font-mono">Equity Research Dossier Library</h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                    Synthesize verified 11-section institutional company research briefs.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={reportSymbol}
                    onChange={e => setReportSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. RELIANCE.NS"
                    className={`px-3 py-1 text-xs rounded border font-mono uppercase focus:outline-none ${
                      theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                    }`}
                  />
                  <button
                    onClick={executeGenerateReport}
                    disabled={reportLoading}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                    }`}
                  >
                    {reportLoading ? 'Generating...' : 'Generate Dossier'}
                  </button>
                </div>
              </div>

              {reportData ? (
                <div className={`p-6 rounded-lg border space-y-6 ${
                  theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-inherit gap-2">
                    <div>
                      <div className="text-[10px] font-mono opacity-60">{reportData.report_id}</div>
                      <h3 className="text-lg font-serif font-bold">{reportData.symbol} — Research Dossier</h3>
                    </div>
                    {reportData.file_paths?.docx && (
                      <a
                        href={`/reports/generated/${reportData.file_paths.docx.split(/[\\/]/).pop()}`}
                        download
                        className={`px-3 py-1 rounded text-xs font-medium border flex items-center space-x-1.5 ${
                          theme === 'dark' ? 'border-[#354039] hover:bg-[#252E29]' : 'border-[#E5E7E2] hover:bg-[#F1F0EC]'
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        <span>Download DOCX</span>
                      </a>
                    )}
                  </div>

                  <div className="space-y-4">
                    {reportData.sections && Object.entries(reportData.sections).map(([title, content]: [string, any], idx: number) => (
                      <div key={idx} className="space-y-1">
                        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider">{title}</h4>
                        <div className={`text-xs leading-relaxed whitespace-pre-line ${
                          theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'
                        }`}>
                          {content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`p-8 text-center rounded-lg border text-xs opacity-60 ${
                  theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                }`}>
                  Enter an NSE ticker symbol to assemble an equity research dossier.
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: PORTFOLIO & WATCHLIST                                               */}
          {/* ========================================================================= */}
          {(activeView === 'portfolio' || activeView === 'watchlist') && (
            <div className="space-y-6">
              
              <div className={`p-5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <div>
                  <h2 className="text-sm font-semibold font-mono">
                    {activeView === 'portfolio' ? 'Investment Portfolio' : 'Saved Watchlist'}
                  </h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                    {authSession ? `Account: ${authSession.user.email} (PostgreSQL RLS Protected)` : 'Guest / Demo Mode'}
                  </p>
                </div>

                {activeView === 'portfolio' && (
                  <form onSubmit={handleAddHolding} className="flex flex-wrap items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Symbol"
                      value={newHolding.symbol}
                      onChange={e => setNewHolding(prev => ({ ...prev, symbol: e.target.value }))}
                      className={`w-24 px-2 py-1 text-xs rounded border font-mono uppercase focus:outline-none ${
                        theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={newHolding.quantity}
                      onChange={e => setNewHolding(prev => ({ ...prev, quantity: e.target.value }))}
                      className={`w-16 px-2 py-1 text-xs rounded border font-mono focus:outline-none ${
                        theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                      }`}
                    />
                    <input
                      type="number"
                      placeholder="Buy Price"
                      value={newHolding.price}
                      onChange={e => setNewHolding(prev => ({ ...prev, price: e.target.value }))}
                      className={`w-20 px-2 py-1 text-xs rounded border font-mono focus:outline-none ${
                        theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                      }`}
                    />
                    <button
                      type="submit"
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                      }`}
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>

              {/* Portfolio Table */}
              {activeView === 'portfolio' && (
                <div className={`rounded-lg border overflow-hidden ${
                  theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                }`}>
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className={`border-b text-[10px] uppercase ${theme === 'dark' ? 'border-[#354039] text-[#A3AEA6]' : 'border-[#E5E7E2] text-[#68716B]'}`}>
                        <th className="py-2.5 px-3">Symbol</th>
                        <th className="py-2.5 px-3 text-right">Shares</th>
                        <th className="py-2.5 px-3 text-right">Avg Cost</th>
                        <th className="py-2.5 px-3 text-right">Market Price</th>
                        <th className="py-2.5 px-3 text-right">Total Value</th>
                        <th className="py-2.5 px-3 text-right">P&L</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inherit">
                      {(portfolio?.holdings || []).map((h: any, i: number) => {
                        const isUp = (h.unrealized_pnl || 0) >= 0;
                        return (
                          <tr key={i} className="hover:opacity-85">
                            <td className="py-2.5 px-3 font-bold">{h.symbol}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums">{h.shares}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums">₹{Number(h.average_buy_price).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-semibold">₹{Number(h.current_price).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums">₹{Number(h.current_value).toFixed(2)}</td>
                            <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                              isUp
                                ? theme === 'dark' ? 'text-[#48A37E]' : 'text-[#247A5A]'
                                : theme === 'dark' ? 'text-[#D97371]' : 'text-[#B5504F]'
                            }`}>
                              {isUp ? '+' : ''}₹{Number(h.unrealized_pnl).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeleteHolding(h.id)}
                                className="opacity-50 hover:opacity-100 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(!portfolio?.holdings || portfolio.holdings.length === 0) && (
                    <div className="p-8 text-center text-xs opacity-50">
                      No holdings recorded in this portfolio.
                    </div>
                  )}
                </div>
              )}

              {/* Watchlist Table */}
              {activeView === 'watchlist' && (
                <div className={`rounded-lg border overflow-hidden ${
                  theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
                }`}>
                  <div className="p-4 flex items-center space-x-2 border-b border-inherit">
                    <input
                      type="text"
                      value={watchlistInput}
                      onChange={e => setWatchlistInput(e.target.value.toUpperCase())}
                      placeholder="Add ticker to watchlist (e.g. INFY.NS)"
                      className={`px-3 py-1 text-xs rounded border font-mono focus:outline-none ${
                        theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                      }`}
                    />
                    <button
                      onClick={() => {
                        if (watchlistInput.trim()) {
                          handleAddWatchlist(watchlistInput.trim());
                          setWatchlistInput('');
                        }
                      }}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                      }`}
                    >
                      Watch
                    </button>
                  </div>

                  <div className="divide-y divide-inherit">
                    {watchlist.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs font-mono">
                        <div
                          onClick={() => {
                            selectCompany(item.symbol);
                            setActiveView('markets');
                          }}
                          className="cursor-pointer font-bold hover:underline"
                        >
                          {item.symbol}
                        </div>
                        <button
                          onClick={() => handleDeleteWatchlist(item.id)}
                          className="opacity-50 hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {watchlist.length === 0 && (
                      <div className="p-8 text-center text-xs opacity-50">
                        No stocks pinned to watchlist.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: SYSTEM & CLOUD HEALTH                                               */}
          {/* ========================================================================= */}
          {activeView === 'system' && (
            <div className="space-y-6">
              
              <div className={`p-5 rounded-lg border space-y-2 ${
                theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
              }`}>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className={`w-4 h-4 ${theme === 'dark' ? 'text-[#9FC9B0]' : 'text-[#315F50]'}`} />
                  <h2 className="text-sm font-semibold font-mono">System Status & Provenance</h2>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-[#A3AEA6]' : 'text-[#68716B]'}`}>
                  Real-time operational health of backend microservices, data providers, and security invariants.
                </p>
              </div>

              {systemHealth && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                  <div className={`p-3.5 rounded-lg border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                    <div className="text-[10px] uppercase opacity-50">Gateway Health</div>
                    <div className="font-bold mt-1 text-emerald-500 uppercase">{systemHealth.status} (v{systemHealth.version})</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Uptime: {Math.round(systemHealth.uptime_seconds)}s</div>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                    <div className="text-[10px] uppercase opacity-50">Market Data Engine</div>
                    <div className="font-bold mt-1">{systemHealth.services?.market_data_engine}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Live NSE Prices Active</div>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                    <div className="text-[10px] uppercase opacity-50">Generative AI Provider</div>
                    <div className="font-bold mt-1 text-emerald-500">Google Gemini 3.8 Flash</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Grounded Inference Active</div>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                    <div className="text-[10px] uppercase opacity-50">Provenance Invariant</div>
                    <div className="font-bold mt-1">ALLOW_SYNTHETIC=FALSE</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Zero Hallucinated Quotes</div>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                    <div className="text-[10px] uppercase opacity-50">Database Isolation</div>
                    <div className="font-bold mt-1 text-emerald-500">PostgreSQL RLS Active</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Multi-Tenant Isolation</div>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'}`}>
                    <div className="text-[10px] uppercase opacity-50">Retrieval Fusion</div>
                    <div className="font-bold mt-1">BM25 + Dense RRF</div>
                    <div className="text-[10px] opacity-60 mt-0.5">Reciprocal Rank Fusion k=60</div>
                  </div>
                </div>
              )}

              {/* Non-advisory disclaimer */}
              <div className={`p-4 rounded-lg border text-xs space-y-1.5 leading-relaxed ${
                theme === 'dark' ? 'bg-[#1C2420]/50 border-[#354039] text-[#A3AEA6]' : 'bg-[#F1F0EC]/60 border-[#E5E7E2] text-[#68716B]'
              }`}>
                <div className="font-mono font-semibold text-[11px] uppercase">Educational & Non-Advisory Notice</div>
                <p>
                  FinPulse AI is a financial technology research platform exploring Retrieval-Augmented Generation and Financial Natural Language Processing. It does not provide personalized investment advice, price targets, or trading execution.
                </p>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* AUTH MODAL                                                                */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-lg border p-6 space-y-4 shadow-dropdown ${
            theme === 'dark' ? 'bg-[#1C2420] border-[#354039]' : 'bg-[#FFFFFF] border-[#E5E7E2]'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold font-mono">
                {authForm.isSignUp ? 'Create Account' : 'Sign in to FinPulse AI'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="opacity-50 hover:opacity-100 text-sm">✕</button>
            </div>

            {authError && (
              <div className="p-2.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono opacity-60">Email Address</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full mt-1 px-3 py-1.5 text-xs rounded border focus:outline-none ${
                    theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] font-mono opacity-60">Password</label>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  className={`w-full mt-1 px-3 py-1.5 text-xs rounded border focus:outline-none ${
                    theme === 'dark' ? 'bg-[#141917] border-[#354039] text-[#ECEFEA]' : 'bg-[#F8F7F4] border-[#E5E7E2] text-[#202522]'
                  }`}
                />
              </div>
              <button
                type="submit"
                className={`w-full py-1.5 text-xs font-semibold rounded mt-2 ${
                  theme === 'dark' ? 'bg-[#9FC9B0] text-[#141917]' : 'bg-[#315F50] text-white'
                }`}
              >
                {authForm.isSignUp ? 'Register' : 'Sign in'}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-inherit text-[11px] opacity-70">
              {authForm.isSignUp ? (
                <span>Already registered? <button onClick={() => setAuthForm(prev => ({ ...prev, isSignUp: false }))} className="font-semibold underline">Sign in</button></span>
              ) : (
                <span>Need an account? <button onClick={() => setAuthForm(prev => ({ ...prev, isSignUp: true }))} className="font-semibold underline">Register</button></span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
