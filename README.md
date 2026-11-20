# FinPulse AI — Financial News & Market Intelligence Platform (V2.0)

[![CI Pipeline](https://github.com/ashish0486/finpulse-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ashish0486/finpulse-ai/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.141-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg?logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.12.6-3776AB.svg?logo=python)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

FinPulse AI is a production-grade, AI-powered financial market intelligence and research platform engineered specifically for the **National Stock Exchange of India (NSE)** with multi-asset global equity extensibility.

Developed as a capstone project for the **IBM SkillsBuild Generative AI & Cloud Computing Internship**, organized through **BharatCares** in association with **AICTE**.

---

## Key Features

1. **Market Overview Dashboard:** Benchmark index tracking (NIFTY 50, Bank NIFTY, large-caps) with live sparklines, day changes, and sentiment pulse.
2. **NSE Stock Explorer:** Full OHLCV historical candlestick/line charts, technical indicators (SMA 20/50/200, EMA 12/26, RSI 14, MACD, Bollinger Bands), and risk analytics (annualized volatility, max drawdown).
3. **Financial News Intelligence:** Ingestion pipeline from Indian financial press with token-level Jaccard similarity deduplication ($J \ge 0.60$) and publisher provenance.
4. **Financial Sentiment Analysis:** Dual-engine architecture:
   - *Model 1:* Loughran-McDonald domain financial lexicon (80.0% measured accuracy, sub-millisecond execution).
   - *Model 2:* Hugging Face Transformers FinBERT (`ProsusAI/finbert`).
5. **Retrieval-Augmented Generation (RAG):** Anti-hallucinating research assistant that retrieves overlapping sentence chunks, scores via BM25 with query coverage gating, enforces inline bracket citations, and automatically abstains on out-of-corpus queries.
6. **Multi-Stock Relative Return Comparison:** Aligns multiple securities on a normalized Base=100 scale over identical trading calendars.
7. **Manual Portfolio Analytics:** Holding tracking, real-time valuation, unrealized P&L, weight distribution, and alpha comparison against NIFTY 50.
8. **Institutional Research Dossier Generator:** Compiles an 11-section research report downloadable as Microsoft Word (`.docx`).
9. **Zero-Key Deterministic Demo Mode:** Fully functional offline mode using verified synthetic demo fixtures (`data/demo/`).

---

## Quick Start (Local Run)

### 1. Clone & Configure
```bash
git clone https://github.com/ashish0486/finpulse-ai.git
cd finpulse-ai
cp .env.example .env
```

### 2. Start Backend Application
```bash
# Windows PowerShell:
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Linux / macOS:
export PYTHONPATH=backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Open Web Console
- **Interactive Fintech Console:** [http://localhost:8000/](http://localhost:8000/)
- **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Running Automated Tests

```bash
# Run complete test suite (28 tests)
$env:PYTHONPATH="backend"
pytest backend/tests -v

# Run sentiment benchmark evaluation
python backend/app/services/sentiment/evaluate_sentiment.py

# Run RAG retrieval benchmark evaluation
python backend/app/services/rag/evaluate_rag.py
```

---

## Docker & Cloud Deployment

```bash
# Multi-container orchestration (Backend, Frontend, PostgreSQL, Redis)
docker compose up -d --build
```
See [docs/DEPLOYMENT.md](file:///c:/Projects/FinPulse/docs/DEPLOYMENT.md) for full deployment instructions.

---

## Academic & Evaluation Deliverables

- **Academic Project Report (23 Sections):** [research/FINPULSE_ACADEMIC_REPORT.md](file:///c:/Projects/FinPulse/research/FINPULSE_ACADEMIC_REPORT.md) | [.docx](file:///c:/Projects/FinPulse/research/FINPULSE_ACADEMIC_REPORT.docx)
- **15-Slide Presentation:** [presentation/FINPULSE_PRESENTATION_SLIDES.md](file:///c:/Projects/FinPulse/presentation/FINPULSE_PRESENTATION_SLIDES.md) | [.docx](file:///c:/Projects/FinPulse/presentation/FINPULSE_PRESENTATION.docx)
- **Speaker Scripts:** [5-Minute Script](file:///c:/Projects/FinPulse/presentation/SPEAKER_NOTES_5MIN.md) | [10-Minute Script](file:///c:/Projects/FinPulse/presentation/SPEAKER_NOTES_10MIN.md)
- **50 Technical Viva Q&As:** [docs/VIVA_PREPARATION_50_QA.md](file:///c:/Projects/FinPulse/docs/VIVA_PREPARATION_50_QA.md)
- **Demo Walkthrough:** [presentation/DEMO_WALKTHROUGH.md](file:///c:/Projects/FinPulse/presentation/DEMO_WALKTHROUGH.md)
- **Evaluation Reports:** [Sentiment Evaluation](file:///c:/Projects/FinPulse/reports/SENTIMENT_EVALUATION.md) | [RAG Evaluation](file:///c:/Projects/FinPulse/reports/RAG_EVALUATION.md) | [Performance Report](file:///c:/Projects/FinPulse/reports/PERFORMANCE_REPORT.md)

---

## Author & Academic Information

- **Student:** Ashish Ranjan
- **Roll Number:** 231210027
- **Institution:** National Institute of Technology Delhi
- **Internship:** IBM SkillsBuild Generative AI & Cloud Computing
- **Organized By:** BharatCares in association with AICTE
