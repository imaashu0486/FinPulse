from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HoldingBase(BaseModel):
    symbol: str
    quantity: float
    buy_price: float
    buy_date: Optional[str] = None
    notes: Optional[str] = None

class HoldingCreate(HoldingBase):
    pass

class HoldingResponse(HoldingBase):
    id: int
    name: str
    current_price: float
    invested_amount: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    weight_percent: float
    is_synthetic: bool = False

class PortfolioSummary(BaseModel):
    holdings: List[HoldingResponse]
    total_invested: float
    total_current_value: float
    total_unrealized_pnl: float
    total_return_percent: float
    holdings_count: int
    asset_allocation: List[Dict[str, Any]]
    annualized_volatility: float
    max_drawdown: float
    benchmark_comparison: Dict[str, Any]
    last_updated: str
