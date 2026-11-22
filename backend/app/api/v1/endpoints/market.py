from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.schemas.market import (
    StockHistoryResponse,
    MarketBenchmarkItem,
    MultiStockComparisonResponse,
    MarketSessionStatus,
    MarketDataUnavailableResponse,
)
from app.services.market_data.market_service import (
    market_service,
    MarketDataUnavailableException,
)
from app.services.market_data.catalog import search_catalog, get_sectors

router = APIRouter()

@router.get("/search")
def search_instruments(
    query: str = Query("", description="Company name, symbol, or keyword"),
    sector: Optional[str] = Query(None, description="Optional sector filter"),
    limit: int = Query(15, ge=1, le=50, description="Max results")
) -> List[Dict[str, Any]]:
    """Dynamic global search across Indian equities & indices with autocomplete and sector filtering."""
    return search_catalog(query=query, sector=sector, limit=limit)

@router.get("/sectors")
def list_market_sectors() -> List[str]:
    """Retrieves unique list of market sectors present in the instrument catalog."""
    return get_sectors()

@router.get("/session", response_model=MarketSessionStatus)
def get_market_session():
    """Retrieves current NSE/BSE market session status based on IST clock."""
    return market_service.active_provider.get_market_session_status()

@router.get("/provider/status")
def get_provider_status() -> Dict[str, Any]:
    """Retrieves real-time status and health of the active market data provider."""
    provider = market_service.active_provider
    session_status = provider.get_market_session_status()
    return {
        "active_provider": provider.provider_name,
        "is_configured": provider.is_configured(),
        "is_authenticated": provider.is_authenticated(),
        "supports_oauth": provider.get_auth_url() is not None,
        "market_session": session_status.session,
        "is_market_open": session_status.is_open,
        "current_time_ist": session_status.current_time_ist,
        "cached_symbols_count": len(market_service._cache),
        "synthetic_mode": False
    }

@router.get("/provider/auth-url")
def get_provider_auth_url():
    """Returns the OAuth login dialog URL for user authorization if supported by provider."""
    auth_url = market_service.active_provider.get_auth_url()
    if not auth_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Active provider '{market_service.active_provider.provider_name}' does not require or support OAuth login."
        )
    return {"auth_url": auth_url, "provider": market_service.active_provider.provider_name}

@router.get("/provider/upstox/callback")
def handle_upstox_callback(code: str = Query(..., description="Authorization code from Upstox OAuth redirect")):
    """Handles OAuth 2.0 authorization code callback from Upstox."""
    success = market_service.upstox.handle_oauth_callback(code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange authorization code for Upstox access token."
        )
    return {
        "status": "success",
        "message": "Upstox access token successfully acquired and verified for today's trading session.",
        "expires_at": market_service.upstox.token_expires_at
    }

@router.get("/benchmarks", response_model=List[MarketBenchmarkItem])
def get_market_benchmarks():
    """Retrieve key benchmark indices (NIFTY 50, Bank, blue-chips) with sparklines."""
    try:
        return market_service.get_market_benchmarks()
    except MarketDataUnavailableException as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "source": e.source,
                "symbol": e.symbol,
                "reason": e.reason,
                "is_synthetic": False,
                "data": None,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/stock/{symbol}", response_model=StockHistoryResponse)
def get_stock_details(symbol: str, period: str = "6mo"):
    """Retrieve comprehensive historical OHLCV, moving averages, RSI, MACD, Bollinger Bands, and risk analytics."""
    try:
        return market_service.get_stock_history(symbol=symbol, period=period)
    except MarketDataUnavailableException as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "source": e.source,
                "symbol": e.symbol,
                "reason": e.reason,
                "is_synthetic": False,
                "data": None,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Stock data not found for symbol '{symbol}': {str(e)}")

@router.get("/compare", response_model=MultiStockComparisonResponse)
def compare_stocks(
    symbols: str = "RELIANCE.NS,TCS.NS,INFY.NS",
    period: str = "3mo"
):
    """Aligns and normalizes multiple stock series (base = 100) for comparative alpha and volatility analysis."""
    sym_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not sym_list:
        raise HTTPException(status_code=400, detail="At least one valid symbol must be provided.")
    try:
        return market_service.compare_stocks(symbols=sym_list, period=period)
    except MarketDataUnavailableException as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "source": e.source,
                "symbol": e.symbol,
                "reason": e.reason,
                "is_synthetic": False,
                "data": None,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
