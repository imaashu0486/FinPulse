from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SourceCitation(BaseModel):
    id: str
    title: str
    source: str
    url: str
    published_at: str
    excerpt: str
    relevance_score: float

class RAGChatRequest(BaseModel):
    query: str
    symbol: Optional[str] = None
    top_k: int = 4
    include_market_context: bool = True

class RAGChatResponse(BaseModel):
    query: str
    answer: str
    citations: List[SourceCitation]
    retrieved_chunks_count: int
    model_used: str
    latency_ms: float
    is_grounded: bool
    is_generative: bool = False
    fallback_reason: Optional[str] = None
    retrieval_mode: str = "hybrid_bm25_dense_rrf"
    disclaimer: str = (
        "AI-generated market research is for informational and educational purposes only "
        "and does not constitute certified investment advice or financial recommendations."
    )
