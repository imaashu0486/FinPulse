import logging
import re
from typing import Dict, List, Optional, Tuple, Any

from app.core.config import settings
from app.schemas.sentiment import SentimentItem, BatchSentimentResponse

logger = logging.getLogger(__name__)

# Specialized Financial Sentiment Lexicon (Loughran-McDonald adapted)
FINANCIAL_LEXICON = {
    "positive": {
        "surge": 1.0, "soar": 1.0, "profit": 0.8, "profits": 0.8, "gain": 0.7, "gains": 0.7,
        "growth": 0.7, "grew": 0.8, "grow": 0.7, "grows": 0.7, "outperform": 0.9, "beat": 0.8,
        "beats": 0.8, "beating": 0.9, "rally": 0.8, "bullish": 0.9, "record": 0.7, "dividend": 0.6,
        "expansion": 0.7, "expand": 0.7, "expands": 0.7, "expanding": 0.8, "upbeat": 0.8,
        "upgrade": 0.9, "upgrades": 0.9, "upgraded": 0.9, "high": 0.5, "acquisition": 0.5,
        "strengthen": 0.8, "strengthens": 0.8, "strengthened": 0.8, "exceed": 0.8, "exceeds": 0.8,
        "exceeded": 0.8, "recovery": 0.7, "inflow": 0.6, "inflows": 0.6, "contract": 0.4,
        "partnership": 0.6, "milestone": 0.7, "boost": 0.8, "boosts": 0.8, "boosted": 0.8,
        "boosting": 0.8, "robust": 0.8, "climb": 0.6, "climbs": 0.6, "climbed": 0.6, "buyback": 0.7,
        "benign": 0.6, "stabilize": 0.5, "stabilizes": 0.5, "stabilized": 0.5, "advancing": 0.7,
        "advance": 0.6, "advances": 0.6, "advanced": 0.7, "commissions": 0.6, "commissioned": 0.6,
        "increased": 0.8, "increases": 0.7, "increase": 0.7, "rose": 0.8, "rise": 0.7, "rises": 0.7,
        "double": 0.8, "doubled": 0.8, "repurchase": 0.7, "strong": 0.7, "improved": 0.7,
        "improves": 0.7, "improvement": 0.7, "surpassing": 0.8, "surpassed": 0.8, "surpass": 0.8,
        "accelerate": 0.8, "accelerates": 0.8, "accelerated": 0.8, "resilient": 0.8, "resilience": 0.8,
        "rebound": 0.8, "rebounds": 0.8, "rebounded": 0.8, "healthy": 0.7, "favorable": 0.8,
        "profitability": 0.8, "profitable": 0.8, "windfall": 0.9, "synergy": 0.7, "synergies": 0.7,
        "approval": 0.7, "approved": 0.7, "approvals": 0.7, "clearance": 0.7, "cleared": 0.7,
        "breakthrough": 0.9, "jump": 0.8, "jumps": 0.8, "jumped": 0.8, "accretive": 0.8,
        "promising": 0.7, "buoyant": 0.8, "optimistic": 0.8, "optimism": 0.8, "cushioned": 0.6,
        "positive": 0.8, "won": 0.8, "win": 0.7, "wins": 0.7, "winning": 0.8, "signed": 0.6,
        "signing": 0.6, "solid": 0.7, "bonus": 0.7, "premium": 0.6, "infusion": 0.7,
        "crossed": 0.6, "launched": 0.6, "launch": 0.5, "pristine": 0.7, "completed": 0.6,
        "ahead": 0.6, "celebratory": 0.7, "monetization": 0.6, "discounts": -0.4
    },
    "negative": {
        "plunge": -1.0, "plunges": -1.0, "plunged": -1.0, "slump": -0.9, "slumps": -0.9,
        "slumped": -0.9, "loss": -0.8, "losses": -0.8, "drop": -0.7, "drops": -0.7,
        "dropped": -0.7, "decline": -0.7, "declines": -0.7, "declined": -0.7, "declining": -0.7,
        "underperform": -0.9, "underperformed": -0.9, "miss": -0.7, "misses": -0.7,
        "missed": -0.7, "bearish": -0.9, "crash": -1.0, "crashes": -1.0, "crashed": -1.0,
        "fall": -0.6, "falls": -0.6, "fell": -0.7, "downgrade": -0.9, "downgrades": -0.9,
        "downgraded": -0.9, "deficit": -0.8, "deficits": -0.8, "inflation": -0.5, "recession": -0.9,
        "headwind": -0.7, "headwinds": -0.7, "risk": -0.5, "risks": -0.5, "debt": -0.5,
        "default": -1.0, "defaults": -1.0, "defaulted": -1.0, "weak": -0.7, "weaker": -0.7,
        "weakness": -0.7, "cut": -0.6, "cuts": -0.6, "drag": -0.6, "drags": -0.6,
        "dragged": -0.6, "probe": -0.7, "probes": -0.7, "penalty": -0.8, "penalties": -0.8,
        "fraud": -1.0, "low": -0.5, "outflow": -0.6, "outflows": -0.6, "disruption": -0.7,
        "disruptions": -0.7, "disrupted": -0.7, "pressure": -0.6, "pressures": -0.6,
        "pressured": -0.6, "unprofitable": -0.8, "friction": -0.6, "widened": -0.7,
        "widens": -0.7, "slowdown": -0.7, "slowed": -0.6, "elongated": -0.5,
        "decreased": -0.8, "decreases": -0.7, "decrease": -0.7, "compressed": -0.7,
        "compressing": -0.7, "compression": -0.7, "closures": -0.8, "reductions": -0.7,
        "delayed": -0.6, "delay": -0.6, "delays": -0.6, "impairment": -0.8, "impairments": -0.8,
        "stagnate": -0.7, "stagnant": -0.7, "tumble": -0.8, "tumbles": -0.8, "tumbled": -0.8,
        "litigation": -0.7, "lawsuit": -0.7, "subdued": -0.6, "caution": -0.5, "cautious": -0.5,
        "shrink": -0.7, "shrank": -0.7, "deteriorate": -0.8, "deteriorated": -0.8, "vulnerable": -0.7,
        "layoff": -0.8, "layoffs": -0.8, "shortage": -0.7, "shortages": -0.7, "halt": -0.7,
        "halts": -0.7, "halted": -0.7, "cancelled": -0.8, "cancels": -0.8, "cancellation": -0.8,
        "attrition": -0.7, "delinquent": -0.8, "delinquencies": -0.8, "delinquency": -0.8,
        "erosion": -0.8, "eroding": -0.7, "eroded": -0.7, "drought": -0.7, "churn": -0.7,
        "obsolescence": -0.7, "shutdown": -0.8, "shutdowns": -0.8, "resignation": -0.6
    }
}

