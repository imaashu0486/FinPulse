import hashlib
import json
import logging
import os
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Set
import feedparser
from bs4 import BeautifulSoup

from app.core.config import settings
from app.schemas.news import NewsArticle, NewsResponse

logger = logging.getLogger(__name__)

DEMO_NEWS_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../../data/demo/demo_news.json")
)

class NewsIntelligenceService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._demo_news: List[Dict[str, Any]] = []
        self._load_demo_news()

    def _load_demo_news(self):
        if os.path.exists(DEMO_NEWS_FILE):
            try:
                with open(DEMO_NEWS_FILE, "r", encoding="utf-8") as f:
                    self._demo_news = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load demo news: {e}")

    def clean_html_snippet(self, raw_html: str) -> str:
        """Strips HTML tags and normalizes whitespace."""
        if not raw_html:
            return ""
        soup = BeautifulSoup(raw_html, "html.parser")
        text = soup.get_text()
        cleaned = re.sub(r"\s+([.,;:!?])", r"\1", text)
        return re.sub(r"\s+", " ", cleaned).strip()

    def calculate_title_similarity(self, title1: str, title2: str) -> float:
        """Token-based Jaccard similarity to detect duplicate financial stories."""
        tokens1 = set(re.findall(r"\w+", title1.lower()))
        tokens2 = set(re.findall(r"\w+", title2.lower()))
        if not tokens1 or not tokens2:
            return 0.0
        intersection = len(tokens1.intersection(tokens2))
        union = len(tokens1.union(tokens2))
        return intersection / float(union)

    def deduplicate_articles(self, articles: List[NewsArticle], similarity_threshold: float = 0.60) -> List[NewsArticle]:
        """Eliminates redundant wire service republications and syndications."""
        unique_articles: List[NewsArticle] = []
        seen_urls: Set[str] = set()

        for art in articles:
            if art.url in seen_urls:
                continue
            is_duplicate = False
            for existing in unique_articles:
                sim = self.calculate_title_similarity(art.title, existing.title)
                if sim >= similarity_threshold:
                    is_duplicate = True
                    break
            if not is_duplicate:
                seen_urls.add(art.url)
                unique_articles.append(art)

        return unique_articles

    def fetch_rss_headlines(self, query: str = "Indian Stock Market NSE NIFTY") -> List[NewsArticle]:
        """Retrieves and parses RSS feed from Google News for the given query."""
        encoded_query = urllib.parse.quote(query)
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
        
        articles: List[NewsArticle] = []
        try:
            feed = feedparser.parse(rss_url)
            for entry in feed.entries[:25]:
                raw_title = entry.get("title", "")
                
                # Split source from title if format is "Headline - Source"
                source_name = "Financial Press"
                clean_title = raw_title
                if " - " in raw_title:
                    parts = raw_title.rsplit(" - ", 1)
                    clean_title = parts[0].strip()
                    source_name = parts[1].strip()
                elif hasattr(entry, "source") and getattr(entry.source, "title", None):
                    source_name = entry.source.title

                url = entry.get("link", "")
                summary_raw = entry.get("summary", "")
                clean_summary = self.clean_html_snippet(summary_raw)
                published_raw = entry.get("published", datetime.now(timezone.utc).isoformat())
                
                art_id = hashlib.md5(url.encode("utf-8")).hexdigest()[:10]
                
                articles.append(NewsArticle(
                    id=art_id,
                    title=clean_title,
                    source=source_name,
                    url=url,
                    published_at=published_raw,
                    summary=clean_summary if clean_summary else clean_title,
                    related_symbols=["^NSEI"],
                    sentiment_label="neutral",
                    sentiment_score=0.0,
                    confidence=0.5,
                    is_synthetic=False,
                    retrieved_at=datetime.now(timezone.utc).isoformat()
                ))
        except Exception as e:
            logger.warning(f"Live RSS ingestion failed for '{query}': {e}")
            
        return articles

    def _extract_search_keywords(self, query: Optional[str], symbol: Optional[str]) -> str:
        """
        Translates conversational user queries and ticker symbols into high-yield
        keywords optimized for Google News RSS retrieval.
        """
        # If symbol provided, resolve to company name from catalog if possible
        company_hint = ""
        if symbol:
            norm_sym = symbol.strip().upper()
            from app.services.market_data.catalog import INSTRUMENT_CATALOG
            for item in INSTRUMENT_CATALOG:
                if item["symbol"].upper() == norm_sym or item["symbol"].upper() == f"{norm_sym}.NS":
                    # Clean company name (e.g. 'Reliance Industries Ltd.' -> 'Reliance Industries')
                    clean_name = re.sub(r"(?i)\s+(ltd\.?|limited|corp\.?|corporation|inc\.?)\s*$", "", item["name"]).strip()
                    company_hint = clean_name
                    break
            if not company_hint:
                clean_sym = norm_sym.replace(".NS", "").replace("^", "")
                company_hint = f"{clean_sym} share"

        if not query:
            return company_hint or "Indian Stock Market NSE NIFTY"

        # Check for known major companies/sectors in query text
        q_lower = query.lower()
        matched_entities = []
        entity_map = {
            "reliance": "Reliance Industries",
            "hdfc": "HDFC Bank",
            "tcs": "TCS Tata Consultancy",
            "infosys": "Infosys",
            "infy": "Infosys",
            "icici": "ICICI Bank",
            "sbi": "State Bank of India SBI",
            "state bank": "State Bank of India",
            "tata motors": "Tata Motors",
            "maruti": "Maruti Suzuki",
            "wipro": "Wipro",
            "bharti": "Bharti Airtel",
            "airtel": "Bharti Airtel",
            "it sector": "Indian IT sector tech stocks",
            "banking sector": "Indian banking sector banks",
            "pharma": "Indian pharma healthcare stocks",
            "auto sector": "Indian auto automobile stocks",
            "nifty": "NIFTY 50 Indian market",
            "sensex": "BSE Sensex Indian market",
            "aster": "Aster DM Healthcare",
        }
        for k, v in entity_map.items():
            if k in q_lower:
                matched_entities.append(v)

        if matched_entities:
            return " ".join(matched_entities[:2])

        if company_hint:
            return company_hint

        # Strip conversational filler to retain core financial keywords
        filler_patterns = [
            r"(?i)^(what\s+are\s+the\s+latest\s+(available\s+)?developments\s+(affecting|regarding|in)\s+)",
            r"(?i)^(summarize\s+recent\s+)",
            r"(?i)^(why\s+has\s+the\s+)",
            r"(?i)^(explain\s+how\s+)",
            r"(?i)^(tell\s+me\s+about\s+)",
            r"(?i)^(what\s+evidence\s+supports\s+(the\s+latest\s+reported\s+developments\s+in\s+)?)",
            r"(?i)^(compare\s+the\s+available\s+news\s+sentiment\s+around\s+)",
            r"(?i)\s+(been\s+in\s+the\s+news\??)$",
            r"(?i)\s+(financial\s+headlines\??)$",
            r"(?i)\s+(affect\s+financial\s+companies\??)$",
        ]
        cleaned_q = query
        for pat in filler_patterns:
            cleaned_q = re.sub(pat, "", cleaned_q).strip()

        # Remove trailing question mark and punctuation
        cleaned_q = re.sub(r"[?!.,;:]+$", "", cleaned_q).strip()

        # If substantial query remains, append Indian market context if helpful
        if len(cleaned_q) > 2:
            return f"{cleaned_q} India stock market"

        return "Indian Stock Market NSE NIFTY"

    def get_news(
        self,
        symbol: Optional[str] = None,
        query: Optional[str] = None,
        source: Optional[str] = None,
        sentiment: Optional[str] = None,
        limit: int = 20
    ) -> NewsResponse:
        cache_key = f"{symbol}_{query}_{source}_{sentiment}_{limit}"
        now = datetime.now(timezone.utc)
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if (now - entry["timestamp"]).total_seconds() < settings.DATA_CACHE_TTL_SECONDS:
                return entry["data"]

        raw_articles: List[NewsArticle] = []
        is_synthetic = False
        message = None

        search_term = self._extract_search_keywords(query, symbol)
        
        # In normal mode (DEMO_MODE=False), fetch real RSS headlines
        if not (settings.DEMO_MODE and settings.ALLOW_SYNTHETIC_DATA):
            raw_articles = self.fetch_rss_headlines(search_term)
            if not raw_articles:
                message = "No relevant published financial news was retrieved for the selected period."
        else:
            # Deterministic fixtures strictly for isolated unit tests / demo mode
            is_synthetic = True
            for item in self._demo_news:
                if symbol and item.get("related_symbols"):
                    norm_sym = symbol.strip().upper()
                    if not any(norm_sym in s.upper() for s in item["related_symbols"]):
                        continue
                raw_articles.append(NewsArticle(**item))

        # Deduplicate
        deduped = self.deduplicate_articles(raw_articles)

        # Apply source filter
        if source:
            deduped = [a for a in deduped if source.lower() in a.source.lower()]

        # Apply sentiment filter
        if sentiment:
            deduped = [a for a in deduped if a.sentiment_label.lower() == sentiment.lower()]

        final_articles = deduped[:limit]

        # Calculate aggregations
        source_counts: Dict[str, int] = {}
        sentiment_dist = {"positive": 0, "negative": 0, "neutral": 0}

        for a in final_articles:
            source_counts[a.source] = source_counts.get(a.source, 0) + 1
            lbl = a.sentiment_label.lower()
            if lbl in sentiment_dist:
                sentiment_dist[lbl] += 1
            else:
                sentiment_dist["neutral"] += 1

        response = NewsResponse(
            total=len(final_articles),
            articles=final_articles,
            source_counts=source_counts,
            sentiment_distribution=sentiment_dist,
            last_updated=now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            is_synthetic=is_synthetic,
            message=message
        )

        self._cache[cache_key] = {"data": response, "timestamp": now}
        return response

news_service = NewsIntelligenceService()
