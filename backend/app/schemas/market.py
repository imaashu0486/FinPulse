from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class OHLCVRecord(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    change: Optional[float] = 0.0
    change_percent: Optional[float] = 0.0

class TechnicalIndicators(BaseModel):
    sma20: Optional[List[Optional[float]]] = None
    sma50: Optional[List[Optional[float]]] = None
    sma200: Optional[List[Optional[float]]] = None
    ema12: Optional[List[Optional[float]]] = None
    ema26: Optional[List[Optional[float]]] = None
    rsi14: Optional[List[Optional[float]]] = None
    macd: Optional[List[Optional[float]]] = None
    macd_signal: Optional[List[Optional[float]]] = None
    macd_hist: Optional[List[Optional[float]]] = None
    bb_upper: Optional[List[Optional[float]]] = None
    bb_middle: Optional[List[Optional[float]]] = None
    bb_lower: Optional[List[Optional[float]]] = None

class StockSummary(BaseModel):
    symbol: str
    company_name: str
    current_price: float
    change: float
    change_percent: float
    open: float
    day_high: float
    day_low: float
    high_52w: float
    low_52w: float
    volume: int
    pe_ratio: Optional[float] = None
    market_cap: Optional[float] = None
    is_synthetic: bool = False
    data_source: str = "Live / Cached"
    last_updated: str
    staleness_status: str = "fresh"  # "fresh", "cached", "stale", "unavailable"
    observation_timestamp: Optional[str] = None
    retrieval_timestamp: Optional[str] = None
    exchange: str = "NSE"
    currency: str = "INR"

class StockMetrics(BaseModel):
    daily_returns_mean: float
    annualized_volatility: float
    max_drawdown: float
    sharpe_ratio_est: float
    total_period_return: float

class StockHistoryResponse(BaseModel):
    symbol: str
    timeframe: str
    records: List[OHLCVRecord]
    indicators: TechnicalIndicators
    summary: StockSummary
    metrics: StockMetrics
    dates: List[str]

class MarketBenchmarkItem(BaseModel):
    symbol: str
    name: str
    current_price: float
    change: float
    change_percent: float
    sparkline: List[float] = Field(default_factory=list)
    is_positive: bool = True
    is_synthetic: bool = False
    data_source: str = "NSE"
    staleness_status: str = "fresh"
    last_updated: Optional[str] = None

class MultiStockComparisonItem(BaseModel):
    symbol: str
    name: str
    current_price: float
    total_return: float
    annualized_volatility: float
    max_drawdown: float
    avg_sentiment_score: float
    sentiment_label: str
    staleness_status: str = "fresh"

class MultiStockComparisonResponse(BaseModel):
    symbols: List[str]
    timeframe: str
    metrics: List[MultiStockComparisonItem]
    normalized_series: List[Dict[str, Any]]

class MarketDataUnavailableResponse(BaseModel):
    status: str = "unavailable"
    source: str
    symbol: str
    reason: str
    is_synthetic: bool = False
    data: Optional[Any] = None
    timestamp: str

class MarketSessionStatus(BaseModel):
    is_open: bool
    exchange: str = "NSE"
    session: str  # "PRE_OPEN", "REGULAR", "POST_CLOSE", "WEEKEND", "HOLIDAY"
    current_time_ist: str
    next_open_ist: str
    holiday_name: Optional[str] = None
    data_delay_notes: str = "NSE equity quotes reflect 15-minute standard delay on developer tier unless authenticated."
