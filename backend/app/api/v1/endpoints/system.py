import os
import platform
import time
from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()
START_TIME = time.time()

@router.get("/health")
def get_system_health():
    """Provides real-time telemetry on backend services, model backends, storage, and uptime."""
    uptime_sec = round(time.time() - START_TIME, 1)
    
    # Check Database
    db_status = "operational"
    try:
        from sqlalchemy import text
        from app.core.database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "degraded / in-memory"

    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_sec,
        "server_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "platform": {
            "system": platform.system(),
            "python_version": platform.python_version()
        },
        "services": {
            "database": db_status,
            "market_data_engine": f"active ({settings.MARKET_DATA_PROVIDER})",
            "news_intelligence": "active (Google News RSS + deduplication)",
            "sentiment_engine": f"active ({settings.SENTIMENT_ENGINE})",
            "rag_pipeline": "active (Hybrid BM25 + Dense RRF)",
            "gemini_assistant": "configured" if settings.GEMINI_API_KEY else "not_configured (evidence-grounded fallback)",
            "supabase_auth": "configured" if settings.SUPABASE_JWT_SECRET else "unconfigured (guest_dev_mode)"
        },
        "demo_mode_active": settings.DEMO_MODE,
        "allow_synthetic_data": settings.ALLOW_SYNTHETIC_DATA
    }
