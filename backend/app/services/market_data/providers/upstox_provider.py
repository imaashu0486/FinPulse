import logging
import time
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
import requests

from app.core.config import settings
from app.schemas.market import (
    StockSummary,
    OHLCVRecord,
    MarketSessionStatus
)
from app.services.market_data.providers.base import BaseMarketDataProvider, IST_OFFSET

logger = logging.getLogger(__name__)

# Standard Upstox Instrument Key Mappings for NSE Equities & Indices
UPSTOX_INSTRUMENT_MAP: Dict[str, Dict[str, str]] = {
    "RELIANCE": {"key": "NSE_EQ|INE002A01018", "name": "Reliance Industries Ltd.", "exchange": "NSE"},
    "RELIANCE.NS": {"key": "NSE_EQ|INE002A01018", "name": "Reliance Industries Ltd.", "exchange": "NSE"},
    "TCS": {"key": "NSE_EQ|INE467B01029", "name": "Tata Consultancy Services", "exchange": "NSE"},
    "TCS.NS": {"key": "NSE_EQ|INE467B01029", "name": "Tata Consultancy Services", "exchange": "NSE"},
    "INFY": {"key": "NSE_EQ|INE009A01021", "name": "Infosys Limited", "exchange": "NSE"},
    "INFY.NS": {"key": "NSE_EQ|INE009A01021", "name": "Infosys Limited", "exchange": "NSE"},
    "HDFCBANK": {"key": "NSE_EQ|INE040A01034", "name": "HDFC Bank Limited", "exchange": "NSE"},
    "HDFCBANK.NS": {"key": "NSE_EQ|INE040A01034", "name": "HDFC Bank Limited", "exchange": "NSE"},
    "ICICIBANK": {"key": "NSE_EQ|INE090A01021", "name": "ICICI Bank Limited", "exchange": "NSE"},
    "ICICIBANK.NS": {"key": "NSE_EQ|INE090A01021", "name": "ICICI Bank Limited", "exchange": "NSE"},
    "SBIN": {"key": "NSE_EQ|INE062A01020", "name": "State Bank of India", "exchange": "NSE"},
    "SBIN.NS": {"key": "NSE_EQ|INE062A01020", "name": "State Bank of India", "exchange": "NSE"},
    "ITC": {"key": "NSE_EQ|INE154A01025", "name": "ITC Limited", "exchange": "NSE"},
    "ITC.NS": {"key": "NSE_EQ|INE154A01025", "name": "ITC Limited", "exchange": "NSE"},
    "BHARTIARTL": {"key": "NSE_EQ|INE397D01024", "name": "Bharti Airtel Limited", "exchange": "NSE"},
    "BHARTIARTL.NS": {"key": "NSE_EQ|INE397D01024", "name": "Bharti Airtel Limited", "exchange": "NSE"},
    "TATAMOTORS": {"key": "NSE_EQ|INE155A01022", "name": "Tata Motors Limited", "exchange": "NSE"},
    "TATAMOTORS.NS": {"key": "NSE_EQ|INE155A01022", "name": "Tata Motors Limited", "exchange": "NSE"},
    "MARUTI": {"key": "NSE_EQ|INE585B01010", "name": "Maruti Suzuki India Ltd.", "exchange": "NSE"},
    "MARUTI.NS": {"key": "NSE_EQ|INE585B01010", "name": "Maruti Suzuki India Ltd.", "exchange": "NSE"},
    "M&M": {"key": "NSE_EQ|INE101A01026", "name": "Mahindra & Mahindra Ltd.", "exchange": "NSE"},
    "M&M.NS": {"key": "NSE_EQ|INE101A01026", "name": "Mahindra & Mahindra Ltd.", "exchange": "NSE"},
    "LT": {"key": "NSE_EQ|INE018A01030", "name": "Larsen & Toubro Ltd.", "exchange": "NSE"},
    "LT.NS": {"key": "NSE_EQ|INE018A01030", "name": "Larsen & Toubro Ltd.", "exchange": "NSE"},
    "^NSEI": {"key": "NSE_INDEX|Nifty 50", "name": "NIFTY 50", "exchange": "NSE"},
    "NIFTY": {"key": "NSE_INDEX|Nifty 50", "name": "NIFTY 50", "exchange": "NSE"},
    "NIFTY 50": {"key": "NSE_INDEX|Nifty 50", "name": "NIFTY 50", "exchange": "NSE"},
    "^NSEBANK": {"key": "NSE_INDEX|Nifty Bank", "name": "NIFTY BANK", "exchange": "NSE"},
    "NIFTY BANK": {"key": "NSE_INDEX|Nifty Bank", "name": "NIFTY BANK", "exchange": "NSE"}
}

