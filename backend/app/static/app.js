// FinPulse AI — Core Client Script
const API_BASE = '/api/v1';

let currentExplorerSymbol = 'RELIANCE.NS';
let currentExplorerPeriod = '6mo';
let activeIndicators = { sma20: true, sma50: false, ema12: false, rsi: false, bb: false };
let dashChartInstance = null;
let explorerChartInstance = null;
let compareChartInstance = null;
let cachedStockData = {};

// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  fetchTelemetry();
  fetchBenchmarks();
  fetchDashboardStock('RELIANCE.NS');
  fetchDashboardNews();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const now = new Date();
  document.getElementById('liveClock').textContent = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
}

// Tab Switching
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active-nav');
    b.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active-nav');
    activeBtn.classList.remove('text-slate-400');
  }

  const tabs = ['dashboard', 'explorer', 'news', 'assistant', 'comparison', 'portfolio', 'watchlist', 'reports', 'system'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.add('hidden');
  });

  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove('hidden');

  // Trigger lazy loading per tab
  if (tabId === 'explorer') loadExplorerStock(currentExplorerSymbol);
  if (tabId === 'news') refreshNews();
  if (tabId === 'comparison') refreshComparison();
  if (tabId === 'portfolio') fetchPortfolio();
  if (tabId === 'watchlist') fetchWatchlist();
  if (tabId === 'system') fetchSystemHealth();

  lucide.createIcons();
}

// Search Bar Handler
function handleSearchSubmit() {
  const input = document.getElementById('globalSearchInput');
  const val = input.value.trim().toUpperCase();
  if (val) {
    currentExplorerSymbol = val.includes('.') ? val : `${val}.NS`;
    switchTab('explorer');
  }
}

// Telemetry & Health Badge
async function fetchTelemetry() {
  try {
    const res = await fetch(`${API_BASE}/system/health`);
    const data = await res.json();
    const badge = document.getElementById('telemetryText');
    if (data.demo_mode_active) {
      badge.textContent = 'DEMO / SYNTHETIC ACTIVE';
    } else {
      badge.textContent = 'NSE LIVE FEED ACTIVE';
    }
  } catch (e) {
    console.error('Failed to fetch telemetry:', e);
  }
}

// Benchmark Ticker Bar
async function fetchBenchmarks() {
  try {
    const res = await fetch(`${API_BASE}/market/benchmarks`);
    const data = await res.json();
    const list = document.getElementById('benchmarkList');
    list.innerHTML = '';
    data.forEach(item => {
      const isPos = item.change >= 0;
      const col = isPos ? 'text-emerald-400' : 'text-rose-400';
      const arrow = isPos ? '▲' : '▼';
      const div = document.createElement('div');
      div.className = 'cursor-pointer hover:underline flex items-center space-x-1 font-mono';
      div.onclick = () => { loadExplorerStock(item.symbol); switchTab('explorer'); };
      div.innerHTML = `
        <span class="text-slate-300 font-semibold">${item.name}</span>
        <span class="text-slate-200">₹${item.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
        <span class="${col}">${arrow} ${Math.abs(item.change_percent)}%</span>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    console.error('Failed to load benchmarks:', e);
  }
}

// Dashboard Stock & Chart
async function fetchDashboardStock(symbol, period = '6mo') {
  try {
    const res = await fetch(`${API_BASE}/market/stock/${symbol}?period=${period}`);
    const data = await res.json();
    document.getElementById('dashChartSymbol').textContent = data.symbol;
    document.getElementById('dashChartCompany').textContent = data.summary.company_name;
    document.getElementById('dashChartPrice').textContent = `₹${data.summary.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    const rsiVal = data.indicators.rsi14 ? data.indicators.rsi14.filter(x => x !== null).pop() : '50.0';
    document.getElementById('dashChartRSI').textContent = rsiVal ? rsiVal.toFixed(1) : 'N/A';
    document.getElementById('dashChartVol').textContent = `${data.metrics.annualized_volatility}%`;
    document.getElementById('dashChartDD').textContent = `-${data.metrics.max_drawdown}%`;

    renderDashChart(data.records);
  } catch (e) {
    console.error('Error loading dashboard stock:', e);
  }
}

function setDashChartPeriod(p) {
  fetchDashboardStock(document.getElementById('dashChartSymbol').textContent, p);
}

function renderDashChart(records) {
  const ctx = document.getElementById('dashMainChart').getContext('2d');
  const labels = records.map(r => r.date);
  const data = records.map(r => r.close);

  if (dashChartInstance) dashChartInstance.destroy();

  dashChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Closing Price (₹)',
        data: data,
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(51, 65, 85, 0.2)' }, ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } } },
        y: { grid: { color: 'rgba(51, 65, 85, 0.2)' }, ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } } }
      }
    }
  });
}

