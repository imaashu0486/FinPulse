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

@router.post("/diagnostics")
def get_rag_diagnostics(req: RAGChatRequest):
    """Provides full step-by-step explainable diagnostics for the Explainable RAG Research Lab."""
    return rag_service.diagnose_query(
        query=req.query,
        symbol=req.symbol,
        top_k=req.top_k
    )
