import os
from typing import List, Union, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinPulse AI"
    VERSION: str = "5.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"
    
    # Store as string in env to prevent JSONDecodeError in pydantic-settings, parse via validator
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://127.0.0.1:3000"
    
    @field_validator("CORS_ORIGINS", mode="after")
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    # Storage
    DATABASE_URL: str = "sqlite:///./finpulse.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Strict Provenance Flags (Non-Negotiable Requirement 1)
    DEMO_MODE: bool = False
    ALLOW_SYNTHETIC_DATA: bool = False
    DATA_CACHE_TTL_SECONDS: int = 300
    DEFAULT_BENCHMARK: str = "^NSEI"
    
    # Market Data Providers ('upstox', 'angelone', 'yfinance', 'none')
    MARKET_DATA_PROVIDER: str = "upstox"
    ENABLE_LIVE_YFINANCE: bool = True
    
    # Upstox Developer API (OAuth 2.0)
    UPSTOX_API_KEY: str = ""
    UPSTOX_API_SECRET: str = ""
    UPSTOX_REDIRECT_URI: str = "http://localhost:8000/api/v1/market/provider/upstox/callback"
    UPSTOX_ACCESS_TOKEN: str = ""
    
    # Angel One SmartAPI
    ANGELONE_API_KEY: str = ""
    ANGELONE_CLIENT_CODE: str = ""
    ANGELONE_PASSWORD: str = ""
    ANGELONE_TOTP_KEY: str = ""
    ANGELONE_REDIRECT_URL: str = "http://localhost:8000/api/v1/market/provider/angelone/callback"
    
    # Supabase Authentication & PostgreSQL
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    AUTH_REQUIRED: bool = False  # Set to True when Supabase credentials are configured
    
    # AI / LLM Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    
    # Sentiment Engine: 'lexicon' or 'finbert'
    SENTIMENT_ENGINE: str = "lexicon"
    FINBERT_MODEL_NAME: str = "ProsusAI/finbert"
    
    # Embedding Configuration: 'sentence_transformers' or 'dense_vector'
    EMBEDDING_PROVIDER: str = "dense_vector"
    SENTENCE_TRANSFORMER_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env")),
        extra="ignore"
    )

settings = Settings()
