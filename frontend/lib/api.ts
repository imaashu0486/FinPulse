import { authClient } from './supabase';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  const token = authClient.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchMarketSession() {
  const res = await fetch(`${API_BASE}/market/session`);
  if (!res.ok) throw new Error('Failed to fetch market session');
  return res.json();
}

export async function fetchProviderStatus() {
  const res = await fetch(`${API_BASE}/market/provider/status`);
  if (!res.ok) throw new Error('Failed to fetch provider status');
  return res.json();
}

export async function fetchProviderAuthUrl() {
  const res = await fetch(`${API_BASE}/market/provider/auth-url`);
  if (!res.ok) throw new Error('Failed to fetch auth URL');
  return res.json();
}

export async function fetchBenchmarks() {
  const res = await fetch(`${API_BASE}/market/benchmarks`);
  if (!res.ok) throw new Error('Failed to fetch benchmarks');
  return res.json();
}

export async function fetchStockHistory(symbol: string, period = '6mo') {
  const res = await fetch(`${API_BASE}/market/stock/${symbol}?period=${period}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (data && data.status === 'unavailable') {
      return data;
    }
    throw new Error(data?.detail || `Failed to fetch history for ${symbol}`);
  }
  return data;
}

export async function fetchNews(params: { symbol?: string; query?: string; source?: string; sentiment?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params.symbol) query.append('symbol', params.symbol);
  if (params.query) query.append('query', params.query);
  if (params.source) query.append('source', params.source);
  if (params.sentiment) query.append('sentiment', params.sentiment);
  if (params.limit) query.append('limit', params.limit.toString());
  
  const res = await fetch(`${API_BASE}/news?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch news');
  return res.json();
}

export async function queryRAG(query: string, symbol?: string, top_k = 3) {
  const res = await fetch(`${API_BASE}/rag/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ query, symbol, top_k }),
  });
  if (!res.ok) throw new Error('RAG query failed');
  return res.json();
}

export async function fetchPortfolio() {
  const res = await fetch(`${API_BASE}/portfolio`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch portfolio');
  return res.json();
}

export async function addHolding(holding: { symbol: string; quantity: number; buy_price: number; buy_date?: string; notes?: string }) {
  const res = await fetch(`${API_BASE}/portfolio/holding`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(holding),
  });
  if (!res.ok) throw new Error('Failed to add holding');
  return res.json();
}

export async function deleteHolding(id: number) {
  const res = await fetch(`${API_BASE}/portfolio/holding/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete holding');
  return res.json();
}

export async function fetchWatchlist() {
  const res = await fetch(`${API_BASE}/watchlist`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch watchlist');
  return res.json();
}

export async function addWatchlist(symbol: string) {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) throw new Error('Failed to add to watchlist');
  return res.json();
}

export async function deleteWatchlist(id: number) {
  const res = await fetch(`${API_BASE}/watchlist/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to remove from watchlist');
  return res.json();
}

export async function compareStocks(symbols: string[], period = '3mo') {
  const res = await fetch(`${API_BASE}/market/compare?symbols=${encodeURIComponent(symbols.join(','))}&period=${period}`);
  if (!res.ok) throw new Error('Failed to compare stocks');
  return res.json();
}

export async function generateReport(symbol: string) {
  const res = await fetch(`${API_BASE}/report/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

export async function fetchSystemHealth() {
  const res = await fetch(`${API_BASE}/system/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function searchInstruments(query: string = '', sector?: string, limit: number = 15) {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (sector && sector !== 'All') params.append('sector', sector);
  params.append('limit', String(limit));
  const res = await fetch(`${API_BASE}/market/search?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search instruments');
  return res.json();
}

export async function fetchMarketSectors() {
  const res = await fetch(`${API_BASE}/market/sectors`);
  if (!res.ok) throw new Error('Failed to fetch market sectors');
  return res.json();
}

export async function fetchRAGDiagnostics(params: { query: string; symbol?: string; top_k?: number }) {
  const res = await fetch(`${API_BASE}/rag/diagnostics`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to fetch RAG diagnostics');
  return res.json();
}
