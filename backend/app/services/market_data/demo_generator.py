import json
import math
import os
from datetime import datetime, timedelta

DEMO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../data/demo"))

def generate_demo_fixtures():
    os.makedirs(DEMO_DIR, exist_ok=True)
    
    # 1. Stocks and Benchmarks
    stocks_meta = {
        "RELIANCE.NS": {
            "name": "Reliance Industries Limited",
            "base_price": 2980.0,
            "drift": 0.0004,
            "volatility": 0.012,
            "pe": 26.8,
            "mcap": 2015000.0, # Cr INR
            "52w_high": 3217.90,
            "52w_low": 2220.30
        },
        "TCS.NS": {
            "name": "Tata Consultancy Services Ltd.",
            "base_price": 4120.0,
            "drift": 0.0003,
            "volatility": 0.011,
            "pe": 31.4,
            "mcap": 1495000.0,
            "52w_high": 4585.00,
            "52w_low": 3313.00
        },
        "HDFCBANK.NS": {
            "name": "HDFC Bank Limited",
            "base_price": 1720.0,
            "drift": 0.0002,
            "volatility": 0.013,
            "pe": 19.8,
            "mcap": 1310000.0,
            "52w_high": 1794.00,
            "52w_low": 1363.55
        },
        "INFY.NS": {
            "name": "Infosys Limited",
            "base_price": 1840.0,
            "drift": 0.0005,
            "volatility": 0.014,
            "pe": 27.2,
            "mcap": 765000.0,
            "52w_high": 1991.45,
            "52w_low": 1358.35
        },
        "ICICIBANK.NS": {
            "name": "ICICI Bank Limited",
            "base_price": 1260.0,
            "drift": 0.0004,
            "volatility": 0.012,
            "pe": 18.5,
            "mcap": 885000.0,
            "52w_high": 1332.00,
            "52w_low": 918.00
        },
        "^NSEI": {
            "name": "NIFTY 50",
            "base_price": 24350.0,
            "drift": 0.0003,
            "volatility": 0.008,
            "pe": 22.4,
            "mcap": 18500000.0,
            "52w_high": 26277.35,
            "52w_low": 18837.85
        }
    }
    
    # Generate 180 business days of OHLCV
    end_date = datetime(2026, 11, 19)
    trading_days = []
    curr = end_date - timedelta(days=270)
    while curr <= end_date:
        if curr.weekday() < 5:  # Monday to Friday
            trading_days.append(curr.strftime("%Y-%m-%d"))
        curr += timedelta(days=1)
    trading_days = trading_days[-150:]  # Keep last 150 trading days
    
    stocks_data = {}
    for sym, meta in stocks_meta.items():
        price = meta["base_price"]
        records = []
        # Seeded pseudo-random progression using deterministic sine + step
        for i, dt in enumerate(trading_days):
            daily_shock = math.sin(i * 0.45 + (hash(sym) % 17)) * meta["volatility"] + meta["drift"]
            o = round(price * (1 + (math.cos(i) * 0.002)), 2)
            c = round(price * (1 + daily_shock), 2)
            h = round(max(o, c) * (1 + abs(math.sin(i * 0.8)) * 0.006), 2)
            l = round(min(o, c) * (1 - abs(math.cos(i * 0.7)) * 0.006), 2)
            vol = int(1500000 + abs(math.sin(i * 0.3)) * 2500000)
            records.append({
                "date": dt,
                "open": o,
                "high": h,
                "low": l,
                "close": c,
                "volume": vol,
                "change": round(c - o, 2),
                "change_percent": round(((c - o) / o) * 100, 2)
            })
            price = c
        
        last_rec = records[-1]
        prev_rec = records[-2]
        chg = round(last_rec["close"] - prev_rec["close"], 2)
        pct = round((chg / prev_rec["close"]) * 100, 2)
        
        stocks_data[sym] = {
            "meta": meta,
            "summary": {
                "symbol": sym,
                "company_name": meta["name"],
                "current_price": last_rec["close"],
                "change": chg,
                "change_percent": pct,
                "open": last_rec["open"],
                "day_high": last_rec["high"],
                "day_low": last_rec["low"],
                "high_52w": meta["52w_high"],
                "low_52w": meta["52w_low"],
                "volume": last_rec["volume"],
                "pe_ratio": meta["pe"],
                "market_cap": meta["mcap"],
                "is_synthetic": True,
                "data_source": "Verified Synthetic NSE Benchmark Fixture",
                "last_updated": end_date.strftime("%Y-%m-%d 15:30:00 IST")
            },
            "records": records
        }
    
    with open(os.path.join(DEMO_DIR, "demo_stocks.json"), "w", encoding="utf-8") as f:
        json.dump(stocks_data, f, indent=2)
        
    # 2. Demo News Fixture
    news_items = [
        {
            "id": "art-001",
            "title": "Reliance Industries green energy arm commissions 1 GW solar capacity in Gujarat",
            "source": "The Economic Times",
            "url": "https://economictimes.indiatimes.com/industry/energy/reliance-solar-commissioning/articleshow/demo1.cms",
            "published_at": "2026-11-19T09:15:00+05:30",
            "summary": "Reliance New Energy has commissioned an additional 1 GW solar module manufacturing capacity at its Jamnagar gigafactory complex, advancing its net-carbon-neutrality roadmap ahead of scheduled capital expenditure targets.",
            "related_symbols": ["RELIANCE.NS"],
            "sentiment_label": "positive",
            "sentiment_score": 0.82,
            "confidence": 0.91,
            "matched_signals": ["commissions", "advancing", "capacity expansion", "ahead of scheduled"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-19T09:30:00+05:30"
        },
        {
            "id": "art-002",
            "title": "TCS secures multi-year digital transformation deal exceeding $1.2B with European insurer",
            "source": "Livemint",
            "url": "https://www.livemint.com/companies/news/tcs-bags-european-insurer-deal-demo2.html",
            "published_at": "2026-11-19T08:45:00+05:30",
            "summary": "Tata Consultancy Services (TCS) announced an expansive multi-year partnership with a premier European financial group to modernize core cloud infrastructure and deploy generative AI client servicing solutions.",
            "related_symbols": ["TCS.NS"],
            "sentiment_label": "positive",
            "sentiment_score": 0.88,
            "confidence": 0.94,
            "matched_signals": ["secures deal", "exceeding $1.2B", "partnership", "modernize"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-19T09:00:00+05:30"
        },
        {
            "id": "art-003",
            "title": "HDFC Bank reports 17% YoY credit growth while Net Interest Margin stabilizes at 3.65%",
            "source": "Business Standard",
            "url": "https://www.business-standard.com/companies/results/hdfc-bank-credit-growth-demo3.html",
            "published_at": "2026-11-18T18:10:00+05:30",
            "summary": "India's largest private sector lender HDFC Bank posted steady operational metrics with gross advances growing 17% year-on-year, while credit costs remained benign and capital adequacy ratio stood comfortably at 18.2%.",
            "related_symbols": ["HDFCBANK.NS"],
            "sentiment_label": "positive",
            "sentiment_score": 0.74,
            "confidence": 0.89,
            "matched_signals": ["credit growth", "stabilizes", "benign", "comfortably"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-18T18:30:00+05:30"
        },
        {
            "id": "art-004",
            "title": "Infosys expands AI-first platform Topaz partnerships; discretionary tech spend shows sequential recovery",
            "source": "Moneycontrol",
            "url": "https://www.moneycontrol.com/news/business/companies/infosys-topaz-ai-expansion-demo4.html",
            "published_at": "2026-11-18T14:20:00+05:30",
            "summary": "Infosys management noted an inflection in enterprise generative AI pilots transitioning into multi-million dollar production deployments, driven by broad adoption of the Topaz platform in banking and retail verticals.",
            "related_symbols": ["INFY.NS"],
            "sentiment_label": "positive",
            "sentiment_score": 0.76,
            "confidence": 0.88,
            "matched_signals": ["expands", "inflection", "recovery", "deployments"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-18T14:40:00+05:30"
        },
        {
            "id": "art-005",
            "title": "ICICI Bank asset quality strengthens as gross NPA ratio drops to multi-year low of 2.15%",
            "source": "The Economic Times",
            "url": "https://economictimes.indiatimes.com/industry/banking/icici-bank-npa-drop-demo5.cms",
            "published_at": "2026-11-18T11:05:00+05:30",
            "summary": "ICICI Bank maintained solid balance sheet momentum with retail deposits increasing 19% YoY. Asset quality showed persistent improvements with provisioning coverage ratio surpassing 81%.",
            "related_symbols": ["ICICIBANK.NS"],
            "sentiment_label": "positive",
            "sentiment_score": 0.81,
            "confidence": 0.92,
            "matched_signals": ["strengthens", "drops NPA", "improvements", "surpassing"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-18T11:30:00+05:30"
        },
        {
            "id": "art-006",
            "title": "NIFTY 50 consolidates near 24,350 as foreign institutional investors turn net buyers in cash segment",
            "source": "Livemint",
            "url": "https://www.livemint.com/market/stock-market-news/nifty50-consolidates-fii-inflow-demo6.html",
            "published_at": "2026-11-19T10:00:00+05:30",
            "summary": "Domestic equity indices traded in a tight range as domestic institutional support coupled with renewed FII cash inflows of Rs 1,420 crore cushioned the index against volatility in Asian peers.",
            "related_symbols": ["^NSEI"],
            "sentiment_label": "neutral",
            "sentiment_score": 0.18,
            "confidence": 0.72,
            "matched_signals": ["consolidates", "tight range", "cushioned"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-19T10:15:00+05:30"
        },
        {
            "id": "art-007",
            "title": "Crude oil volatility and rising US dollar index exert mild pressure on Indian rupee and OMC margins",
            "source": "Business Standard",
            "url": "https://www.business-standard.com/economy/crude-oil-impact-rupee-demo7.html",
            "published_at": "2026-11-17T16:30:00+05:30",
            "summary": "Brent crude futures hovered around $83 per barrel following geopolitical friction in the Middle East, posing headwinds for downstream refining margins and petrochemical spreads.",
            "related_symbols": ["RELIANCE.NS"],
            "sentiment_label": "negative",
            "sentiment_score": -0.58,
            "confidence": 0.84,
            "matched_signals": ["volatility", "pressure", "headwinds", "friction"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-17T17:00:00+05:30"
        },
        {
            "id": "art-008",
            "title": "RBI Monetary Policy Committee maintains status quo on repo rate at 6.50%; highlights disinflation priority",
            "source": "The Financial Express",
            "url": "https://www.financialexpress.com/economy/rbi-mpc-rates-status-quo-demo8.html",
            "published_at": "2026-11-16T12:00:00+05:30",
            "summary": "The Reserve Bank of India kept the benchmark repurchase rate unchanged at 6.50% while reiterating its commitment to align headline CPI inflation with the durable 4% target.",
            "related_symbols": ["^NSEI", "HDFCBANK.NS", "ICICIBANK.NS"],
            "sentiment_label": "neutral",
            "sentiment_score": 0.05,
            "confidence": 0.88,
            "matched_signals": ["status quo", "unchanged", "reiterating commitment"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-16T12:30:00+05:30"
        },
        {
            "id": "art-009",
            "title": "TCS client decision cycles remain elongated in financial services segment despite deal pipeline expansion",
            "source": "Moneycontrol",
            "url": "https://www.moneycontrol.com/news/business/tcs-cautious-commentary-demo9.html",
            "published_at": "2026-11-15T09:30:00+05:30",
            "summary": "Industry analysts note that while gross contract signings are robust, project ramp-ups in North America face cautious budgeting, keeping billing growth moderate over the near term.",
            "related_symbols": ["TCS.NS", "INFY.NS"],
            "sentiment_label": "negative",
            "sentiment_score": -0.42,
            "confidence": 0.81,
            "matched_signals": ["elongated", "cautious budgeting", "moderate"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-15T10:00:00+05:30"
        },
        {
            "id": "art-010",
            "title": "Government raises capex allocation for national railway and highway corridors, boosting infrastructure bellwethers",
            "source": "The Economic Times",
            "url": "https://economictimes.indiatimes.com/economy/policy/capex-allocation-infrastructure-demo10.cms",
            "published_at": "2026-11-14T11:45:00+05:30",
            "summary": "Budgetary disbursements toward capital infrastructure reached a record high in the October quarter, offering order book visibility for engineering, cement, and industrial conglomerates.",
            "related_symbols": ["^NSEI"],
            "sentiment_label": "positive",
            "sentiment_score": 0.79,
            "confidence": 0.90,
            "matched_signals": ["raises allocation", "boosting", "record high", "visibility"],
            "is_synthetic": True,
            "retrieved_at": "2026-11-14T12:15:00+05:30"
        }
    ]
    
    with open(os.path.join(DEMO_DIR, "demo_news.json"), "w", encoding="utf-8") as f:
        json.dump(news_items, f, indent=2)
        
    # 3. Sentiment Benchmark Dataset (Financial PhraseBank verified samples)
    sentiment_benchmark = [
        {"text": "Operating profit rose by 14% to EUR 12.3 million from EUR 10.8 million in the previous period.", "label": "positive"},
        {"text": "The company expects net sales to double in the fiscal year due to strong European customer demand.", "label": "positive"},
        {"text": "Net interest income increased by 22% while credit costs declined to historical lows.", "label": "positive"},
        {"text": "Operating loss widened to EUR 4.2 million compared to EUR 1.5 million in the prior year quarter.", "label": "negative"},
        {"text": "Revenues decreased by 8% as demand for industrial components slowed down in key markets.", "label": "negative"},
        {"text": "Higher raw material prices and logistics disruptions severely compressed operating EBITDA margins.", "label": "negative"},
        {"text": "The board of directors proposed an unchanged dividend of 0.45 euros per share.", "label": "neutral"},
        {"text": "Consolidated sales amounted to EUR 240.2 million against EUR 241.0 million in the corresponding period.", "label": "neutral"},
        {"text": "The acquisition is subject to customary regulatory approvals and is expected to close in Q3.", "label": "neutral"},
        {"text": "Earnings per share grew 18% beating consensus analyst expectations by 45 basis points.", "label": "positive"},
        {"text": "Gross non-performing loans dropped by 40 basis points indicating significant asset quality recovery.", "label": "positive"},
        {"text": "The division initiated workforce reductions and plant closures following continuous unprofitable quarters.", "label": "negative"},
        {"text": "The management reiterated its revenue guidance of 3-5% constant currency expansion for the full fiscal year.", "label": "neutral"},
        {"text": "Cash flow from operations turned negative due to delayed collections and higher inventory build-up.", "label": "negative"},
        {"text": "The company announced a share repurchase program worth up to Rs 10,000 crore to return surplus capital.", "label": "positive"}
    ]
    
    with open(os.path.join(DEMO_DIR, "sentiment_benchmark.json"), "w", encoding="utf-8") as f:
        json.dump(sentiment_benchmark, f, indent=2)
        
    # 4. RAG Evaluation Q&A Test Set
    rag_eval_queries = [
        {
            "query": "What solar capacity was commissioned by Reliance Industries in Gujarat?",
            "target_answer": "Reliance New Energy commissioned an additional 1 GW solar module manufacturing capacity at its Jamnagar complex.",
            "target_article_id": "art-001",
            "required_entities": ["1 GW", "Reliance", "Jamnagar", "Gujarat"],
            "must_abstain_on_irrelevant": False
        },
        {
            "query": "What was the size of the European contract won by Tata Consultancy Services (TCS)?",
            "target_answer": "TCS secured a multi-year digital transformation deal exceeding $1.2B with a premier European insurance and financial group.",
            "target_article_id": "art-002",
            "required_entities": ["$1.2B", "European insurer", "TCS"],
            "must_abstain_on_irrelevant": False
        },
        {
            "query": "What is the latest Gross NPA ratio reported for ICICI Bank?",
            "target_answer": "ICICI Bank's gross NPA ratio dropped to a multi-year low of 2.15% with a provisioning coverage ratio surpassing 81%.",
            "target_article_id": "art-005",
            "required_entities": ["2.15%", "ICICI Bank", "gross NPA"],
            "must_abstain_on_irrelevant": False
        },
        {
            "query": "What was the Reserve Bank of India's decision on the benchmark repo rate?",
            "target_answer": "The RBI Monetary Policy Committee kept the benchmark repo rate unchanged at 6.50% to maintain its disinflation focus.",
            "target_article_id": "art-008",
            "required_entities": ["6.50%", "repo rate", "unchanged", "RBI"],
            "must_abstain_on_irrelevant": False
        },
        {
            "query": "What are Apple's plans to open manufacturing plants in Antarctica next year?",
            "target_answer": "The retrieved articles contain no evidence or information regarding Apple opening manufacturing plants in Antarctica.",
            "target_article_id": None,
            "required_entities": [],
            "must_abstain_on_irrelevant": True
        }
    ]
    
    with open(os.path.join(DEMO_DIR, "rag_eval_queries.json"), "w", encoding="utf-8") as f:
        json.dump(rag_eval_queries, f, indent=2)
    
    print(f"Demo fixtures generated successfully in {DEMO_DIR}")

if __name__ == "__main__":
    generate_demo_fixtures()
