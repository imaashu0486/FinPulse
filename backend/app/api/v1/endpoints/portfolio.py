from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, UserContext
from app.schemas.portfolio import HoldingCreate, HoldingResponse, PortfolioSummary
from app.services.portfolio.portfolio_service import portfolio_service

router = APIRouter()

def _resolve_user_id(current_user: Optional[UserContext]) -> str:
    if isinstance(current_user, UserContext):
        return current_user.user_id
    return "dev-user-001"

@router.get("", response_model=PortfolioSummary)
def get_portfolio_summary(
    db: Session = Depends(get_db),
    current_user: Optional[UserContext] = Depends(get_current_user)
):
    """Retrieves current holdings, market valuation, unrealized P&L, risk metrics, and benchmark comparison."""
    user_id = _resolve_user_id(current_user)
    return portfolio_service.get_summary(db, user_id=user_id)

@router.post("/holding", response_model=HoldingResponse)
def add_portfolio_holding(
    holding_in: HoldingCreate,
    db: Session = Depends(get_db),
    current_user: Optional[UserContext] = Depends(get_current_user)
):
    """Adds a new stock position with buy price and quantity to the user's portfolio."""
    user_id = _resolve_user_id(current_user)
    return portfolio_service.add_holding(db, holding_in, user_id=user_id)

@router.delete("/holding/{holding_id}")
def delete_portfolio_holding(
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[UserContext] = Depends(get_current_user)
):
    """Removes a holding position from the user's portfolio."""
    user_id = _resolve_user_id(current_user)
    success = portfolio_service.delete_holding(db, holding_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Holding not found.")
    return {"status": "success", "deleted_id": holding_id}
