import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import yfinance as yf

from app.core.config import settings
from app.schemas.market import (
    StockSummary,
    OHLCVRecord
)
from app.services.market_data.providers.base import BaseMarketDataProvider

logger = logging.getLogger(__name__)

class YahooFinanceProvider(BaseMarketDataProvider):
    """
    Live market data provider adapter utilizing Yahoo Finance.
    Operates without OAuth and provides real historical quotes and technical observations.
    Never generates synthetic prices when calls fail.
    """
    @property
    def provider_name(self) -> str:
        return "yfinance"

    def is_configured(self) -> bool:
        return settings.ENABLE_LIVE_YFINANCE

    def is_authenticated(self) -> bool:
        return True

    def get_auth_url(self) -> Optional[str]:
        return None

    def handle_oauth_callback(self, code: str) -> bool:
        return False

    def validate_ohlcv(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        req = ["Open", "High", "Low", "Close", "Volume"]
        for col in req:
            if col not in df.columns:
                raise ValueError(f"Missing required price column: {col}")
        cleaned = df.dropna(subset=req).copy()
        for col in req:
            cleaned[col] = pd.to_numeric(cleaned[col], errors="coerce")
        cleaned = cleaned.dropna(subset=req)
        valid_mask = (
            (cleaned["High"] >= cleaned["Low"]) &
            (cleaned["High"] >= cleaned["Open"] * 0.99) &
            (cleaned["High"] >= cleaned["Close"] * 0.99) &
            (cleaned["Low"] <= cleaned["Open"] * 1.01) &
            (cleaned["Low"] <= cleaned["Close"] * 1.01) &
            (cleaned["Volume"] >= 0)
        )
        return cleaned[valid_mask]

    def get_quote(self, symbol: str) -> Optional[StockSummary]:
        if not self.is_configured():
            return None
        try:
            ticker = yf.Ticker(symbol)
            fast_info = getattr(ticker, "fast_info", None)
            if not fast_info or not hasattr(fast_info, "last_price") or fast_info.last_price is None:
                df = ticker.history(period="5d", auto_adjust=True, timeout=8)
                if df.empty:
                    return None
                last_price = round(float(df["Close"].iloc[-1]), 2)
                prev_price = round(float(df["Close"].iloc[-2]), 2) if len(df) > 1 else last_price
                open_p = round(float(df["Open"].iloc[-1]), 2)
                high_p = round(float(df["High"].iloc[-1]), 2)
                low_p = round(float(df["Low"].iloc[-1]), 2)
                vol = int(df["Volume"].iloc[-1])
            else:
                last_price = round(float(fast_info.last_price), 2)
                prev_price = round(float(getattr(fast_info, "previous_close", last_price)), 2)
                open_p = round(float(getattr(fast_info, "open", last_price)), 2)
                high_p = round(float(getattr(fast_info, "day_high", last_price)), 2)
                low_p = round(float(getattr(fast_info, "day_low", last_price)), 2)
                vol = int(getattr(fast_info, "last_volume", 0))

            chg = round(last_price - prev_price, 2)
            pct = round((chg / prev_price) * 100, 2) if prev_price > 0 else 0.0

            return StockSummary(
                symbol=symbol,
                company_name=symbol,
                current_price=last_price,
                change=chg,
                change_percent=pct,
                open=open_p,
                day_high=high_p,
                day_low=low_p,
                high_52w=high_p * 1.15,
                low_52w=low_p * 0.85,
                volume=vol,
                is_synthetic=False,
                data_source="Yahoo Finance Historical Feed",
                last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                staleness_status="fresh",
                observation_timestamp=datetime.now(timezone.utc).isoformat(),
                retrieval_timestamp=datetime.now(timezone.utc).isoformat(),
                exchange="NSE",
                currency="INR"
            )
        except Exception as e:
            logger.warning(f"YahooFinanceProvider get_quote failed for {symbol}: {e}")
            return None

    def get_historical_candles(self, symbol: str, period: str = "6mo") -> Tuple[List[OHLCVRecord], StockSummary]:
        if not self.is_configured():
            raise ValueError("YahooFinanceProvider is not enabled in settings.")

        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, auto_adjust=True, timeout=10)
        if df.empty or len(df) < 2:
            raise ValueError(f"Yahoo Finance returned no historical candles for {symbol}")

        df = self.validate_ohlcv(df)
        dates = [d.strftime("%Y-%m-%d") for d in df.index]
        closes = [round(float(c), 2) for c in df["Close"]]
        opens = [round(float(o), 2) for o in df["Open"]]
        highs = [round(float(h), 2) for h in df["High"]]
        lows = [round(float(l), 2) for l in df["Low"]]
        vols = [int(v) for v in df["Volume"]]

        records: List[OHLCVRecord] = []
        for i in range(len(dates)):
            chg = round(closes[i] - opens[i], 2)
            pct = round((chg / opens[i]) * 100, 2) if opens[i] != 0 else 0.0
            records.append(OHLCVRecord(
                date=dates[i],
                open=opens[i],
                high=highs[i],
                low=lows[i],
                close=closes[i],
                volume=vols[i],
                change=chg,
                change_percent=pct
            ))

        last_c = closes[-1]
        prev_c = closes[-2] if len(closes) > 1 else last_c
        day_chg = round(last_c - prev_c, 2)
        day_pct = round((day_chg / prev_c) * 100, 2) if prev_c != 0 else 0.0

        summary = StockSummary(
            symbol=symbol,
            company_name=symbol,
            current_price=last_c,
            change=day_chg,
            change_percent=day_pct,
            open=opens[-1],
            day_high=highs[-1],
            day_low=lows[-1],
            high_52w=max(highs),
            low_52w=min(lows),
            volume=vols[-1],
            is_synthetic=False,
            data_source="Yahoo Finance Historical Feed",
            last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            staleness_status="fresh",
            observation_timestamp=dates[-1],
            retrieval_timestamp=datetime.now(timezone.utc).isoformat(),
            exchange="NSE",
            currency="INR"
        )

        return records, summary
