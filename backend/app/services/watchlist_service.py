import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import WatchlistItem
from app.schemas.watchlist import WatchlistItemCreate, WatchlistItemResponse
from app.services.market_data.market_service import market_service

logger = logging.getLogger(__name__)

class WatchlistService:
    def get_watchlist(self, db: Session, user_id: Optional[str] = None) -> List[WatchlistItemResponse]:
        target_user = user_id or "default-user"
        query = db.query(WatchlistItem).filter(WatchlistItem.user_id == target_user)
        items = query.all()

        if not items and settings.DEMO_MODE and settings.ALLOW_SYNTHETIC_DATA:
            # Seed default watchlist strictly for demo/test mode
            default_symbols = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS"]
            for s in default_symbols:
                db.add(WatchlistItem(user_id=target_user, symbol=s, exchange="NSE"))
            db.commit()
            query = db.query(WatchlistItem).filter(WatchlistItem.user_id == target_user)
            items = query.all()

        results: List[WatchlistItemResponse] = []
        for it in items:
            try:
                hist = market_service.get_stock_history(it.symbol, period="5d")
                s = hist.summary
                results.append(WatchlistItemResponse(
                    id=it.id,
                    symbol=it.symbol,
                    name=s.company_name,
                    exchange=it.exchange,
                    current_price=s.current_price,
                    change=s.change,
                    change_percent=s.change_percent,
                    day_high=s.day_high,
                    day_low=s.day_low,
                    added_at=it.added_at.strftime("%Y-%m-%d %H:%M") if it.added_at else "",
                    notes=it.notes,
                    is_synthetic=s.is_synthetic
                ))
            except Exception as e:
                logger.warning(f"Error enriching watchlist item {it.symbol}: {e}")
                results.append(WatchlistItemResponse(
                    id=it.id,
                    symbol=it.symbol,
                    name=it.name or it.symbol,
                    exchange=it.exchange,
                    current_price=0.0,
                    change=0.0,
                    change_percent=0.0,
                    day_high=0.0,
                    day_low=0.0,
                    added_at=it.added_at.strftime("%Y-%m-%d %H:%M") if it.added_at else "",
                    notes=it.notes,
                    is_synthetic=False
                ))
        return results

    def add_to_watchlist(self, db: Session, item_in: WatchlistItemCreate, user_id: Optional[str] = None) -> WatchlistItemResponse:
        target_user = user_id or "default-user"
        norm_sym = market_service._normalize_symbol(item_in.symbol)
        existing = db.query(WatchlistItem).filter(
            WatchlistItem.symbol == norm_sym,
            WatchlistItem.user_id == target_user
        ).first()
        if existing:
            items = self.get_watchlist(db, user_id=target_user)
            return next((it for it in items if it.id == existing.id), None)

        try:
            hist = market_service.get_stock_history(norm_sym, period="5d")
            c_name = hist.summary.company_name
        except Exception:
            c_name = norm_sym

        new_item = WatchlistItem(
            user_id=target_user,
            symbol=norm_sym,
            name=c_name,
            exchange="NSE",
            notes=item_in.notes
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)

        items = self.get_watchlist(db, user_id=target_user)
        return next((it for it in items if it.id == new_item.id), None)

    def remove_from_watchlist(self, db: Session, item_id: int, user_id: Optional[str] = None) -> bool:
        target_user = user_id or "default-user"
        it = db.query(WatchlistItem).filter(
            WatchlistItem.id == item_id,
            WatchlistItem.user_id == target_user
        ).first()
        if not it:
            return False
        db.delete(it)
        db.commit()
        return True

watchlist_service = WatchlistService()
