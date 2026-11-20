from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=True, index=True, default="default-user")
    symbol = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=True)
    exchange = Column(String(20), default="NSE")
    added_at = Column(DateTime, default=utc_now)
    notes = Column(Text, nullable=True)

class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), nullable=True, index=True, default="default-user")
    symbol = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=True)
    quantity = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    buy_date = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class StoredNewsArticle(Base):
    __tablename__ = "stored_news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    source = Column(String(150), nullable=False)
    url = Column(String(1000), unique=True, nullable=False)
    published_at = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    related_symbols = Column(String(200), nullable=True)
    sentiment_label = Column(String(50), nullable=True)
    sentiment_score = Column(Float, nullable=True)
    sentiment_engine = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now)

class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(String(100), primary_key=True, index=True)
    user_id = Column(String(100), nullable=True, index=True, default="default-user")
    symbol = Column(String(50), nullable=False, index=True)
    title = Column(String(250), nullable=False)
    executive_summary = Column(Text, nullable=False)
    full_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