// Dashboard News Feed
async function fetchDashboardNews() {
  try {
    const res = await fetch(`${API_BASE}/news?limit=6`);
    const data = await res.json();
    const container = document.getElementById('dashNewsList');
    container.innerHTML = '';
    data.articles.forEach(art => {
      const isPos = art.sentiment_label === 'positive';
      const isNeg = art.sentiment_label === 'negative';
      const pillCol = isPos ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : (isNeg ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20');
      
      const item = document.createElement('div');
      item.className = 'p-2.5 rounded-xl bg-dark-900 border border-dark-800 text-xs hover:border-dark-700 transition-colors';
      item.innerHTML = `
        <div class="flex justify-between items-center text-[10px] text-slate-400 mb-1">
          <span class="font-semibold text-slate-300">${art.source}</span>
          <span class="px-1.5 py-0.5 rounded border ${pillCol} font-mono">${art.sentiment_label.toUpperCase()}</span>
        </div>
        <a href="${art.url}" target="_blank" rel="noopener" class="text-slate-200 hover:text-brand-400 line-clamp-2 font-medium">
          ${art.title}
        </a>
      `;
      container.appendChild(item);
    });

    // Update sentiment distribution bar
    const total = data.total || 1;
    const posPct = Math.round((data.sentiment_distribution.positive / total) * 100);
    const neuPct = Math.round((data.sentiment_distribution.neutral / total) * 100);
    const negPct = Math.round((data.sentiment_distribution.negative / total) * 100);

    document.getElementById('dashSentBarPos').style.width = `${posPct}%`;
    document.getElementById('dashSentBarNeu').style.width = `${neuPct}%`;
    document.getElementById('dashSentBarNeg').style.width = `${negPct}%`;

    document.getElementById('dashSentTextPos').textContent = `Pos: ${posPct}%`;
    document.getElementById('dashSentTextNeu').textContent = `Neu: ${neuPct}%`;
    document.getElementById('dashSentTextNeg').textContent = `Neg: ${negPct}%`;
  } catch (e) {
    console.error('Failed to load dashboard news:', e);
  }
}

// Stock Explorer
async function loadExplorerStock(symbol, period = currentExplorerPeriod) {
  currentExplorerSymbol = symbol;
  currentExplorerPeriod = period;
  try {
    const res = await fetch(`${API_BASE}/market/stock/${symbol}?period=${period}`);
    const data = await res.json();
    cachedStockData[symbol] = data;

    document.getElementById('expSymbol').textContent = data.symbol;
    document.getElementById('expCompanyName').textContent = data.summary.company_name;
    document.getElementById('expCurrentPrice').textContent = `₹${data.summary.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    const isPos = data.summary.change >= 0;
    const chgCol = isPos ? 'text-emerald-400' : 'text-rose-400';
    document.getElementById('expChangePercent').className = `text-sm font-mono ${chgCol}`;
    document.getElementById('expChangePercent').textContent = `${isPos ? '+' : ''}₹${data.summary.change} (${isPos ? '+' : ''}${data.summary.change_percent}%)`;
    
    document.getElementById('expDataSource').textContent = data.summary.data_source;
    document.getElementById('exp52wHigh').textContent = `₹${data.summary.high_52w}`;
    document.getElementById('exp52wLow').textContent = `₹${data.summary.low_52w}`;
    document.getElementById('expAnnVol').textContent = `${data.metrics.annualized_volatility}%`;
    document.getElementById('expMaxDD').textContent = `-${data.metrics.max_drawdown}%`;
    document.getElementById('expSharpe').textContent = `${data.metrics.sharpe_ratio_est}`;
    document.getElementById('expPE').textContent = data.summary.pe_ratio || 'N/A';

    renderExplorerChart(data);
  } catch (e) {
    console.error('Failed to load explorer stock:', e);
  }
}

function loadExplorerStockWithPeriod(p) {
  loadExplorerStock(currentExplorerSymbol, p);
}

function toggleIndicator(ind) {
  activeIndicators[ind] = !activeIndicators[ind];
  const btn = document.getElementById(`ind-${ind}`);
  if (activeIndicators[ind]) {
    btn.classList.add('bg-brand-600', 'text-white', 'border-brand-500');
    btn.classList.remove('bg-dark-800', 'text-slate-300');
  } else {
    btn.classList.remove('bg-brand-600', 'text-white', 'border-brand-500');
    btn.classList.add('bg-dark-800', 'text-slate-300');
  }
  if (cachedStockData[currentExplorerSymbol]) {
    renderExplorerChart(cachedStockData[currentExplorerSymbol]);
  }
}

function renderExplorerChart(stockData) {
  const ctx = document.getElementById('explorerChart').getContext('2d');
  const records = stockData.records;
  const labels = records.map(r => r.date);
  const closes = records.map(r => r.close);

  const datasets = [{
    label: `${stockData.symbol} Price`,
    data: closes,
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderWidth: 2,
    fill: true,
    tension: 0.1,
    pointRadius: 0
  }];

  if (activeIndicators.sma20 && stockData.indicators.sma20) {
    datasets.push({
      label: 'SMA 20',
      data: stockData.indicators.sma20,
      borderColor: '#F59E0B',
      borderWidth: 1.5,
      pointRadius: 0,
      borderDash: [4, 4]
    });
  }

  if (activeIndicators.sma50 && stockData.indicators.sma50) {
    datasets.push({
      label: 'SMA 50',
      data: stockData.indicators.sma50,
      borderColor: '#3B82F6',
      borderWidth: 1.5,
      pointRadius: 0
    });
  }

  if (activeIndicators.ema12 && stockData.indicators.ema12) {
    datasets.push({
      label: 'EMA 12',
      data: stockData.indicators.ema12,
      borderColor: '#EC4899',
      borderWidth: 1.5,
      pointRadius: 0
    });
  }

  if (activeIndicators.bb && stockData.indicators.bb_upper) {
    datasets.push({
      label: 'Upper BB',
      data: stockData.indicators.bb_upper,
      borderColor: 'rgba(16, 185, 129, 0.4)',
      borderWidth: 1,
      pointRadius: 0
    });
    datasets.push({
      label: 'Lower BB',
      data: stockData.indicators.bb_lower,
      borderColor: 'rgba(16, 185, 129, 0.4)',
      borderWidth: 1,
      pointRadius: 0
    });
  }

  if (explorerChartInstance) explorerChartInstance.destroy();

  explorerChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: '#94A3B8', font: { family: 'JetBrains Mono', size: 10 } } }
      },
      scales: {
        x: { grid: { color: 'rgba(51, 65, 85, 0.2)' }, ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } } },
        y: { grid: { color: 'rgba(51, 65, 85, 0.2)' }, ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } } }
      }
    }
  });
}

// News Intelligence
async function refreshNews() {
  const sentiment = document.getElementById('newsFilterSentiment').value;
  const url = `${API_BASE}/news?limit=20${sentiment ? `&sentiment=${sentiment}` : ''}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const container = document.getElementById('newsArticleContainer');
    container.innerHTML = '';
    data.articles.forEach(art => {
      const isPos = art.sentiment_label === 'positive';
      const isNeg = art.sentiment_label === 'negative';
      const pillCol = isPos ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : (isNeg ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20');
      
      const card = document.createElement('div');
      card.className = 'glass-card rounded-xl p-5 flex flex-col justify-between';
      card.innerHTML = `
        <div>
          <div class="flex justify-between items-center text-xs mb-2">
            <span class="font-bold text-slate-300 font-mono">${art.source}</span>
            <span class="px-2 py-0.5 rounded border ${pillCol} font-mono text-[10px] font-bold">${art.sentiment_label.toUpperCase()} (${art.sentiment_score >= 0 ? '+' : ''}${art.sentiment_score})</span>
          </div>
          <h3 class="font-semibold text-white text-sm line-clamp-2 mb-2">${art.title}</h3>
          <p class="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">${art.summary}</p>
        </div>
        <div class="pt-3 border-t border-dark-800 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>${art.published_at.substring(0, 10)}</span>
          <a href="${art.url}" target="_blank" rel="noopener" class="text-brand-400 hover:underline flex items-center space-x-1">
            <span>Read Original</span>
            <i data-lucide="external-link" class="w-3 h-3"></i>
          </a>
        </div>
      `;
      container.appendChild(card);
    });
    lucide.createIcons();
  } catch (e) {
    console.error('Error refreshing news:', e);
  }
}

function filterNews() {
  refreshNews();
}

// AI Research Assistant (RAG)
function setAssistantPrompt(q) {
  document.getElementById('ragQueryInput').value = q;
}

async function executeRAGQuery() {
  const query = document.getElementById('ragQueryInput').value.trim();
  if (!query) return;

  const btn = document.getElementById('btnSubmitRAG');
  btn.disabled = true;
  btn.innerHTML = '<span>Retrieving...</span>';

  try {
    const res = await fetch(`${API_BASE}/rag/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, top_k: 3 })
    });
    const data = await res.json();

    document.getElementById('ragResponseContainer').classList.remove('hidden');
    document.getElementById('ragModelBadge').textContent = data.model_used;
    document.getElementById('ragLatencyBadge').textContent = `Latency: ${data.latency_ms} ms`;
    document.getElementById('ragAnswerText').innerHTML = data.answer.replace(/\n/g, '<br>');

    const citList = document.getElementById('ragCitationsList');
    citList.innerHTML = '';
    data.citations.forEach(c => {
      const div = document.createElement('div');
      div.className = 'p-3 rounded-lg bg-dark-950 border border-dark-800 text-xs';
      div.innerHTML = `
        <div class="flex justify-between items-center text-[10px] text-slate-400 mb-1">
          <span class="font-bold text-slate-300">[${c.id}] ${c.source}</span>
          <span class="font-mono text-brand-400">Score: ${c.relevance_score}</span>
        </div>
        <p class="text-slate-300 italic mb-2">"${c.excerpt}"</p>
        <a href="${c.url}" target="_blank" class="text-brand-400 hover:underline text-[11px] font-mono flex items-center space-x-1">
          <span>Source: ${c.title}</span>
          <i data-lucide="external-link" class="w-3 h-3"></i>
        </a>
      `;
      citList.appendChild(div);
    });
    lucide.createIcons();
  } catch (e) {
    alert(`RAG query failed: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Submit</span>';
    lucide.createIcons();
  }
}

// Multi-Stock Comparison
async function refreshComparison() {
  const syms = document.getElementById('compareSymbolsInput').value.trim();
  try {
    const res = await fetch(`${API_BASE}/market/compare?symbols=${encodeURIComponent(syms)}&period=3mo`);
    const data = await res.json();

    const ctx = document.getElementById('comparisonChart').getContext('2d');
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];
    const labels = data.normalized_series.map(r => r.date);

    const datasets = data.symbols.map((sym, idx) => ({
      label: sym,
      data: data.normalized_series.map(r => r[sym]),
      borderColor: colors[idx % colors.length],
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1
    }));

    if (compareChartInstance) compareChartInstance.destroy();

    compareChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94A3B8', font: { family: 'JetBrains Mono', size: 10 } } }
        },
        scales: {
          x: { grid: { color: 'rgba(51, 65, 85, 0.2)' }, ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } } },
          y: { 
            grid: { color: 'rgba(51, 65, 85, 0.2)' }, 
            ticks: { color: '#64748B', font: { family: 'JetBrains Mono', size: 10 } },
            title: { display: true, text: 'Normalized Relative Return (Base = 100)', color: '#64748B', font: { size: 10 } }
          }
        }
      }
    });

    // Render table
    const tableContainer = document.getElementById('comparisonMetricsTableContainer');
    let tblHtml = `
      <table class="w-full text-left text-xs text-slate-300 font-mono">
        <thead class="text-slate-500 uppercase border-b border-dark-800">
          <tr>
            <th class="py-3 px-2">Symbol</th>
            <th class="py-3 px-2">Company</th>
            <th class="py-3 px-2">Current</th>
            <th class="py-3 px-2">Total Return</th>
            <th class="py-3 px-2">Ann. Volatility</th>
            <th class="py-3 px-2">Max Drawdown</th>
          </tr>
        </thead>
        <tbody>
    `;
    data.metrics.forEach(m => {
      const isPos = m.total_return >= 0;
      tblHtml += `
        <tr class="border-b border-dark-800/60 hover:bg-dark-800/30">
          <td class="py-3 px-2 font-bold text-white">${m.symbol}</td>
          <td class="py-3 px-2 text-slate-400 font-sans">${m.name}</td>
          <td class="py-3 px-2">₹${m.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          <td class="py-3 px-2 ${isPos ? 'text-emerald-400' : 'text-rose-400'} font-bold">${isPos ? '+' : ''}${m.total_return}%</td>
          <td class="py-3 px-2">${m.annualized_volatility}%</td>
          <td class="py-3 px-2 text-rose-400">-${m.max_drawdown}%</td>
        </tr>
      `;
    });
    tblHtml += `</tbody></table>`;
    tableContainer.innerHTML = tblHtml;
  } catch (e) {
    console.error('Failed to run comparison:', e);
  }
}

