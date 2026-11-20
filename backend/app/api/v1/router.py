from fastapi import APIRouter

from app.api.v1.endpoints import (
    market,
    news,
    sentiment,
    rag,
    portfolio,
    watchlist,
    report,
    system,
)

api_router = APIRouter()

api_router.include_router(market.router, prefix="/market", tags=["Market Data & Indicators"])
api_router.include_router(news.router, prefix="/news", tags=["Financial News Intelligence"])
api_router.include_router(sentiment.router, prefix="/sentiment", tags=["Sentiment Analysis"])
api_router.include_router(rag.router, prefix="/rag", tags=["RAG & AI Assistant"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio Analytics"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist Management"])
api_router.include_router(report.router, prefix="/report", tags=["Research Reports"])
api_router.include_router(system.router, prefix="/system", tags=["System Health & Status"])
