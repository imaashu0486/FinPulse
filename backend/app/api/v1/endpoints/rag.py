from fastapi import APIRouter
from app.schemas.rag import RAGChatRequest, RAGChatResponse
from app.services.rag.rag_service import rag_service

router = APIRouter()

@router.post("/chat", response_model=RAGChatResponse)
def query_rag_assistant(req: RAGChatRequest):
    """Answers financial questions using grounded context from ingested news with source citations."""
    return rag_service.query_rag(
        query=req.query,
        symbol=req.symbol,
        top_k=req.top_k
    )
