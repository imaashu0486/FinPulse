import json
import logging
import os
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd

from app.core.config import settings
from app.schemas.market import (
    OHLCVRecord,
    TechnicalIndicators,
    StockSummary,
    StockMetrics,
    StockHistoryResponse,
    MarketBenchmarkItem,
    MultiStockComparisonItem,
    MultiStockComparisonResponse,
    MarketSessionStatus,
    MarketDataUnavailableResponse
)
from app.services.market_data.indicators import (
    calculate_sma,
    calculate_ema,
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_returns_and_risk,
)
from app.services.market_data.providers import (
    BaseMarketDataProvider,
    UpstoxProvider,
    AngelOneProvider,
    YahooFinanceProvider
)

logger = logging.getLogger(__name__)

DEMO_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../../data/demo/demo_stocks.json")
)

class MarketDataUnavailableException(Exception):
    def __init__(self, source: str, symbol: str, reason: str):
        self.source = source
        self.symbol = symbol
        self.reason = reason
        super().__init__(f"Market data unavailable from {source} for {symbol}: {reason}")

class MarketDataService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._demo_data: Dict[str, Any] = {}
        self._init_providers()
        self._load_demo_fixtures()

    def _init_providers(self):
        self.upstox = UpstoxProvider()
        self.angelone = AngelOneProvider()
        self.yfinance = YahooFinanceProvider()

    def _load_demo_fixtures(self):
        """Loads fixtures for isolated automated unit tests only."""
        if os.path.exists(DEMO_FILE):
            try:
                with open(DEMO_FILE, "r", encoding="utf-8") as f:
                    self._demo_data = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load test demo fixtures: {e}")

    @property
    def active_provider(self) -> BaseMarketDataProvider:
        provider_name = (settings.MARKET_DATA_PROVIDER or "upstox").lower()
        if provider_name == "upstox":
            return self.upstox
        elif provider_name == "angelone":
            return self.angelone
        elif provider_name == "yfinance":
            return self.yfinance
        return self.upstox

    def _normalize_symbol(self, symbol: str) -> str:
        # Truncate at common SQL injection, semicolon, quote, or comment delimiters
        clean_head = re.split(r"['\";\-\s]", symbol)[0].strip().upper()
        s = re.sub(r"[^A-Za-z0-9_\.\^]", "", clean_head)
        if not s:
            s = "^NSEI"
        # Default Indian stocks to .NS if not specified and not a benchmark index
        if not s.startswith("^") and "." not in s:
            s = f"{s}.NS"
        return s

    def get_stock_history(self, symbol: str, period: str = "6mo") -> StockHistoryResponse:
        norm_sym = self._normalize_symbol(symbol)
        cache_key = f"{norm_sym}_{period}"
        
        now = datetime.now(timezone.utc)
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if (now - entry["timestamp"]).total_seconds() < settings.DATA_CACHE_TTL_SECONDS:
                return entry["data"]

        records: List[OHLCVRecord] = []
        summary: Optional[StockSummary] = None

        # 1. Attempt active provider (Upstox, Angel One, etc.)
        provider = self.active_provider
        if provider.is_configured() and provider.is_authenticated():
            try:
                records, summary = provider.get_historical_candles(norm_sym, period=period)
                logger.info(f"Retrieved live candles from {provider.provider_name} for {norm_sym}")
            except Exception as e:
                logger.warning(f"{provider.provider_name} live fetch failed for {norm_sym}: {e}")

        # 2. Secondary fallback to real Yahoo Finance if active provider failed / unauthenticated
        if not records and settings.ENABLE_LIVE_YFINANCE:
            try:
                records, summary = self.yfinance.get_historical_candles(norm_sym, period=period)
                logger.info(f"Retrieved live candles from yfinance for {norm_sym}")
            except Exception as e:
                logger.warning(f"yfinance live fetch failed for {norm_sym}: {e}")

        # 3. NON-NEGOTIABLE CHECK: Never replace missing data with synthetic data in normal operation
        if not records:
            if settings.DEMO_MODE and settings.ALLOW_SYNTHETIC_DATA:
                # STRICTLY FOR ISOLATED UNIT TESTS ONLY
                logger.info(f"Using isolated test fixture for {norm_sym} (DEMO_MODE & ALLOW_SYNTHETIC_DATA=True)")
                demo_entry = self._demo_data.get(norm_sym) or self._demo_data.get("RELIANCE.NS", {})
                if demo_entry:
                    for r in demo_entry.get("records", []):
                        records.append(OHLCVRecord(**r))
                    summary_dict = dict(demo_entry["summary"])
                    summary_dict["symbol"] = norm_sym
                    summary_dict["is_synthetic"] = True
                    summary_dict["data_source"] = "TEST_FIXTURE_ONLY"
                    summary = StockSummary(**summary_dict)
                else:
                    raise MarketDataUnavailableException(
                        source=provider.provider_name,
                        symbol=norm_sym,
                        reason="No real market data retrieved and test fixture missing."
                    )
            else:
                # NORMAL OPERATION: Return honest unavailable state, never synthetic data
                raise MarketDataUnavailableException(
                    source=provider.provider_name,
                    symbol=norm_sym,
                    reason=(
                        f"Live market data from {provider.provider_name} is unavailable or unconfigured. "
                        "FinPulse AI enforces strict data provenance and does not generate synthetic prices in normal operation."
                    )
                )

        assert summary is not None

        # Compute Technical Indicators on verified observations
        closes = [r.close for r in records]
        dates = [r.date for r in records]
        
        sma20 = calculate_sma(closes, 20)
        sma50 = calculate_sma(closes, 50)
        sma200 = calculate_sma(closes, 200)
        ema12 = calculate_ema(closes, 12)
        ema26 = calculate_ema(closes, 26)
        rsi14 = calculate_rsi(closes, 14)
        macd, signal, hist = calculate_macd(closes)
        bb_upper, bb_mid, bb_lower = calculate_bollinger_bands(closes, 20, 2.0)
        
        indicators = TechnicalIndicators(
            sma20=sma20,
            sma50=sma50,
            sma200=sma200,
            ema12=ema12,
            ema26=ema26,
            rsi14=rsi14,
            macd=macd,
            macd_signal=signal,
            macd_hist=hist,
            bb_upper=bb_upper,
            bb_middle=bb_mid,
            bb_lower=bb_lower
        )

        # Compute Risk & Return Metrics
        metrics_dict = calculate_returns_and_risk(closes)
        metrics = StockMetrics(**metrics_dict)

        result = StockHistoryResponse(
            symbol=norm_sym,
            timeframe=period,
            records=records,
            indicators=indicators,
            summary=summary,
            metrics=metrics,
            dates=dates
        )

        self._cache[cache_key] = {"data": result, "timestamp": now}
        return result

    def get_market_benchmarks(self) -> List[MarketBenchmarkItem]:
        """Fetches market overview benchmarks (NIFTY 50, NIFTY Bank, etc.)."""
        benchmarks = [
            ("^NSEI", "NIFTY 50"),
            ("^NSEBANK", "NIFTY BANK"),
            ("RELIANCE.NS", "Reliance Industries"),
            ("TCS.NS", "Tata Consultancy Services"),
            ("HDFCBANK.NS", "HDFC Bank")
        ]
        items: List[MarketBenchmarkItem] = []

        for sym, name in benchmarks:
            try:
                hist = self.get_stock_history(sym, period="1mo")
                closes = [r.close for r in hist.records[-15:]]
                summ = hist.summary
                items.append(MarketBenchmarkItem(
                    symbol=sym,
                    name=name,
                    current_price=summ.current_price,
                    change=summ.change,
                    change_percent=summ.change_percent,
                    sparkline=closes,
                    is_positive=summ.change >= 0,
                    is_synthetic=summ.is_synthetic,
                    data_source=summ.data_source,
                    staleness_status=summ.staleness_status,
                    last_updated=summ.last_updated
                ))
            except MarketDataUnavailableException:
                # Honest unavailable reporting
                items.append(MarketBenchmarkItem(
                    symbol=sym,
                    name=name,
                    current_price=0.0,
                    change=0.0,
                    change_percent=0.0,
                    sparkline=[],
                    is_positive=True,
                    is_synthetic=False,
                    data_source="Data Unavailable",
                    staleness_status="unavailable",
                    last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                ))
            except Exception as e:
                logger.error(f"Error fetching benchmark {sym}: {e}")

        return items

    def compare_stocks(self, symbols: List[str], period: str = "3mo") -> MultiStockComparisonResponse:
        metrics: List[MultiStockComparisonItem] = []
        histories: Dict[str, StockHistoryResponse] = {}

        for s in symbols:
            try:
                h = self.get_stock_history(s, period=period)
                histories[h.symbol] = h
                metrics.append(MultiStockComparisonItem(
                    symbol=h.symbol,
                    name=h.summary.company_name,
                    current_price=h.summary.current_price,
                    total_return=h.metrics.total_period_return,
                    annualized_volatility=h.metrics.annualized_volatility,
                    max_drawdown=h.metrics.max_drawdown,
                    avg_sentiment_score=0.25,
                    sentiment_label="positive",
                    staleness_status=h.summary.staleness_status
                ))
            except Exception as e:
                logger.warning(f"Comparison omitted {s}: {e}")

        if not histories:
            raise MarketDataUnavailableException(
                source=self.active_provider.provider_name,
                symbol=",".join(symbols),
                reason="None of the requested comparison symbols could be retrieved from live market data providers."
            )

        # Normalize series to 100 base
        all_dates = sorted(list(set(d for h in histories.values() for d in h.dates)))
        normalized_series: List[Dict[str, Any]] = []

        first_closes = {
            sym: h.records[0].close for sym, h in histories.items() if h.records
        }

        for d in all_dates:
            row: Dict[str, Any] = {"date": d}
            for sym, h in histories.items():
                match = next((r for r in h.records if r.date == d), None)
                if match and first_closes.get(sym, 0) > 0:
                    row[sym] = round((match.close / first_closes[sym]) * 100.0, 2)
                else:
                    row[sym] = None
            normalized_series.append(row)

        return MultiStockComparisonResponse(
            symbols=list(histories.keys()),
            timeframe=period,
            metrics=metrics,
            normalized_series=normalized_series
        )

market_service = MarketDataService()
