import math
import re
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

STOPWORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "by",
    "of", "is", "are", "was", "were", "what", "which", "who", "whom", "how",
    "when", "where", "why", "next", "year", "plans", "plan", "about", "from",
    "did", "who", "which", "whose", "does", "have", "has", "had"
}

PROMPT_INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?previous\s+instructions",
    r"(?i)you\s+are\s+now\s+dan",
    r"(?i)system\s*:\s*override",
    r"(?i)admin\s+database\s+credentials",
    r"(?i)print\s+(the\s+)?(admin|system)\s+prompt"
]

class HybridChunk:
    def __init__(self, chunk_id: str, article_id: str, title: str, source: str, url: str, published_at: str, text: str):
        self.chunk_id = chunk_id
        self.article_id = article_id
        self.title = title
        self.source = source
        self.url = url
        self.published_at = published_at
        self.text = text
        self.tokens = self._tokenize(text)
        self.dense_vector: Optional[np.ndarray] = None

    def _tokenize(self, s: str) -> List[str]:
        raw = re.findall(r"\b[a-zA-Z0-9_\$]{2,}\b", s.lower())
        return [t for t in raw if t not in STOPWORDS]

class HybridRetriever:
    """
    Implements multi-strategy retrieval:
    1. Lexical BM25 ranking with title weighting and query keyword coverage gating.
    2. Dense semantic vector retrieval via TF-IDF n-gram embedding space with cosine similarity.
    3. Reciprocal Rank Fusion (RRF) combining lexical and dense ranking signals.
    """
    def __init__(self, k_rrf: int = 60):
        self.k_rrf = k_rrf
        self.chunks: List[HybridChunk] = []
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._dense_matrix: Optional[np.ndarray] = None

    def index_documents(self, chunks: List[HybridChunk]):
        self.chunks = chunks
        if not chunks:
            self._dense_matrix = None
            return

        corpus = [f"{c.title}. {c.text}" for c in chunks]
        # Use sub-linear TF-IDF with both word (1, 2) n-grams for semantic robustness
        self._vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            max_features=600,
            stop_words="english"
        )
        self._dense_matrix = self._vectorizer.fit_transform(corpus).toarray()
        for i, c in enumerate(self.chunks):
            c.dense_vector = self._dense_matrix[i]

    def _score_bm25(self, query_tokens: List[str], chunk: HybridChunk) -> float:
        if not query_tokens or not chunk.tokens:
            return 0.0

        matched_count = sum(1 for q in query_tokens if q in chunk.tokens)
        query_coverage = matched_count / float(len(query_tokens))
        min_matched = 2 if len(query_tokens) >= 3 else 1
        if matched_count < min_matched or query_coverage < 0.25:
            return 0.0

        score = 0.0
        doc_len = len(chunk.tokens)
        k1 = 1.2
        b = 0.75
        avg_len = 35.0

        title_tokens = set(re.findall(r"\b[a-zA-Z0-9_\$]{2,}\b", chunk.title.lower()))

        for q in query_tokens:
            tf = chunk.tokens.count(q)
            if tf > 0:
                tf_norm = (tf * (k1 + 1.0)) / (tf + k1 * (1.0 - b + b * (doc_len / avg_len)))
                weight = 2.0 if q in title_tokens else 1.0
                score += (tf_norm * weight)

        max_possible = len(query_tokens) * 3.0
        return min(1.0, round(score / max_possible, 3)) if max_possible > 0 else 0.0

    def search_bm25(self, query: str, top_k: int = 5) -> List[Tuple[HybridChunk, float]]:
        raw_tokens = re.findall(r"\b[a-zA-Z0-9_\$]{2,}\b", query.lower())
        q_tokens = [t for t in raw_tokens if t not in STOPWORDS]
        if not q_tokens:
            return []

        scored = []
        for c in self.chunks:
            s = self._score_bm25(q_tokens, c)
            if s > 0.05:
                scored.append((c, s))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def search_dense(self, query: str, top_k: int = 5, min_sim: float = 0.22) -> List[Tuple[HybridChunk, float]]:
        if self._vectorizer is None or self._dense_matrix is None or not self.chunks:
            return []

        q_vec = self._vectorizer.transform([query]).toarray()
        if np.all(q_vec == 0):
            return []

        sims = cosine_similarity(q_vec, self._dense_matrix)[0]

        scored = []
        for i, s in enumerate(sims):
            if s >= min_sim:  # Calibrated dense similarity threshold
                scored.append((self.chunks[i], float(s)))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def search_hybrid_rrf(self, query: str, top_k: int = 4) -> List[Tuple[HybridChunk, float]]:
        """
        Merges BM25 and Dense ranks using Reciprocal Rank Fusion:
        RRF_score(d) = 1 / (k + rank_bm25) + 1 / (k + rank_dense)
        Applies prompt injection detection and confidence gating.
        """
        # Guard: Check for adversarial prompt injection patterns
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, query):
                return []

        bm25_results = self.search_bm25(query, top_k=top_k * 2)
        
        # If no BM25 matches exist, require strict dense confidence threshold
        dense_min_sim = 0.32 if not bm25_results else 0.20
        dense_results = self.search_dense(query, top_k=top_k * 2, min_sim=dense_min_sim)

        # If neither retrieval channel has confident signals, abstain
        if not bm25_results and not dense_results:
            return []

        rrf_scores: Dict[str, float] = {}
        chunk_map: Dict[str, HybridChunk] = {}

        for rank, (c, _) in enumerate(bm25_results):
            rrf_scores[c.chunk_id] = rrf_scores.get(c.chunk_id, 0.0) + (1.0 / (self.k_rrf + rank + 1))
            chunk_map[c.chunk_id] = c

        for rank, (c, _) in enumerate(dense_results):
            rrf_scores[c.chunk_id] = rrf_scores.get(c.chunk_id, 0.0) + (1.0 / (self.k_rrf + rank + 1))
            chunk_map[c.chunk_id] = c

        sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

        # Context deduplication: suppress duplicate chunks from the same article
        final_results: List[Tuple[HybridChunk, float]] = []
        seen_articles = set()

        for c_id, score in sorted_chunks:
            chunk = chunk_map[c_id]
            if chunk.article_id not in seen_articles:
                final_results.append((chunk, round(score * 100, 3)))
                seen_articles.add(chunk.article_id)
            if len(final_results) >= top_k:
                break

        return final_results
