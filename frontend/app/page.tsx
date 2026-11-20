'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity, Search, LayoutDashboard, LineChart, Newspaper, Bot,
  Scale, Briefcase, Star, FileText, ShieldCheck, TrendingUp,
  Sparkles, CheckCircle, Zap, AlertTriangle, RefreshCw, LogIn,
  LogOut, User, Lock, ExternalLink
} from 'lucide-react';
import {
  fetchBenchmarks, fetchStockHistory, fetchNews, queryRAG,
  fetchPortfolio, addHolding, deleteHolding,
  fetchWatchlist, addWatchlist, deleteWatchlist,
  compareStocks, generateReport, fetchSystemHealth,
  fetchMarketSession, fetchProviderStatus
} from '@/lib/api';
import { authClient, AuthSession } from '@/lib/supabase';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [currentStock, setCurrentStock] = useState('RELIANCE.NS');
  const [stockData, setStockData] = useState<any>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsMessage, setNewsMessage] = useState<string | null>(null);
  
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState<any>(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Portfolio state
  const [portfolio, setPortfolio] = useState<any>(null);
  const [newSym, setNewSym] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // Watchlist state
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchSym, setWatchSym] = useState('');

  // Provider & Market Session status
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [marketSession, setMarketSession] = useState<any>(null);

  // Auth state
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authIsSignUp, setAuthIsSignUp] = useState(false);

  // Dossier state
  const [dossierSym, setDossierSym] = useState('RELIANCE.NS');
  const [dossierResult, setDossierResult] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  useEffect(() => {
    // Check initial auth session
    setAuthSession(authClient.getSession());

    // Load initial data
    loadDashboardData();
    fetchProviderStatus().then(setProviderStatus).catch(() => {});
    fetchMarketSession().then(setMarketSession).catch(() => {});
  }, []);

  const loadDashboardData = () => {
    fetchBenchmarks().then(setBenchmarks).catch(() => setBenchmarks([]));
    loadStock(currentStock);
    fetchNews({ limit: 6 }).then(data => {
      setNewsArticles(data.articles || []);
      setNewsMessage(data.message || null);
    }).catch(() => {
      setNewsArticles([]);
      setNewsMessage("No news feed currently reachable without network.");
    });
  };

  const loadStock = (sym: string) => {
    setStockLoading(true);
    setStockError(null);
    fetchStockHistory(sym)
      .then(data => {
        if (data.status === 'unavailable') {
          setStockError(`Live data unavailable from ${data.source}: ${data.reason}`);
          setStockData(null);
        } else {
          setStockData(data);
        }
      })
      .catch(err => {
        setStockError(`Unable to retrieve live market data for ${sym}. Real provider unconfigured or market offline.`);
        setStockData(null);
      })
      .finally(() => setStockLoading(false));
  };

  const handleStockChange = (sym: string) => {
    setCurrentStock(sym);
    loadStock(sym);
  };

  const handleRAGSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setRagLoading(true);
    try {
      const res = await queryRAG(ragQuery, currentStock);
      setRagResult(res);
    } catch (err: any) {
      setRagResult({
        answer: "RAG query could not be completed. Check backend connectivity.",
        model_used: "Error",
        latency_ms: 0,
        citations: []
      });
    } finally {
      setRagLoading(false);
    }
  };

  // Portfolio actions
  const loadPortfolio = () => {
    fetchPortfolio().then(setPortfolio).catch(console.error);
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSym || !newQty || !newPrice) return;
    try {
      await addHolding({
        symbol: newSym.toUpperCase(),
        quantity: parseFloat(newQty),
        buy_price: parseFloat(newPrice)
      });
      setNewSym('');
      setNewQty('');
      setNewPrice('');
      loadPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHolding = async (id: number) => {
    try {
      await deleteHolding(id);
      loadPortfolio();
    } catch (err) {
      console.error(err);
    }
  };

  // Watchlist actions
  const loadWatchlist = () => {
    fetchWatchlist().then(setWatchlist).catch(console.error);
  };

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchSym) return;
    try {
      await addWatchlist(watchSym.toUpperCase());
      setWatchSym('');
      loadWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    try {
      await deleteWatchlist(id);
      loadWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  // Dossier actions
  const handleGenerateDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossierSym) return;
    setDossierLoading(true);
    try {
      const res = await generateReport(dossierSym);
      setDossierResult(res);
    } catch (err: any) {
      alert("Failed to generate research dossier: " + err.message);
    } finally {
      setDossierLoading(false);
    }
  };

  // Auth actions
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authIsSignUp) {
      const res = await authClient.signUp(authEmail, authPassword);
      if (res.error) {
        setAuthError(res.error);
      } else {
        setAuthSession(authClient.getSession());
        setShowAuthModal(false);
      }
    } else {
      const res = await authClient.signIn(authEmail, authPassword);
      if (res.error) {
        setAuthError(res.error);
      } else {
        setAuthSession(res.data);
        setShowAuthModal(false);
      }
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    setAuthSession(null);
  };

  return (
    <div className="min-h-screen flex flex-col antialiased bg-[#070A12] text-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">FinPulse AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">V4.0 PROD</span>
              </div>
              <p className="text-[10px] text-slate-400">Real Market Intelligence • NIT Delhi (Roll: 231210027)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Market Session Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono">
              <span className={`w-2 h-2 rounded-full ${marketSession?.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{marketSession?.exchange || 'NSE'}: {marketSession?.session || 'REGULAR'}</span>
            </div>

            {/* Provider Status Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-300 font-mono">
              <span>SRC: {providerStatus?.active_provider?.toUpperCase() || 'UPSTOX'}</span>
            </div>

            {/* Auth Pill */}
            {authSession ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  {authSession.user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Supabase Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BENCHMARK TICKER */}
      <div className="bg-[#05070D] border-b border-slate-800/80 py-2 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex space-x-6 items-center text-xs whitespace-nowrap">
          <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">NSE Benchmarks:</span>
          <div className="flex space-x-6 font-mono">
            {benchmarks.length > 0 ? (
              benchmarks.map((b) => (
                <div key={b.symbol} onClick={() => handleStockChange(b.symbol)} className="cursor-pointer hover:underline flex items-center space-x-1">
                  <span className="text-slate-300 font-semibold">{b.name}</span>
                  <span className="text-slate-200">₹{b.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className={b.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {b.change >= 0 ? '▲' : '▼'} {Math.abs(b.change_percent)}%
                  </span>
                </div>
              ))
            ) : (
              <span className="text-slate-500 italic">Connecting to live market stream (zero synthetic data mode active)...</span>
            )}
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <nav className="bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 overflow-x-auto py-2 text-sm font-medium">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'news', label: 'News Intelligence', icon: Newspaper },
            { id: 'assistant', label: 'AI Assistant (RAG)', icon: Bot },
            { id: 'portfolio', label: 'Portfolio Analytics', icon: Briefcase, action: loadPortfolio },
            { id: 'watchlist', label: 'Watchlist', icon: Star, action: loadWatchlist },
            { id: 'reports', label: 'Research Dossiers', icon: FileText },
            { id: 'system', label: 'System & Credentials', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.action) tab.action();
                }}
                className={`px-3.5 py-2 rounded-lg flex items-center space-x-2 border transition-all ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* HERO CARD */}
            <div className="glass-card rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/30 border border-indigo-500/20">
              <div className="inline-flex items-center space-x-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>IBM SkillsBuild Generative AI & Cloud Computing Internship</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">NSE Market Intelligence & Financial Research Console</h1>
              <p className="text-sm text-slate-300 max-w-2xl mt-1">
                Real-time Indian equities analysis, FinBERT sentiment scoring, evidence-grounded RAG assistance, and portfolio risk management.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap">
                {['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', '^NSEI'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStockChange(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      currentStock === s
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {s.replace('.NS', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE DATA FRESHNESS PANEL */}
            <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stockError ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {stockError ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Data Source: <span className="font-mono text-indigo-400">{stockData?.summary?.data_source || providerStatus?.active_provider?.toUpperCase() || 'Upstox v2'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Staleness: <span className="font-mono text-slate-300">{stockData?.summary?.staleness_status || 'Checking...'}</span> • Observed: {stockData?.summary?.observation_timestamp || 'Real-time feed'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => loadStock(currentStock)}
                disabled={stockLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-mono"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${stockLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Live Quote</span>
              </button>
            </div>

            {/* STOCK DETAILS OR HONEST UNAVAILABLE STATE */}
            {stockError ? (
              <div className="glass-card rounded-2xl p-8 border border-amber-500/30 bg-amber-950/10 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Market Data Unavailable</h3>
                <p className="text-sm text-slate-300 max-w-lg mx-auto">
                  {stockError}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  FinPulse AI adheres to strict data governance: no synthetic or simulated quotes will ever replace live market feeds.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('system')}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                  >
                    View Credential Setup Guide
                  </button>
                </div>
              </div>
            ) : stockData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>{stockData.symbol}</span>
                    <span className="text-xs font-normal text-slate-400">{stockData.summary?.company_name}</span>
                  </h2>
                  <div className="text-3xl font-extrabold font-mono text-white mt-1">
                    ₹{stockData.summary?.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <span className={`text-base font-normal ml-3 ${stockData.summary?.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stockData.summary?.change >= 0 ? '+' : ''}{stockData.summary?.change?.toFixed(2)} ({stockData.summary?.change_percent?.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="p-4 mt-6 bg-slate-900 rounded-xl font-mono text-xs text-slate-300">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <span className="text-slate-500 block">Ann. Volatility</span>
                        <span className="font-bold text-slate-100">{stockData.metrics?.annualized_volatility}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Max Drawdown</span>
                        <span className="font-bold text-rose-400">-{stockData.metrics?.max_drawdown}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Sharpe Ratio</span>
                        <span className="font-bold text-slate-100">{stockData.metrics?.sharpe_ratio_est}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Period Return</span>
                        <span className="font-bold text-emerald-400">+{stockData.metrics?.total_period_return}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white mb-4">Latest Financial Press</h3>
                  {newsMessage && (
                    <div className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 mb-3">
                      {newsMessage}
                    </div>
                  )}
                  <div className="space-y-3">
                    {newsArticles.slice(0, 4).map((art) => (
                      <div key={art.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-300">{art.source}</span>
                          <span className="font-mono text-emerald-400">{art.sentiment_label.toUpperCase()}</span>
                        </div>
                        <a href={art.url} target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-indigo-400 line-clamp-2">
                          {art.title}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: NEWS */}
        {activeTab === 'news' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Newspaper className="w-5 h-5 text-indigo-400" />
              <span>Real-Time Financial News Intelligence</span>
            </h2>
            {newsMessage && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-sm text-slate-300">
                {newsMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsArticles.map((art) => (
                <div key={art.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-bold text-slate-200">{art.source}</span>
                    <span className="font-mono text-emerald-400">{art.sentiment_label}</span>
                  </div>
                  <a href={art.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white hover:text-indigo-400 block">
                    {art.title}
                  </a>
                  <p className="text-xs text-slate-300 line-clamp-2">{art.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AI ASSISTANT (RAG) */}
        {activeTab === 'assistant' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <span>Grounded Financial Research Assistant</span>
            </h2>
            <form onSubmit={handleRAGSubmit} className="flex gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Ask financial question grounded in news (e.g. 'What are recent earnings drivers for Reliance?')..."
                className="flex-1 bg-slate-900 text-sm px-4 py-2.5 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={ragLoading}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
              >
                {ragLoading ? 'Searching...' : 'Submit'}
              </button>
            </form>

            {ragResult && (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs text-indigo-400 font-mono flex justify-between">
                  <span>MODEL: {ragResult.model_used}</span>
                  <span>{ragResult.latency_ms} ms</span>
                </div>
                <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                  {ragResult.answer}
                </div>
                {ragResult.citations && ragResult.citations.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                    <span className="font-semibold block mb-1">Retrieved Citations:</span>
                    <ul className="list-disc list-inside space-y-1">
                      {ragResult.citations.map((c: any, i: number) => (
                        <li key={i}>
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 underline">
                            [{c.source}] {c.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                <span>Multi-Tenant Portfolio Analytics</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">
                User: {authSession?.user?.email || 'Guest / Dev User'}
              </span>
            </div>

            <form onSubmit={handleAddHolding} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Symbol (e.g. RELIANCE.NS)"
                value={newSym}
                onChange={e => setNewSym(e.target.value)}
                className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 text-xs text-white"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 text-xs text-white"
              />
              <input
                type="number"
                placeholder="Buy Price (₹)"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 text-xs text-white"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-xl"
              >
                + Add Holding
              </button>
            </form>

            {portfolio && portfolio.holdings && portfolio.holdings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="p-3">Symbol</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Buy Price</th>
                      <th className="p-3">Current Price</th>
                      <th className="p-3">P&L</th>
                      <th className="p-3">Weight</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {portfolio.holdings.map((h: any) => (
                      <tr key={h.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{h.symbol}</td>
                        <td className="p-3">{h.quantity}</td>
                        <td className="p-3">₹{h.buy_price}</td>
                        <td className="p-3">₹{h.current_price}</td>
                        <td className={`p-3 font-bold ${h.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ₹{h.unrealized_pnl} ({h.unrealized_pnl_percent}%)
                        </td>
                        <td className="p-3">{h.weight_percent}%</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteHolding(h.id)}
                            className="text-rose-400 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No holdings currently recorded for this user account. Use the form above to add an equity position.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WATCHLIST */}
        {activeTab === 'watchlist' && (
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Star className="w-5 h-5 text-indigo-400" />
              <span>Real-Time Watchlist Monitor</span>
            </h2>
            <form onSubmit={handleAddWatchlist} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter NSE Symbol (e.g. INFY.NS)"
                value={watchSym}
                onChange={e => setWatchSym(e.target.value)}
                className="flex-1 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 text-xs text-white"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl"
              >
                Add Symbol
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {watchlist.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white font-mono">{item.symbol}</span>
                    <button onClick={() => handleDeleteWatchlist(item.id)} className="text-slate-500 hover:text-rose-400 text-xs">×</button>
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-100">
                    ₹{item.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`text-xs font-mono ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.change >= 0 ? '+' : ''}{item.change?.toFixed(2)} ({item.change_percent?.toFixed(2)}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DOSSIERS */}
        {activeTab === 'reports' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Institutional Research Dossier Generator</span>
            </h2>
            <p className="text-xs text-slate-400">
              Generates an 11-section institutional equity research dossier integrating technical indicators, FinBERT sentiment, and financial fundamentals.
            </p>
            <form onSubmit={handleGenerateDossier} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={dossierSym}
                onChange={e => setDossierSym(e.target.value)}
                placeholder="Symbol (e.g. RELIANCE.NS)"
                className="flex-1 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 text-xs text-white font-mono"
              />
              <button
                type="submit"
                disabled={dossierLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl"
              >
                {dossierLoading ? 'Generating...' : 'Generate Dossier'}
              </button>
            </form>

            {dossierResult && (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">{dossierResult.title}</h3>
                  <a
                    href={dossierResult.download_url}
                    download
                    className="flex items-center space-x-1 text-xs text-indigo-400 hover:underline font-mono"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Download (.docx)</span>
                  </a>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {dossierResult.executive_summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SYSTEM STATUS */}
        {activeTab === 'system' && (
          <div className="glass-card rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>System Health & Integration Status</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Active Market Provider</span>
                <div className="text-lg font-bold font-mono text-white">{providerStatus?.active_provider?.toUpperCase()}</div>
                <div className="text-xs text-slate-400">
                  Configured: {providerStatus?.is_configured ? 'Yes' : 'No'} • Authenticated: {providerStatus?.is_authenticated ? 'Yes' : 'Blocked / Pending Login'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">NSE Market Session</span>
                <div className="text-lg font-bold font-mono text-white">{marketSession?.session}</div>
                <div className="text-xs text-slate-400">
                  IST Time: {marketSession?.current_time_ist} • Next Open: {marketSession?.next_open_ist}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs text-slate-300">
              <span className="font-bold text-white block">Credential Onboarding Guide</span>
              <p>
                To configure live Upstox Developer API v2, Google Gemini API, or Supabase credentials, consult:
              </p>
              <code className="block p-2 bg-slate-950 rounded text-indigo-400 font-mono">docs/CREDENTIAL_SETUP_GUIDE.md</code>
            </div>
          </div>
        )}
      </main>

      {/* SUPABASE AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>{authIsSignUp ? 'Create Account' : 'Supabase Sign In'}</span>
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors"
              >
                {authIsSignUp ? 'Register' : 'Sign In'}
              </button>
            </form>

            <div className="text-center text-xs text-slate-400 pt-2">
              <button
                onClick={() => setAuthIsSignUp(!authIsSignUp)}
                className="hover:underline text-indigo-400"
              >
                {authIsSignUp ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>FinPulse AI V4.0 • IBM SkillsBuild Generative AI & Cloud Computing Internship</div>
          <div>National Institute of Technology Delhi • Ashish Ranjan (231210027)</div>
        </div>
      </footer>
    </div>
  );
}
