import abc
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any

from app.schemas.market import (
    StockSummary,
    OHLCVRecord,
    StockHistoryResponse,
    MarketSessionStatus,
    MarketDataUnavailableResponse
)

# Standard Indian Trading Hours (IST = UTC + 05:30)
IST_OFFSET = timedelta(hours=5, minutes=30)

class BaseMarketDataProvider(abc.ABC):
    @property
    @abc.abstractmethod
    def provider_name(self) -> str:
        """Identifier for the market data provider (e.g. 'upstox', 'angelone', 'yfinance')."""
        pass

    @abc.abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the required API keys and credentials are provided."""
        pass

    @abc.abstractmethod
    def is_authenticated(self) -> bool:
        """Returns True if valid session tokens or credentials exist."""
        pass

    @abc.abstractmethod
    def get_auth_url(self) -> Optional[str]:
        """Returns the OAuth login dialog URL for user authorization if applicable."""
        pass

    @abc.abstractmethod
    def handle_oauth_callback(self, code: str) -> bool:
        """Exchanges authorization code for an access token."""
        pass

    @abc.abstractmethod
    def get_quote(self, symbol: str) -> Optional[StockSummary]:
        """Fetches the latest real-time or cached market quote."""
        pass

    @abc.abstractmethod
    def get_historical_candles(self, symbol: str, period: str = "6mo") -> Tuple[List[OHLCVRecord], StockSummary]:
        """Fetches real historical OHLCV bars and current summary."""
        pass

    def get_market_session_status(self) -> MarketSessionStatus:
        """Calculates current NSE market session status based on IST clock."""
        now_utc = datetime.now(timezone.utc)
        now_ist = now_utc + IST_OFFSET
        weekday = now_ist.weekday()  # 0=Monday, ..., 5=Saturday, 6=Sunday
        time_str = now_ist.strftime("%H:%M")
        
        # Indian Stock Market standard trading hours
        # Pre-open: 09:00 - 09:15
        # Regular: 09:15 - 15:30
        # Post-close: 15:30 - 16:00
        if weekday in (5, 6):
            session = "WEEKEND"
            is_open = False
            # Next open is Monday 09:15 IST
            days_ahead = 7 - weekday
            next_open = (now_ist + timedelta(days=days_ahead)).replace(hour=9, minute=15, second=0).strftime("%Y-%m-%d 09:15 IST")
        elif time_str < "09:00":
            session = "CLOSED"
            is_open = False
            next_open = now_ist.replace(hour=9, minute=15, second=0).strftime("%Y-%m-%d 09:15 IST")
        elif "09:00" <= time_str < "09:15":
            session = "PRE_OPEN"
            is_open = False
            next_open = now_ist.replace(hour=9, minute=15, second=0).strftime("%Y-%m-%d 09:15 IST")
        elif "09:15" <= time_str <= "15:30":
            session = "REGULAR"
            is_open = True
            next_open = now_ist.replace(hour=9, minute=15, second=0).strftime("%Y-%m-%d 09:15 IST")
        elif "15:30" < time_str <= "16:00":
            session = "POST_CLOSE"
            is_open = False
            next_open = (now_ist + timedelta(days=1)).replace(hour=9, minute=15, second=0).strftime("%Y-%m-%d 09:15 IST")
        else:
            session = "CLOSED"
            is_open = False
            next_open = (now_ist + timedelta(days=1)).replace(hour=9, minute=15, second=0).strftime("%Y-%m-%d 09:15 IST")

        return MarketSessionStatus(
            is_open=is_open,
            exchange="NSE",
            session=session,
            current_time_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            next_open_ist=next_open
        )
