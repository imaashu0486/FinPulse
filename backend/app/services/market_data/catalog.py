"""
FinPulse AI - Indian Equities & Instruments Catalog
Provides searchable metadata for NSE/BSE securities across sectors.
"""
from typing import Dict, List, Optional, Any

INSTRUMENT_CATALOG: List[Dict[str, Any]] = [
    # Information Technology
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE467B01029"},
    {"symbol": "INFY.NS", "name": "Infosys Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE009A01021"},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE860A01027"},
    {"symbol": "WIPRO.NS", "name": "Wipro Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE075A01022"},
    {"symbol": "TECHM.NS", "name": "Tech Mahindra Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE669C01036"},
    {"symbol": "LTIM.NS", "name": "LTIMindtree Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE214T01019"},
    {"symbol": "PERSISTENT.NS", "name": "Persistent Systems Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE262H01013"},
    {"symbol": "COFORGE.NS", "name": "Coforge Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE591G01017"},
    {"symbol": "MPHASIS.NS", "name": "Mphasis Ltd.", "sector": "Information Technology", "exchange": "NSE", "isin": "INE356A01018"},

    # Banking & Financial Services
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE040A01034"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE090A01021"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE062A01020"},
    {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE237A01028"},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE238A01034"},
    {"symbol": "INDUSINDBK.NS", "name": "IndusInd Bank Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE095A01012"},
    {"symbol": "BANKBARODA.NS", "name": "Bank of Baroda", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE077A01010"},
    {"symbol": "PNB.NS", "name": "Punjab National Bank", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE160A01022"},
    {"symbol": "CANBK.NS", "name": "Canara Bank", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE476A01014"},
    {"symbol": "IDFCFIRSTB.NS", "name": "IDFC First Bank Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE092T01019"},
    {"symbol": "FEDERALBNK.NS", "name": "Federal Bank Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE171A01029"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE296A01024"},
    {"symbol": "BAJAJFINSV.NS", "name": "Bajaj Finserv Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE918I01018"},
    {"symbol": "JIOFIN.NS", "name": "Jio Financial Services Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE758E01017"},
    {"symbol": "CHOLAFIN.NS", "name": "Cholamandalam Investment & Finance", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE121A01024"},
    {"symbol": "MUTHOOTFIN.NS", "name": "Muthoot Finance Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE414G01012"},
    {"symbol": "PFC.NS", "name": "Power Finance Corporation Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE134E01011"},
    {"symbol": "RECLTD.NS", "name": "REC Ltd.", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE020B01018"},
    {"symbol": "IRFC.NS", "name": "Indian Railway Finance Corporation", "sector": "Banking & Financial Services", "exchange": "NSE", "isin": "INE053F01010"},

    # Energy, Oil & Gas, Power
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd.", "sector": "Energy / Conglomerate", "exchange": "NSE", "isin": "INE002A01018"},
    {"symbol": "ONGC.NS", "name": "Oil & Natural Gas Corporation Ltd.", "sector": "Energy / Oil & Gas", "exchange": "NSE", "isin": "INE213A01029"},
    {"symbol": "BPCL.NS", "name": "Bharat Petroleum Corporation Ltd.", "sector": "Energy / Oil & Gas", "exchange": "NSE", "isin": "INE029A01011"},
    {"symbol": "IOC.NS", "name": "Indian Oil Corporation Ltd.", "sector": "Energy / Oil & Gas", "exchange": "NSE", "isin": "INE242A01010"},
    {"symbol": "OIL.NS", "name": "Oil India Ltd.", "sector": "Energy / Oil & Gas", "exchange": "NSE", "isin": "INE274J01014"},
    {"symbol": "COALINDIA.NS", "name": "Coal India Ltd.", "sector": "Energy / Mining", "exchange": "NSE", "isin": "INE522F01014"},
    {"symbol": "NTPC.NS", "name": "NTPC Ltd.", "sector": "Utilities / Power", "exchange": "NSE", "isin": "INE733E01010"},
    {"symbol": "POWERGRID.NS", "name": "Power Grid Corporation of India Ltd.", "sector": "Utilities / Power", "exchange": "NSE", "isin": "INE752E01010"},
    {"symbol": "GAIL.NS", "name": "GAIL (India) Ltd.", "sector": "Utilities / Gas", "exchange": "NSE", "isin": "INE129A01019"},
    {"symbol": "PETRONET.NS", "name": "Petronet LNG Ltd.", "sector": "Utilities / Gas", "exchange": "NSE", "isin": "INE348B01021"},
    {"symbol": "IGL.NS", "name": "Indraprastha Gas Ltd.", "sector": "Utilities / Gas", "exchange": "NSE", "isin": "INE203G01027"},

    # Automotive & Mobility
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE155A01022"},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE585B01010"},
    {"symbol": "M&M.NS", "name": "Mahindra & Mahindra Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE101A01026"},
    {"symbol": "BAJAJ-AUTO.NS", "name": "Bajaj Auto Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE917I01010"},
    {"symbol": "EICHERMOT.NS", "name": "Eicher Motors Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE066A01021"},
    {"symbol": "HEROMOTOCO.NS", "name": "Hero MotoCorp Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE158A01026"},
    {"symbol": "TVSMOTOR.NS", "name": "TVS Motor Company Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE494B01023"},
    {"symbol": "MOTHERSON.NS", "name": "Samvardhana Motherson International", "sector": "Automotive", "exchange": "NSE", "isin": "INE775A01035"},
    {"symbol": "BOSCHLTD.NS", "name": "Bosch Ltd.", "sector": "Automotive", "exchange": "NSE", "isin": "INE323A01026"},

    # Consumer Goods, FMCG & Retail
    {"symbol": "ITC.NS", "name": "ITC Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE154A01025"},
    {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE030A01027"},
    {"symbol": "NESTLEIND.NS", "name": "Nestle India Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE239A01016"},
    {"symbol": "BRITANNIA.NS", "name": "Britannia Industries Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE216A01030"},
    {"symbol": "TATACONSUM.NS", "name": "Tata Consumer Products Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE192A01025"},
    {"symbol": "DABUR.NS", "name": "Dabur India Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE016A01026"},
    {"symbol": "MARICO.NS", "name": "Marico Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE196A01026"},
    {"symbol": "GODREJCP.NS", "name": "Godrej Consumer Products Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE102D01028"},
    {"symbol": "VBL.NS", "name": "Varun Beverages Ltd.", "sector": "Consumer Goods / FMCG", "exchange": "NSE", "isin": "INE200M01013"},
    {"symbol": "TITAN.NS", "name": "Titan Company Ltd.", "sector": "Consumer Goods / Retail", "exchange": "NSE", "isin": "INE280A01028"},
    {"symbol": "TRENT.NS", "name": "Trent Ltd.", "sector": "Consumer Goods / Retail", "exchange": "NSE", "isin": "INE849A01020"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints Ltd.", "sector": "Consumer Goods / Paints", "exchange": "NSE", "isin": "INE021A01026"},

    # Healthcare & Pharmaceuticals
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharmaceutical Industries Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE044A01036"},
    {"symbol": "CIPLA.NS", "name": "Cipla Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE059A01026"},
    {"symbol": "DRREDDY.NS", "name": "Dr. Reddy's Laboratories Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE089A01023"},
    {"symbol": "DIVISLAB.NS", "name": "Divi's Laboratories Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE361B01024"},
    {"symbol": "APOLLOHOSP.NS", "name": "Apollo Hospitals Enterprise Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE437A01024"},
    {"symbol": "MAXHEALTH.NS", "name": "Max Healthcare Institute Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE027H01010"},
    {"symbol": "LUPIN.NS", "name": "Lupin Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE326A01037"},
    {"symbol": "AUROPHARMA.NS", "name": "Aurobindo Pharma Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE406A01037"},
    {"symbol": "BIOCON.NS", "name": "Biocon Ltd.", "sector": "Healthcare & Pharma", "exchange": "NSE", "isin": "INE376G01013"},

    # Infrastructure, Materials & Industrial
    {"symbol": "LT.NS", "name": "Larsen & Toubro Ltd.", "sector": "Infrastructure & Capital Goods", "exchange": "NSE", "isin": "INE018A01030"},
    {"symbol": "SIEMENS.NS", "name": "Siemens Ltd.", "sector": "Infrastructure & Capital Goods", "exchange": "NSE", "isin": "INE003A01024"},
    {"symbol": "ABB.NS", "name": "ABB India Ltd.", "sector": "Infrastructure & Capital Goods", "exchange": "NSE", "isin": "INE117A01022"},
    {"symbol": "BEL.NS", "name": "Bharat Electronics Ltd.", "sector": "Aerospace & Defence", "exchange": "NSE", "isin": "INE263A01024"},
    {"symbol": "HAL.NS", "name": "Hindustan Aeronautics Ltd.", "sector": "Aerospace & Defence", "exchange": "NSE", "isin": "INE066F01012"},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement Ltd.", "sector": "Materials & Cement", "exchange": "NSE", "isin": "INE481G01011"},
    {"symbol": "GRASIM.NS", "name": "Grasim Industries Ltd.", "sector": "Materials & Textiles", "exchange": "NSE", "isin": "INE047A01021"},
    {"symbol": "SHREECEM.NS", "name": "Shree Cement Ltd.", "sector": "Materials & Cement", "exchange": "NSE", "isin": "INE070A01015"},
    {"symbol": "AMBUJACEM.NS", "name": "Ambuja Cements Ltd.", "sector": "Materials & Cement", "exchange": "NSE", "isin": "INE079A01024"},
    {"symbol": "TATASTEEL.NS", "name": "Tata Steel Ltd.", "sector": "Metals & Mining", "exchange": "NSE", "isin": "INE081A01020"},
    {"symbol": "JSWSTEEL.NS", "name": "JSW Steel Ltd.", "sector": "Metals & Mining", "exchange": "NSE", "isin": "INE019A01038"},
    {"symbol": "HINDALCO.NS", "name": "Hindalco Industries Ltd.", "sector": "Metals & Mining", "exchange": "NSE", "isin": "INE038A01020"},
    {"symbol": "VEDL.NS", "name": "Vedanta Ltd.", "sector": "Metals & Mining", "exchange": "NSE", "isin": "INE205A01025"},
    {"symbol": "POLYCAB.NS", "name": "Polycab India Ltd.", "sector": "Cables & Electricals", "exchange": "NSE", "isin": "INE455K01017"},
    {"symbol": "PIDILITIND.NS", "name": "Pidilite Industries Ltd.", "sector": "Chemicals", "exchange": "NSE", "isin": "INE318A01026"},
    {"symbol": "SRF.NS", "name": "SRF Ltd.", "sector": "Chemicals", "exchange": "NSE", "isin": "INE647A01010"},
    {"symbol": "DLF.NS", "name": "DLF Ltd.", "sector": "Real Estate", "exchange": "NSE", "isin": "INE271C01023"},

    # Telecommunications & Tech/Internet
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd.", "sector": "Telecommunications", "exchange": "NSE", "isin": "INE397D01024"},
    {"symbol": "ZOMATO.NS", "name": "Zomato Ltd.", "sector": "Consumer Internet", "exchange": "NSE", "isin": "INE758T01015"},
    {"symbol": "IRCTC.NS", "name": "Indian Railway Catering and Tourism Corp.", "sector": "Travel & Tourism", "exchange": "NSE", "isin": "INE335Y01012"},

    # Major Benchmark & Sectoral Indices
    {"symbol": "^NSEI", "name": "NIFTY 50 Index", "sector": "Benchmark Index", "exchange": "NSE", "isin": "NSE_INDEX|NIFTY50"},
    {"symbol": "^NSEBANK", "name": "NIFTY Bank Index", "sector": "Sectoral Index", "exchange": "NSE", "isin": "NSE_INDEX|BANKNIFTY"},
    {"symbol": "^CNXIT", "name": "NIFTY IT Index", "sector": "Sectoral Index", "exchange": "NSE", "isin": "NSE_INDEX|NIFTYIT"},
]

def search_catalog(query: str = "", sector: Optional[str] = None, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Searches the instrument catalog by symbol, company name, or ISIN with relevance ranking.
    Also accepts arbitrary valid ticker symbols entered directly by the user.
    """
    q = (query or "").strip().lower()
    results = []

    # Filter by sector if provided
    candidates = INSTRUMENT_CATALOG
    if sector and sector != "All":
        candidates = [c for c in candidates if c["sector"].lower() == sector.lower()]

    if not q:
        return candidates[:limit]

    # Clean ticker for exact matching
    clean_sym = q.upper().replace(".NS", "").replace("^", "")

    # Score each candidate
    scored = []
    for item in candidates:
        sym_clean = item["symbol"].upper().replace(".NS", "").replace("^", "")
        name = item["name"].lower()
        sec = item["sector"].lower()
        score = 0

        # Exact symbol match (highest weight)
        if sym_clean == clean_sym or item["symbol"].lower() == q:
            score += 100
        # Symbol starts with query
        elif sym_clean.startswith(clean_sym):
            score += 75
        # Symbol contains query
        elif clean_sym in sym_clean:
            score += 50
        # Name starts with query
        elif name.startswith(q):
            score += 40
        # Word in name starts with query
        elif any(w.startswith(q) for w in name.split()):
            score += 30
        # Name contains query
        elif q in name:
            score += 20
        # Sector matches
        elif q in sec:
            score += 10

        if score > 0:
            scored.append((score, item))

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)
    results = [item for _, item in scored[:limit]]

    # If no results matched catalog but user entered a plausible ticker symbol, synthesize dynamic entry
    if not results and len(q) >= 2:
        clean_upper = q.upper()
        if not clean_upper.endswith(".NS") and not clean_upper.startswith("^"):
            formatted = f"{clean_upper}.NS"
        else:
            formatted = clean_upper
        results.append({
            "symbol": formatted,
            "name": f"{clean_upper.replace('.NS', '')} (NSE Equity)",
            "sector": "Indian Equities",
            "exchange": "NSE",
            "isin": "CUSTOM"
        })

    return results

def get_sectors() -> List[str]:
    """Returns unique sorted list of sectors available in the catalog."""
    sectors = sorted(list({item["sector"] for item in INSTRUMENT_CATALOG}))
    return ["All"] + sectors