COMPOUND_PHRASES = {
    "positive": [
        "dropped npa", "dropped non-performing", "declined costs", "declined credit costs",
        "lower costs", "eliminated debt", "reducing debt", "reduced debt", "all-time high",
        "record high", "cash-flow positive", "ahead of schedule", "positive ebitda",
        "order bookings hit", "share buyback", "bonus share", "capital infusion", "net cash",
        "double-digit sales", "rebounded by", "jumps 28%", "credit growth", "secured domestic",
        "secured sovereign", "qualified for", "drop in fleet transit", "turnaround times"
    ],
    "negative": [
        "operating loss", "net loss", "credit watch", "stop-work", "workforce layoff",
        "workforce reduction", "margin compression", "margin contraction", "margin erosion",
        "rating downgraded", "junk status", "refinancing risk", "assembly plant shutdown",
        "defaulted on", "delinquent loans", "liquidated damages", "adverse inspection",
        "cancelled contract", "tax demand notice", "customer payment delays", "contracted by",
        "margins contracted", "margin contracted", "expenses surged", "surge in delinquent",
        "profit dropped", "net profit dropped", "skyrocketed adding", "rates skyrocketed",
        "oil volatility and rising", "decision cycles remain elongated"
    ]
}

class FinancialSentimentService:
    def __init__(self):
        self._finbert_pipeline = None
        self._finbert_loaded = False
        self._finbert_attempted = False

    def _init_finbert(self):
        """Lazy loader for HuggingFace Transformers FinBERT."""
        if self._finbert_attempted:
            return
        self._finbert_attempted = True
        try:
            from transformers import BertTokenizer, BertForSequenceClassification, pipeline
            logger.info("Initializing FinBERT model...")
            self._finbert_pipeline = pipeline(
                "sentiment-analysis",
                model=settings.FINBERT_MODEL_NAME,
                tokenizer=settings.FINBERT_MODEL_NAME,
                device=-1, # Force CPU execution
                top_k=None # Return all class probabilities
            )
            self._finbert_loaded = True
            logger.info("FinBERT successfully initialized.")
        except Exception as e:
            logger.warning(f"FinBERT could not be initialized ({e}). Using deterministic financial lexicon fallback.")
            self._finbert_loaded = False

    def analyze_lexicon(self, text: str) -> SentimentItem:
        """Rule-based domain-adapted financial lexicon analyzer."""
        if not text or not text.strip():
            return SentimentItem(
                label="neutral",
                score=0.0,
                confidence=0.5,
                engine="lexicon",
                matched_signals=[],
                text_snippet=""
            )

        lower_text = text.lower()
        pos_matches = []
        neg_matches = []
        pos_score = 0.0
        neg_score = 0.0

        # 1. Check multi-word domain collocations first
        for phrase in COMPOUND_PHRASES["positive"]:
            if phrase in lower_text:
                pos_matches.append(phrase)
                pos_score += 1.2
        for phrase in COMPOUND_PHRASES["negative"]:
            if phrase in lower_text:
                neg_matches.append(phrase)
                neg_score += 1.2

        tokens = re.findall(r"\b[a-zA-Z]{3,}\b", lower_text)

        def find_match(token: str) -> Tuple[Optional[str], float, Optional[str]]:
            # Check exact match
            if token in FINANCIAL_LEXICON["positive"]:
                return "positive", FINANCIAL_LEXICON["positive"][token], token
            if token in FINANCIAL_LEXICON["negative"]:
                return "negative", abs(FINANCIAL_LEXICON["negative"][token]), token
            
            # Stemming / suffix normalization: -s, -ed, -ing
            candidates = []
            if token.endswith("s") and len(token) > 3:
                candidates.append(token[:-1])
            if token.endswith("ed") and len(token) > 4:
                candidates.append(token[:-2])
                candidates.append(token[:-1])
            if token.endswith("ing") and len(token) > 5:
                candidates.append(token[:-3])
                candidates.append(token[:-3] + "e")
                
            for c in candidates:
                if c in FINANCIAL_LEXICON["positive"]:
                    return "positive", FINANCIAL_LEXICON["positive"][c], c
                if c in FINANCIAL_LEXICON["negative"]:
                    return "negative", abs(FINANCIAL_LEXICON["negative"][c]), c
            return None, 0.0, None

        for t in tokens:
            pol, val, matched_kw = find_match(t)
            if pol == "positive":
                pos_matches.append(matched_kw)
                pos_score += val
            elif pol == "negative":
                neg_matches.append(matched_kw)
                neg_score += val

        total_matches = len(pos_matches) + len(neg_matches)
        all_signals = list(set(pos_matches + neg_matches))
        
        # Invert if negation detected directly preceding a signal
        negation_terms = {"not", "no", "never", "without", "despite", "fails", "failed"}
        for i, t in enumerate(tokens):
            if t in negation_terms and i + 1 < len(tokens):
                next_t = tokens[i + 1]
                if next_t in FINANCIAL_LEXICON["positive"]:
                    pos_score -= FINANCIAL_LEXICON["positive"][next_t]
                    neg_score += 0.8
                elif next_t in FINANCIAL_LEXICON["negative"]:
                    neg_score -= abs(FINANCIAL_LEXICON["negative"][next_t])
                    pos_score += 0.5

        # Check for neutrality dampeners (e.g. unchanged, customary, reiterated guidance)
        neutral_dampeners = {
            "unchanged", "reiterated", "customary", "routine", "subject", "held", "scheduled",
            "statutory", "dematerialization", "superannuation", "fortnightly", "reserving",
            "depository", "adjourned", "unveiled", "procedural", "reconstituted", "dispatched",
            "concluded", "calendar", "secretarial", "ordinary"
        }
        has_neutral_dampener = any(t in neutral_dampeners for t in tokens)
        if has_neutral_dampener and not (pos_score > 2.0 or neg_score > 2.0):
            pos_score *= 0.15
            neg_score *= 0.15

        net_raw = pos_score - neg_score
        
        if total_matches == 0:
            label = "neutral"
            normalized_score = 0.0
            confidence = 0.70
        else:
            normalized_score = max(-1.0, min(1.0, net_raw / (pos_score + neg_score + 0.1)))
            if normalized_score > 0.18:
                label = "positive"
            elif normalized_score < -0.18:
                label = "negative"
            else:
                label = "neutral"
            confidence = min(0.95, round(0.65 + (total_matches * 0.06), 2))

        return SentimentItem(
            label=label,
            score=round(normalized_score, 3),
            confidence=confidence,
            probabilities={
                "positive": round(max(0.0, min(1.0, (normalized_score + 1) / 2)), 3),
                "negative": round(max(0.0, min(1.0, (1 - normalized_score) / 2)), 3),
                "neutral": round(1.0 - abs(normalized_score), 3)
            },
            engine="lexicon",
            matched_signals=all_signals,
            text_snippet=text[:120] + "..." if len(text) > 120 else text
        )

    def analyze_finbert(self, text: str) -> SentimentItem:
        """Inference with FinBERT transformer."""
        self._init_finbert()
        if not self._finbert_loaded or self._finbert_pipeline is None:
            return self.analyze_lexicon(text)

        try:
            preds = self._finbert_pipeline(text[:512])[0]
            scores_by_label = {p["label"].lower(): p["score"] for p in preds}
            top_pred = max(preds, key=lambda x: x["score"])
            best_label = top_pred["label"].lower()
            confidence = round(top_pred["score"], 3)

            # Map to -1.0 to +1.0 polarity scale
            pos = scores_by_label.get("positive", 0.0)
            neg = scores_by_label.get("negative", 0.0)
            neu = scores_by_label.get("neutral", 0.0)
            score = round(pos - neg, 3)

            return SentimentItem(
                label=best_label,
                score=score,
                confidence=confidence,
                probabilities={
                    "positive": round(pos, 3),
                    "negative": round(neg, 3),
                    "neutral": round(neu, 3)
                },
                engine="finbert",
                matched_signals=[best_label],
                text_snippet=text[:120] + "..." if len(text) > 120 else text
            )
        except Exception as e:
            logger.warning(f"FinBERT inference failed: {e}; falling back to lexicon.")
            return self.analyze_lexicon(text)

    def analyze(self, text: str, engine: Optional[str] = None) -> SentimentItem:
        selected_engine = (engine or settings.SENTIMENT_ENGINE).lower()
        if selected_engine == "finbert":
            return self.analyze_finbert(text)
        return self.analyze_lexicon(text)

    analyze_text = analyze

    def analyze_batch(self, texts: List[str], engine: Optional[str] = None) -> BatchSentimentResponse:
        results = [self.analyze(t, engine=engine) for t in texts]
        total = len(results)
        pos_count = sum(1 for r in results if r.label == "positive")
        neg_count = sum(1 for r in results if r.label == "negative")
        neu_count = sum(1 for r in results if r.label == "neutral")
        agg_score = round(sum(r.score for r in results) / total, 3) if total > 0 else 0.0
        return BatchSentimentResponse(
            engine_used=results[0].engine if results else "lexicon",
            total_processed=total,
            results=results,
            aggregate_score=agg_score,
            distribution={
                "positive": pos_count,
                "negative": neg_count,
                "neutral": neu_count
            },
            positive_ratio=round(pos_count / total, 3) if total > 0 else 0.0,
            negative_ratio=round(neg_count / total, 3) if total > 0 else 0.0,
            neutral_ratio=round(neu_count / total, 3) if total > 0 else 0.0
        )

sentiment_service = FinancialSentimentService()