// Portfolio Analytics
async function fetchPortfolio() {
  try {
    const res = await fetch(`${API_BASE}/portfolio`);
    const data = await res.json();

    const summaryCards = document.getElementById('portfolioSummaryCards');
    const isPnlPos = data.total_unrealized_pnl >= 0;
    summaryCards.innerHTML = `
      <div class="glass-card rounded-xl p-4">
        <span class="text-xs text-slate-500 block">Total Invested</span>
        <span class="text-2xl font-bold font-mono text-white mt-1 block">₹${data.total_invested.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
      </div>
      <div class="glass-card rounded-xl p-4">
        <span class="text-xs text-slate-500 block">Current Valuation</span>
        <span class="text-2xl font-bold font-mono text-white mt-1 block">₹${data.total_current_value.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
      </div>
      <div class="glass-card rounded-xl p-4">
        <span class="text-xs text-slate-500 block">Unrealized P&L</span>
        <span class="text-2xl font-bold font-mono ${isPnlPos ? 'text-emerald-400' : 'text-rose-400'} mt-1 block">${isPnlPos ? '+' : ''}₹${data.total_unrealized_pnl.toLocaleString('en-IN', {minimumFractionDigits: 2})} (${isPnlPos ? '+' : ''}${data.total_return_percent}%)</span>
      </div>
      <div class="glass-card rounded-xl p-4">
        <span class="text-xs text-slate-500 block">Portfolio Volatility</span>
        <span class="text-2xl font-bold font-mono text-slate-200 mt-1 block">${data.annualized_volatility}%</span>
        <span class="text-[10px] text-slate-400 font-sans">Alpha: ${data.benchmark_comparison.alpha_estimate >= 0 ? '+' : ''}${data.benchmark_comparison.alpha_estimate}% vs NIFTY</span>
      </div>
    `;

    const tbody = document.getElementById('holdingsTableBody');
    tbody.innerHTML = '';
    data.holdings.forEach(h => {
      const isPos = h.unrealized_pnl >= 0;
      const tr = document.createElement('tr');
      tr.className = 'border-b border-dark-800/60 hover:bg-dark-800/30';
      tr.innerHTML = `
        <td class="py-3 px-2 font-bold text-white">${h.symbol}</td>
        <td class="py-3 px-2">${h.quantity}</td>
        <td class="py-3 px-2">₹${h.buy_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td class="py-3 px-2">₹${h.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td class="py-3 px-2">₹${h.current_value.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td class="py-3 px-2 ${isPos ? 'text-emerald-400' : 'text-rose-400'} font-bold">${isPos ? '+' : ''}₹${h.unrealized_pnl} (${isPos ? '+' : ''}${h.unrealized_pnl_percent}%)</td>
        <td class="py-3 px-2">${h.weight_percent}%</td>
        <td class="py-3 px-2 text-right">
          <button onclick="deleteHolding(${h.id})" class="text-slate-500 hover:text-rose-400 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4 inline"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (e) {
    console.error('Failed to fetch portfolio:', e);
  }
}

function openAddHoldingModal() { document.getElementById('addHoldingModal').classList.remove('hidden'); }
function closeAddHoldingModal() { document.getElementById('addHoldingModal').classList.add('hidden'); }

async function submitNewHolding() {
  const sym = document.getElementById('holdSym').value.trim();
  const qty = parseFloat(document.getElementById('holdQty').value);
  const price = parseFloat(document.getElementById('holdPrice').value);
  const notes = document.getElementById('holdNotes').value.trim();

  if (!sym || isNaN(qty) || isNaN(price)) {
    alert('Please provide valid symbol, quantity, and buy price.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/portfolio/holding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym, quantity: qty, buy_price: price, notes: notes })
    });
    if (res.ok) {
      closeAddHoldingModal();
      fetchPortfolio();
    }
  } catch (e) {
    alert('Failed to add position: ' + e.message);
  }
}

async function deleteHolding(id) {
  if (!confirm('Remove holding from portfolio?')) return;
  try {
    const res = await fetch(`${API_BASE}/portfolio/holding/${id}`, { method: 'DELETE' });
    if (res.ok) fetchPortfolio();
  } catch (e) {
    alert('Failed to delete holding: ' + e.message);
  }
}

// Watchlist
async function fetchWatchlist() {
  try {
    const res = await fetch(`${API_BASE}/watchlist`);
    const items = await res.json();
    const tbody = document.getElementById('watchlistTableBody');
    tbody.innerHTML = '';
    items.forEach(it => {
      const isPos = it.change >= 0;
      const tr = document.createElement('tr');
      tr.className = 'border-b border-dark-800/60 hover:bg-dark-800/30';
      tr.innerHTML = `
        <td class="py-3 px-2 font-bold text-white cursor-pointer hover:underline" onclick="loadExplorerStock('${it.symbol}'); switchTab('explorer');">${it.symbol}</td>
        <td class="py-3 px-2 text-slate-400 font-sans">${it.name}</td>
        <td class="py-3 px-2">₹${it.current_price.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td class="py-3 px-2 ${isPos ? 'text-emerald-400' : 'text-rose-400'} font-bold">${isPos ? '+' : ''}${it.change_percent}%</td>
        <td class="py-3 px-2">₹${it.day_low} – ₹${it.day_high}</td>
        <td class="py-3 px-2 text-right">
          <button onclick="removeWatchlist(${it.id})" class="text-slate-500 hover:text-rose-400 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4 inline"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (e) {
    console.error('Failed to fetch watchlist:', e);
  }
}

async function addWatchlistSymbol() {
  const sym = document.getElementById('addWatchlistInput').value.trim();
  if (!sym) return;
  try {
    const res = await fetch(`${API_BASE}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym })
    });
    if (res.ok) {
      document.getElementById('addWatchlistInput').value = '';
      fetchWatchlist();
    }
  } catch (e) {
    alert('Failed to add to watchlist: ' + e.message);
  }
}

async function addToWatchlistCurrent() {
  try {
    const res = await fetch(`${API_BASE}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentExplorerSymbol })
    });
    if (res.ok) alert(`Added ${currentExplorerSymbol} to your watchlist!`);
  } catch (e) {
    alert('Error adding to watchlist: ' + e.message);
  }
}

async function removeWatchlist(id) {
  try {
    const res = await fetch(`${API_BASE}/watchlist/${id}`, { method: 'DELETE' });
    if (res.ok) fetchWatchlist();
  } catch (e) {
    alert('Error removing item: ' + e.message);
  }
}

// Research Dossier Generation
async function generateReport() {
  const sym = document.getElementById('reportSymbolInput').value.trim();
  const btn = document.getElementById('btnGenReport');
  btn.disabled = true;
  btn.innerHTML = '<span>Compiling Dossier...</span>';

  try {
    const res = await fetch(`${API_BASE}/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: sym })
    });
    const data = await res.json();

    document.getElementById('reportOutputContainer').classList.remove('hidden');
    document.getElementById('repTitle').textContent = data.title;
    document.getElementById('repDownloadLink').href = `${API_BASE}/report/download/${data.download_filename}`;

    const sectionsList = document.getElementById('repSectionsList');
    sectionsList.innerHTML = '';
    for (const [secTitle, secContent] of Object.entries(data.sections)) {
      const div = document.createElement('div');
      div.className = 'p-4 rounded-xl bg-dark-900 border border-dark-800 text-xs';
      div.innerHTML = `
        <h4 class="font-bold text-brand-400 uppercase tracking-wider text-xs mb-2">${secTitle}</h4>
        <div class="text-slate-300 leading-relaxed whitespace-pre-line">${secContent}</div>
      `;
      sectionsList.appendChild(div);
    }
    lucide.createIcons();
  } catch (e) {
    alert('Report generation failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="file-down" class="w-4 h-4"></i><span>Generate Dossier</span>';
    lucide.createIcons();
  }
}

// System Telemetry View
async function fetchSystemHealth() {
  try {
    const res = await fetch(`${API_BASE}/system/health`);
    const data = await res.json();
    const grid = document.getElementById('systemHealthGrid');
    grid.innerHTML = `
      <div class="p-4 bg-dark-900 rounded-xl border border-dark-800 text-xs font-mono space-y-2">
        <div class="text-slate-400 font-sans font-bold text-sm mb-3">Service Health Metrics</div>
        <div><span class="text-slate-500">Overall Status:</span> <span class="text-emerald-400 font-bold">${data.status.toUpperCase()}</span></div>
        <div><span class="text-slate-500">Version:</span> ${data.version}</div>
        <div><span class="text-slate-500">Environment:</span> ${data.environment}</div>
        <div><span class="text-slate-500">Backend Uptime:</span> ${data.uptime_seconds} seconds</div>
        <div><span class="text-slate-500">Host OS:</span> ${data.platform.system} (Python ${data.platform.python_version})</div>
      </div>
      <div class="p-4 bg-dark-900 rounded-xl border border-dark-800 text-xs font-mono space-y-2">
        <div class="text-slate-400 font-sans font-bold text-sm mb-3">Microservices & Pipelines</div>
        <div><span class="text-slate-500">Database (SQLAlchemy):</span> <span class="text-emerald-400">${data.services.database}</span></div>
        <div><span class="text-slate-500">Market Engine:</span> ${data.services.market_data_engine}</div>
        <div><span class="text-slate-500">News Service:</span> ${data.services.news_intelligence}</div>
        <div><span class="text-slate-500">Sentiment Model:</span> ${data.services.sentiment_engine}</div>
        <div><span class="text-slate-500">RAG Context Engine:</span> ${data.services.rag_pipeline}</div>
      </div>
    `;
  } catch (e) {
    console.error('Failed to load system health:', e);
  }
}
