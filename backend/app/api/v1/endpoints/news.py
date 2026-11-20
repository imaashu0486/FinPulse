from typing import Optional
from fastapi import APIRouter, Query

from app.schemas.news import NewsResponse
from app.services.news.news_service import news_service

router = APIRouter()

@router.get("", response_model=NewsResponse)
def get_financial_news(
    symbol: Optional[str] = None,
    query: Optional[str] = None,
    source: Optional[str] = None,
    sentiment: Optional[str] = None,
    limit: int = 20
):
    """Retrieves financial headlines, deduplicates syndications, and aggregates sentiment distribution."""
    return news_service.get_news(
        symbol=symbol,
        query=query,
        source=source,
        sentiment=sentiment,
        limit=limit
    )
