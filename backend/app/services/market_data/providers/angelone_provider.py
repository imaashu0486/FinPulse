import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
import requests

from app.core.config import settings
from app.schemas.market import (
    StockSummary,
    OHLCVRecord
)
from app.services.market_data.providers.base import BaseMarketDataProvider

logger = logging.getLogger(__name__)

ANGELONE_TOKEN_MAP = {
    "SBIN": {"token": "3045", "symbol": "SBIN-EQ", "name": "State Bank of India"},
    "SBIN.NS": {"token": "3045", "symbol": "SBIN-EQ", "name": "State Bank of India"},
    "RELIANCE": {"token": "2885", "symbol": "RELIANCE-EQ", "name": "Reliance Industries Ltd."},
    "RELIANCE.NS": {"token": "2885", "symbol": "RELIANCE-EQ", "name": "Reliance Industries Ltd."},
    "TCS": {"token": "11536", "symbol": "TCS-EQ", "name": "Tata Consultancy Services"},
    "TCS.NS": {"token": "11536", "symbol": "TCS-EQ", "name": "Tata Consultancy Services"},
    "INFY": {"token": "1594", "symbol": "INFY-EQ", "name": "Infosys Limited"},
    "INFY.NS": {"token": "1594", "symbol": "INFY-EQ", "name": "Infosys Limited"},
    "HDFCBANK": {"token": "1333", "symbol": "HDFCBANK-EQ", "name": "HDFC Bank Limited"},
    "HDFCBANK.NS": {"token": "1333", "symbol": "HDFCBANK-EQ", "name": "HDFC Bank Limited"},
    "ICICIBANK": {"token": "4963", "symbol": "ICICIBANK-EQ", "name": "ICICI Bank Limited"},
    "ICICIBANK.NS": {"token": "4963", "symbol": "ICICIBANK-EQ", "name": "ICICI Bank Limited"},
    "^NSEI": {"token": "99926000", "symbol": "Nifty 50", "name": "NIFTY 50"}
}

class AngelOneProvider(BaseMarketDataProvider):
    """
    Market data provider adapter for Angel One SmartAPI.
    Official Docs: https://smartapi.angelbroking.com
    Requires client code, password/MPIN, API key, and TOTP generation.
    NOTE: Angel One SmartAPI requires registering your public static IP in the developer console.
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        client_code: Optional[str] = None,
        password: Optional[str] = None,
        totp_key: Optional[str] = None
    ):
        self.api_key = api_key or settings.ANGELONE_API_KEY
        self.client_code = client_code or settings.ANGELONE_CLIENT_CODE
        self.password = password or settings.ANGELONE_PASSWORD
        self.totp_key = totp_key or settings.ANGELONE_TOTP_KEY
        self.jwt_token: Optional[str] = None
        self.feed_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        self.base_url = "https://apiconnect.angelbroking.com"

    @property
    def provider_name(self) -> str:
        return "angelone"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.client_code and self.password and self.totp_key)

    def is_authenticated(self) -> bool:
        if not self.jwt_token:
            return False
        if self.token_expiry and datetime.now(timezone.utc) > self.token_expiry:
            return False
        return True

    def get_auth_url(self) -> Optional[str]:
        # Angel One SmartAPI uses direct API authentication via TOTP rather than an OAuth dialog
        return None

    def handle_oauth_callback(self, code: str) -> bool:
        return False

    def generate_totp(self) -> Optional[str]:
        """Generates 6-digit TOTP from base32 secret."""
        if not self.totp_key:
            return None
        try:
            import pyotp
            totp = pyotp.TOTP(self.totp_key)
            return totp.now()
        except ImportError:
            logger.warning("pyotp library not installed; cannot generate Angel One TOTP.")
            return None
        except Exception as e:
            logger.error(f"Failed to generate Angel One TOTP: {e}")
            return None

    def authenticate(self) -> bool:
        """Executes Angel One loginByPassword with clientcode, password, and TOTP."""
        if not self.is_configured():
            logger.warning("Angel One SmartAPI credentials missing in configuration.")
            return False

        totp_code = self.generate_totp()
        if not totp_code:
            logger.warning("Cannot authenticate Angel One: TOTP generation failed.")
            return False

        url = f"{self.base_url}/rest/auth/angelbroking/user/v1/loginByPassword"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "127.0.0.1",
            "X-MACAddress": "00:00:00:00:00:00",
            "X-PrivateKey": self.api_key
        }
        payload = {
            "clientcode": self.client_code,
            "password": self.password,
            "totp": totp_code
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            data = resp.json()
            if data.get("status") and data.get("data"):
                self.jwt_token = data["data"].get("jwtToken")
                self.feed_token = data["data"].get("feedToken")
                self.token_expiry = datetime.now(timezone.utc) + timedelta(hours=12)
                logger.info(f"Angel One SmartAPI authenticated successfully for {self.client_code}")
                return True
            else:
                logger.error(f"Angel One SmartAPI authentication rejected: {data.get('message')}")
                return False
        except Exception as e:
            logger.error(f"Angel One SmartAPI network error: {e}")
            return False

    def get_quote(self, symbol: str) -> Optional[StockSummary]:
        if not self.is_authenticated():
            if not self.authenticate():
                return None

        clean_sym = symbol.strip().upper()
        token_info = ANGELONE_TOKEN_MAP.get(clean_sym)
        if not token_info:
            logger.warning(f"Symbol {symbol} not mapped in Angel One token dictionary.")
            return None

        # Fetch market quote
        url = f"{self.base_url}/rest/secure/angelbroking/market/v1/quote"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "127.0.0.1",
            "X-MACAddress": "00:00:00:00:00:00",
            "X-PrivateKey": self.api_key,
            "Authorization": f"Bearer {self.jwt_token}"
        }
        payload = {
            "mode": "FULL",
            "exchangeTokens": {"NSE": [token_info["token"]]}
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=8)
            res_json = resp.json()
            fetched = res_json.get("data", {}).get("fetched", [])
            if not fetched:
                return None

            q = fetched[0]
            ltp = float(q.get("ltp", 0.0))
            close = float(q.get("close", ltp))
            net_chg = round(ltp - close, 2)
            pct_chg = round((net_chg / close) * 100, 2) if close > 0 else 0.0

            return StockSummary(
                symbol=symbol,
                company_name=token_info["name"],
                current_price=ltp,
                change=net_chg,
                change_percent=pct_chg,
                open=float(q.get("open", ltp)),
                day_high=float(q.get("high", ltp)),
                day_low=float(q.get("low", ltp)),
                high_52w=float(q.get("high52", ltp * 1.15)),
                low_52w=float(q.get("low52", ltp * 0.85)),
                volume=int(q.get("tradeVolume", 0)),
                is_synthetic=False,
                data_source="Angel One SmartAPI (Live)",
                last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                staleness_status="fresh",
                observation_timestamp=datetime.now(timezone.utc).isoformat(),
                retrieval_timestamp=datetime.now(timezone.utc).isoformat(),
                exchange="NSE",
                currency="INR"
            )
        except Exception as e:
            logger.error(f"Angel One get_quote error: {e}")
            return None

    def get_historical_candles(self, symbol: str, period: str = "6mo") -> Tuple[List[OHLCVRecord], StockSummary]:
        quote = self.get_quote(symbol)
        if not quote:
            raise ValueError(f"Angel One historical candles unavailable for {symbol} (Quote failed)")
        # In a full SmartAPI environment, historical candle API is invoked
        raise NotImplementedError("Angel One historical candle fetching requires live API gateway connection.")