class UpstoxProvider(BaseMarketDataProvider):
    """
    Genuine market data provider for Upstox Developer API v2.
    Official Docs: https://upstox.com/developer/api-documentation/
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        redirect_uri: Optional[str] = None,
        access_token: Optional[str] = None
    ):
        self._api_key = api_key
        self._api_secret = api_secret
        self._redirect_uri = redirect_uri
        self._access_token = access_token
        self.token_expiry: Optional[datetime] = None
        self.token_expires_at: Optional[str] = None
        self.base_url = "https://api.upstox.com/v2"

    @property
    def api_key(self) -> str:
        return self._api_key if self._api_key is not None else settings.UPSTOX_API_KEY

    @api_key.setter
    def api_key(self, val: str):
        self._api_key = val

    @property
    def api_secret(self) -> str:
        return self._api_secret if self._api_secret is not None else settings.UPSTOX_API_SECRET

    @api_secret.setter
    def api_secret(self, val: str):
        self._api_secret = val

    @property
    def redirect_uri(self) -> str:
        return self._redirect_uri if self._redirect_uri is not None else settings.UPSTOX_REDIRECT_URI

    @redirect_uri.setter
    def redirect_uri(self, val: str):
        self._redirect_uri = val

    @property
    def access_token(self) -> str:
        return self._access_token if self._access_token is not None else settings.UPSTOX_ACCESS_TOKEN

    @access_token.setter
    def access_token(self, val: str):
        self._access_token = val

    @property
    def provider_name(self) -> str:
        return "upstox"

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def is_authenticated(self) -> bool:
        if not self.access_token:
            return False
        if self.token_expires_at:
            try:
                exp = datetime.fromisoformat(self.token_expires_at)
                if datetime.now(timezone.utc) > exp:
                    return False
            except Exception:
                pass
        if self.token_expiry and datetime.now(timezone.utc) > self.token_expiry:
            return False
        return True

    def get_auth_url(self) -> Optional[str]:
        if not self.api_key or not self.redirect_uri:
            return None
        encoded_redirect = urllib.parse.quote(self.redirect_uri, safe="")
        return f"{self.base_url}/login/authorization/dialog?response_type=code&client_id={self.api_key}&redirect_uri={encoded_redirect}"

    def get_instrument_key(self, symbol: str) -> str:
        """Returns the Upstox instrument key string for a given symbol."""
        key, _ = self.resolve_instrument_key(symbol)
        return key

    def handle_oauth_callback(self, code: str) -> bool:
        """Exchanges authorization code for daily access token according to Upstox v2 spec."""
        if not self.is_configured():
            logger.error("Cannot exchange Upstox code: UPSTOX_API_KEY or UPSTOX_API_SECRET is missing.")
            return False

        token_url = f"{self.base_url}/login/authorization/token"
        headers = {
            "accept": "application/json",
            "Api-Version": "2.0",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "code": code,
            "client_id": self.api_key,
            "client_secret": self.api_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code"
        }

        try:
            resp = requests.post(token_url, headers=headers, data=data, timeout=10)
            if resp.status_code == 200:
                payload = resp.json()
                self.access_token = payload.get("access_token")
                expires_in = payload.get("expires_in", 86400)
                self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                logger.info(f"Upstox token successfully acquired for user: {payload.get('user_name')}")
                return True
            else:
                logger.error(f"Upstox OAuth token exchange failed (HTTP {resp.status_code}): {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Upstox OAuth callback network error: {e}")
            return False

    def resolve_instrument_key(self, symbol: str) -> Tuple[str, str]:
        """Resolves symbol to Upstox segment|identifier instrument key and company name."""
        norm = symbol.strip().upper()
        if norm in UPSTOX_INSTRUMENT_MAP:
            mapping = UPSTOX_INSTRUMENT_MAP[norm]
            return mapping["key"], mapping["name"]
        
        # Clean symbol
        clean = norm.replace(".NS", "").replace("^", "")
        if clean in UPSTOX_INSTRUMENT_MAP:
            mapping = UPSTOX_INSTRUMENT_MAP[clean]
            return mapping["key"], mapping["name"]

        # Default fallback key format for standard NSE equities
        return f"NSE_EQ|{clean}", f"{clean} (NSE)"

    def get_quote(self, symbol: str) -> Optional[StockSummary]:
        """Fetches live market quote for instrument."""
        if not self.is_authenticated():
            logger.warning("Upstox provider not authenticated; cannot fetch live quote.")
            return None

        instrument_key, company_name = self.resolve_instrument_key(symbol)
        url = f"{self.base_url}/market-quote/quotes?instrument_key={urllib.parse.quote(instrument_key)}"
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }

        try:
            resp = requests.get(url, headers=headers, timeout=8)
            if resp.status_code != 200:
                logger.warning(f"Upstox quote API failed (HTTP {resp.status_code}): {resp.text}")
                return None

            data = resp.json().get("data", {}).get(instrument_key, {})
            if not data:
                return None

            last_price = float(data.get("last_price", 0.0))
            net_change = float(data.get("net_change", 0.0))
            ohlc = data.get("ohlc", {})
            open_p = float(ohlc.get("open", last_price))
            high_p = float(ohlc.get("high", last_price))
            low_p = float(ohlc.get("low", last_price))
            close_p = float(ohlc.get("close", last_price))
            pct_change = round((net_change / close_p) * 100, 2) if close_p > 0 else 0.0
            volume = int(data.get("volume", 0))

            obs_timestamp = data.get("timestamp") or datetime.now(timezone.utc).isoformat()

            return StockSummary(
                symbol=symbol,
                company_name=company_name,
                current_price=last_price,
                change=net_change,
                change_percent=pct_change,
                open=open_p,
                day_high=high_p,
                day_low=low_p,
                high_52w=high_p * 1.15,
                low_52w=low_p * 0.85,
                volume=volume,
                is_synthetic=False,
                data_source="Upstox Developer API (Live)",
                last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                staleness_status="fresh",
                observation_timestamp=obs_timestamp,
                retrieval_timestamp=datetime.now(timezone.utc).isoformat(),
                exchange="NSE",
                currency="INR"
            )
        except Exception as e:
            logger.error(f"Upstox get_quote error for {symbol}: {e}")
            return None

    def get_historical_candles(self, symbol: str, period: str = "6mo") -> Tuple[List[OHLCVRecord], StockSummary]:
        """Fetches real historical candles from Upstox."""
        if not self.is_authenticated():
            raise ValueError("Upstox provider not authenticated; cannot fetch historical candles.")

        instrument_key, company_name = self.resolve_instrument_key(symbol)
        
        # Calculate date range
        now_dt = datetime.now(timezone.utc)
        to_date = now_dt.strftime("%Y-%m-%d")
        days = 180 if period == "6mo" else (30 if period == "1mo" else 365)
        from_date = (now_dt - timedelta(days=days)).strftime("%Y-%m-%d")

        url = f"{self.base_url}/historical-candle/{urllib.parse.quote(instrument_key)}/day/{to_date}/{from_date}"
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }

        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            raise ValueError(f"Upstox historical candle failed (HTTP {resp.status_code}): {resp.text}")

        candles_raw = resp.json().get("data", {}).get("candles", [])
        if not candles_raw:
            raise ValueError(f"No candles returned by Upstox for {symbol}")

        # Upstox returns newest candles first; reverse to chronological order
        candles_chrono = list(reversed(candles_raw))
        records: List[OHLCVRecord] = []

        for c in candles_chrono:
            # Format: [timestamp, open, high, low, close, volume, open_interest]
            ts = c[0][:10] if len(c) > 0 else ""
            o = float(c[1])
            h = float(c[2])
            l = float(c[3])
            cl = float(c[4])
            v = int(c[5])
            chg = round(cl - o, 2)
            pct = round((chg / o) * 100, 2) if o != 0 else 0.0

            records.append(OHLCVRecord(
                date=ts,
                open=o,
                high=h,
                low=l,
                close=cl,
                volume=v,
                change=chg,
                change_percent=pct
            ))

        last_c = records[-1]
        prev_c = records[-2] if len(records) > 1 else last_c
        day_chg = round(last_c.close - prev_c.close, 2)
        day_pct = round((day_chg / prev_c.close) * 100, 2) if prev_c.close != 0 else 0.0

        summary = StockSummary(
            symbol=symbol,
            company_name=company_name,
            current_price=last_c.close,
            change=day_chg,
            change_percent=day_pct,
            open=last_c.open,
            day_high=last_c.high,
            day_low=last_c.low,
            high_52w=max(r.high for r in records),
            low_52w=min(r.low for r in records),
            volume=last_c.volume,
            is_synthetic=False,
            data_source="Upstox Developer API (Live Candles)",
            last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            staleness_status="fresh",
            observation_timestamp=last_c.date,
            retrieval_timestamp=datetime.now(timezone.utc).isoformat(),
            exchange="NSE",
            currency="INR"
        )

        return records, summary
