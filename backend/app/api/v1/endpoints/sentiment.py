from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.schemas.sentiment import SentimentItem, BatchSentimentRequest, BatchSentimentResponse
from app.services.sentiment.sentiment_service import sentiment_service

router = APIRouter()

class SingleTextRequest(BaseModel):
    text: str
    engine: Optional[str] = None

@router.post("/analyze", response_model=SentimentItem)
def analyze_single_text(req: SingleTextRequest):
    """Analyzes financial sentiment of a single statement using either Lexicon or FinBERT."""
    return sentiment_service.analyze_text(req.text, engine=req.engine)

@router.post("/batch", response_model=BatchSentimentResponse)
def analyze_batch_texts(req: BatchSentimentRequest):
    """Batch sentiment classification returning class distributions and aggregate polarity score."""
    return sentiment_service.analyze_batch(req.texts, engine=req.engine)
