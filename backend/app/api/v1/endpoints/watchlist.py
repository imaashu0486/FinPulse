from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, UserContext
from app.schemas.watchlist import WatchlistItemCreate, WatchlistItemResponse
from app.services.watchlist_service import watchlist_service

router = APIRouter()

def _resolve_user_id(current_user: Optional[UserContext]) -> str:
    if isinstance(current_user, UserContext):
        return current_user.user_id
    return "dev-user-001"

@router.get("", response_model=List[WatchlistItemResponse])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: Optional[UserContext] = Depends(get_current_user)
):
    """Retrieves monitored stocks on the user's watchlist with current prices and day changes."""
    user_id = _resolve_user_id(current_user)
    return watchlist_service.get_watchlist(db, user_id=user_id)

@router.post("", response_model=WatchlistItemResponse)
def add_to_watchlist(
    item_in: WatchlistItemCreate,
    db: Session = Depends(get_db),
    current_user: Optional[UserContext] = Depends(get_current_user)
):
    """Appends an NSE security symbol to the user's watchlist."""
    user_id = _resolve_user_id(current_user)
    return watchlist_service.add_to_watchlist(db, item_in, user_id=user_id)

@router.delete("/{item_id}")
def remove_from_watchlist(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[UserContext] = Depends(get_current_user)
):
    """Removes a security from the watchlist."""
    user_id = _resolve_user_id(current_user)
    success = watchlist_service.remove_from_watchlist(db, item_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Watchlist item not found.")
    return {"status": "success", "deleted_id": item_id}
