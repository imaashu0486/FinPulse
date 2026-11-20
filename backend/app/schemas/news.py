from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class NewsArticle(BaseModel):
    id: str
    title: str
    source: str
    url: str
    published_at: str
    summary: str
    related_symbols: List[str] = Field(default_factory=list)
    sentiment_label: str = "neutral"
    sentiment_score: float = 0.0
    confidence: float = 0.0
    matched_signals: List[str] = Field(default_factory=list)
    is_synthetic: bool = False
    retrieved_at: str = Field(default="2026-11-19T00:00:00Z")

class NewsFilterParams(BaseModel):
    symbol: Optional[str] = None
    query: Optional[str] = None
    source: Optional[str] = None
    sentiment: Optional[str] = None
    limit: int = 25

class NewsResponse(BaseModel):
    total: int
    articles: List[NewsArticle]
    source_counts: Dict[str, int]
    sentiment_distribution: Dict[str, int]
    last_updated: str
    is_synthetic: bool = False
    message: Optional[str] = None
