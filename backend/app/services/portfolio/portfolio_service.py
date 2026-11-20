import logging
import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import PortfolioHolding
from app.schemas.portfolio import HoldingCreate, HoldingResponse, PortfolioSummary
from app.services.market_data.market_service import market_service

logger = logging.getLogger(__name__)

class PortfolioService:
    def get_holdings(self, db: Session, user_id: Optional[str] = None) -> List[HoldingResponse]:
        target_user = user_id or "default-user"
        query = db.query(PortfolioHolding).filter(PortfolioHolding.user_id == target_user)
        db_holdings = query.all()

        if not db_holdings and settings.DEMO_MODE and settings.ALLOW_SYNTHETIC_DATA:
            # Seed initial sample portfolio holdings strictly for demo/test mode
            default_seeds = [
                PortfolioHolding(user_id=target_user, symbol="RELIANCE.NS", name="Reliance Industries Ltd.", quantity=15.0, buy_price=2750.0, buy_date="2026-03-15", notes="Core energy & digital holding"),
                PortfolioHolding(user_id=target_user, symbol="TCS.NS", name="Tata Consultancy Services", quantity=10.0, buy_price=3850.0, buy_date="2026-04-10", notes="IT services anchor"),
                PortfolioHolding(user_id=target_user, symbol="HDFCBANK.NS", name="HDFC Bank Limited", quantity=25.0, buy_price=1580.0, buy_date="2026-05-02", notes="Private banking leader")
            ]
            for h in default_seeds:
                db.add(h)
            db.commit()
            query = db.query(PortfolioHolding).filter(PortfolioHolding.user_id == target_user)
            db_holdings = query.all()

        holdings_res: List[HoldingResponse] = []
        total_curr_val = 0.0

        raw_list = []
        for h in db_holdings:
            try:
                hist = market_service.get_stock_history(h.symbol, period="1mo")
                curr_price = hist.summary.current_price
                name = hist.summary.company_name
                is_synth = hist.summary.is_synthetic
            except Exception:
                curr_price = h.buy_price
                name = h.name or h.symbol
                is_synth = True

            invested = round(h.quantity * h.buy_price, 2)
            c_val = round(h.quantity * curr_price, 2)
            pnl = round(c_val - invested, 2)
            pnl_pct = round((pnl / invested) * 100.0, 2) if invested > 0 else 0.0
            total_curr_val += c_val

            raw_list.append({
                "db_item": h,
                "name": name,
                "current_price": curr_price,
                "invested_amount": invested,
                "current_value": c_val,
                "unrealized_pnl": pnl,
                "unrealized_pnl_percent": pnl_pct,
                "is_synthetic": is_synth
            })

        for item in raw_list:
            weight = round((item["current_value"] / total_curr_val) * 100.0, 2) if total_curr_val > 0 else 0.0
            h = item["db_item"]
            holdings_res.append(HoldingResponse(
                id=h.id,
                symbol=h.symbol,
                name=item["name"],
                quantity=h.quantity,
                buy_price=h.buy_price,
                buy_date=h.buy_date,
                notes=h.notes,
                current_price=item["current_price"],
                invested_amount=item["invested_amount"],
                current_value=item["current_value"],
                unrealized_pnl=item["unrealized_pnl"],
                unrealized_pnl_percent=item["unrealized_pnl_percent"],
                weight_percent=weight,
                is_synthetic=item["is_synthetic"]
            ))

        return holdings_res

    def add_holding(self, db: Session, holding_in: HoldingCreate, user_id: Optional[str] = None) -> HoldingResponse:
        norm_sym = market_service._normalize_symbol(holding_in.symbol)
        try:
            hist = market_service.get_stock_history(norm_sym, period="1mo")
            company_name = hist.summary.company_name
        except Exception:
            company_name = norm_sym

        new_h = PortfolioHolding(
            user_id=user_id or "default-user",
            symbol=norm_sym,
            name=company_name,
            quantity=holding_in.quantity,
            buy_price=holding_in.buy_price,
            buy_date=holding_in.buy_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            notes=holding_in.notes
        )
        db.add(new_h)
        db.commit()
        db.refresh(new_h)
        
        all_holdings = self.get_holdings(db, user_id=user_id)
        return next((h for h in all_holdings if h.id == new_h.id), None)

    def delete_holding(self, db: Session, holding_id: int, user_id: Optional[str] = None) -> bool:
        target_user = user_id or "default-user"
        item = db.query(PortfolioHolding).filter(
            PortfolioHolding.id == holding_id,
            PortfolioHolding.user_id == target_user
        ).first()
        if not item:
            return False
        db.delete(item)
        db.commit()
        return True

    def get_summary(self, db: Session, user_id: Optional[str] = None) -> PortfolioSummary:
        holdings = self.get_holdings(db, user_id=user_id)
        total_inv = sum(h.invested_amount for h in holdings)
        total_val = sum(h.current_value for h in holdings)
        total_pnl = round(total_val - total_inv, 2)
        total_pnl_pct = round((total_pnl / total_inv) * 100.0, 2) if total_inv > 0 else 0.0

        # Allocation breakdown
        allocations = [
            {"symbol": h.symbol, "name": h.name, "value": h.current_value, "weight_percent": h.weight_percent}
            for h in holdings
        ]

        # Estimate portfolio volatility using weighted average volatility of components
        weighted_vol = 0.0
        weighted_dd = 0.0
        for h in holdings:
            try:
                hist = market_service.get_stock_history(h.symbol, period="3mo")
                w = (h.weight_percent / 100.0)
                weighted_vol += (hist.metrics.annualized_volatility * w)
                weighted_dd += (hist.metrics.max_drawdown * w)
            except Exception:
                if settings.DEMO_MODE and settings.ALLOW_SYNTHETIC_DATA:
                    weighted_vol += 14.5 * (h.weight_percent / 100.0)

        # Benchmark comparison
        benchmark_status = "available"
        try:
            nifty = market_service.get_stock_history("^NSEI", period="3mo")
            nifty_ret = nifty.metrics.total_period_return
            nifty_vol = nifty.metrics.annualized_volatility
        except Exception:
            if settings.DEMO_MODE and settings.ALLOW_SYNTHETIC_DATA:
                nifty_ret = 8.4
                nifty_vol = 11.2
            else:
                nifty_ret = 0.0
                nifty_vol = 0.0
                benchmark_status = "unavailable"

        benchmark_comparison = {
            "benchmark_symbol": "^NSEI",
            "benchmark_name": "NIFTY 50",
            "benchmark_period_return": nifty_ret,
            "benchmark_annualized_volatility": nifty_vol,
            "alpha_estimate": round(total_pnl_pct - nifty_ret, 2) if benchmark_status == "available" else 0.0,
            "status": benchmark_status
        }

        return PortfolioSummary(
            holdings=holdings,
            total_invested=round(total_inv, 2),
            total_current_value=round(total_val, 2),
            total_unrealized_pnl=total_pnl,
            total_return_percent=total_pnl_pct,
            holdings_count=len(holdings),
            asset_allocation=allocations,
            annualized_volatility=round(weighted_vol, 2),
            max_drawdown=round(weighted_dd, 2),
            benchmark_comparison=benchmark_comparison,
            last_updated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        )

portfolio_service = PortfolioService()
