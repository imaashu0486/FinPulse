from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SentimentItem(BaseModel):
    label: str  # 'positive', 'negative', 'neutral'
    score: float  # Normalized between -1.0 and 1.0
    confidence: float  # Model probability or rule coverage
    probabilities: Optional[Dict[str, float]] = None
    engine: str  # 'finbert' or 'lexicon'
    matched_signals: List[str] = Field(default_factory=list)
    text_snippet: str

class SingleTextRequest(BaseModel):
    text: str
    engine: Optional[str] = None

class BatchSentimentRequest(BaseModel):
    texts: List[str]
    engine: Optional[str] = "lexicon"

class BatchSentimentResponse(BaseModel):
    engine_used: str
    total_processed: int
    results: List[SentimentItem]
    aggregate_score: float
    distribution: Dict[str, int]
    positive_ratio: float
    negative_ratio: float
    neutral_ratio: float
