from typing import List, Optional
from pydantic import BaseModel

class WatchlistItemCreate(BaseModel):
    symbol: str
    notes: Optional[str] = None

class WatchlistItemResponse(BaseModel):
    id: int
    symbol: str
    name: str
    exchange: str
    current_price: float
    change: float
    change_percent: float
    day_high: float
    day_low: float
    added_at: str
    notes: Optional[str] = None
    is_synthetic: bool = False
