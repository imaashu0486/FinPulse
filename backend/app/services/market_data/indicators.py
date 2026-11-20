import math
from typing import List, Optional, Tuple, Dict, Any

def calculate_sma(prices: List[float], period: int) -> List[Optional[float]]:
    """Calculates Simple Moving Average. Returns None for indices < period - 1."""
    if not prices or period <= 0:
        return []
    sma = []
    for i in range(len(prices)):
        if i < period - 1:
            sma.append(None)
        else:
            window = prices[i - period + 1 : i + 1]
            sma.append(round(sum(window) / period, 2))
    return sma

def calculate_ema(prices: List[float], period: int) -> List[Optional[float]]:
    """Calculates Exponential Moving Average with smoothing multiplier 2 / (period + 1)."""
    if not prices or period <= 0:
        return []
    ema: List[Optional[float]] = [None] * len(prices)
    if len(prices) < period:
        return ema
    
    # First EMA value is SMA of initial period
    initial_sma = sum(prices[:period]) / period
    ema[period - 1] = round(initial_sma, 2)
    multiplier = 2.0 / (period + 1)
    
    for i in range(period, len(prices)):
        prev_ema = ema[i - 1]
        assert prev_ema is not None
        current_ema = (prices[i] - prev_ema) * multiplier + prev_ema
        ema[i] = round(current_ema, 2)
    return ema

def calculate_rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
    """Calculates Relative Strength Index using Wilder's smoothed gains and losses."""
    if not prices or len(prices) <= period:
        return [None] * len(prices)
    
    rsi: List[Optional[float]] = [None] * len(prices)
    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    
    gains = [max(d, 0.0) for d in deltas]
    losses = [abs(min(d, 0.0)) for d in deltas]
    
    # Initial averages
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    if avg_loss == 0:
        rsi[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        rsi[period] = round(100.0 - (100.0 / (1.0 + rs)), 2)
        
    for i in range(period, len(deltas)):
        gain = gains[i]
        loss = losses[i]
        
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        
        idx = i + 1
        if avg_loss == 0:
            rsi[idx] = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi[idx] = round(100.0 - (100.0 / (1.0 + rs)), 2)
            
    return rsi

def calculate_macd(
    prices: List[float], 
    fast_period: int = 12, 
    slow_period: int = 26, 
    signal_period: int = 9
) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
    """
    Computes MACD Line (EMA12 - EMA26), Signal Line (EMA9 of MACD Line),
    and MACD Histogram (MACD Line - Signal Line).
    """
    if len(prices) < slow_period:
        empty = [None] * len(prices)
        return empty, empty, empty
    
    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)
    
    macd_line: List[Optional[float]] = []
    for f, s in zip(fast_ema, slow_ema):
        if f is not None and s is not None:
            macd_line.append(round(f - s, 2))
        else:
            macd_line.append(None)
            
    # Calculate signal line as EMA of macd_line values (skipping initial None values)
    valid_macd_indices = [i for i, val in enumerate(macd_line) if val is not None]
    signal_line: List[Optional[float]] = [None] * len(prices)
    histogram: List[Optional[float]] = [None] * len(prices)
    
    if len(valid_macd_indices) >= signal_period:
        valid_macd_vals = [macd_line[i] for i in valid_macd_indices if macd_line[i] is not None]  # type: List[float]
        signal_calc = calculate_ema(valid_macd_vals, signal_period)
        
        for k, orig_idx in enumerate(valid_macd_indices):
            sig_val = signal_calc[k]
            signal_line[orig_idx] = sig_val
            m_val = macd_line[orig_idx]
            if m_val is not None and sig_val is not None:
                histogram[orig_idx] = round(m_val - sig_val, 2)
                
    return macd_line, signal_line, histogram

def calculate_bollinger_bands(
    prices: List[float], 
    period: int = 20, 
    num_std: float = 2.0
) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
    """Computes Bollinger Bands: Upper Band, Middle Band (SMA), Lower Band."""
    if len(prices) < period:
        empty = [None] * len(prices)
        return empty, empty, empty
    
    sma = calculate_sma(prices, period)
    upper_band: List[Optional[float]] = []
    lower_band: List[Optional[float]] = []
    
    for i in range(len(prices)):
        if i < period - 1:
            upper_band.append(None)
            lower_band.append(None)
        else:
            window = prices[i - period + 1 : i + 1]
            mean = sum(window) / period
            variance = sum((x - mean) ** 2 for x in window) / period
            std_dev = math.sqrt(variance)
            upper_band.append(round(mean + (num_std * std_dev), 2))
            lower_band.append(round(mean - (num_std * std_dev), 2))
            
    return upper_band, sma, lower_band

def calculate_returns_and_risk(prices: List[float]) -> Dict[str, float]:
    """
    Computes daily returns, annualized historical volatility (sqrt(252)),
    and maximum historical drawdown.
    """
    if len(prices) < 2:
        return {
            "daily_returns_mean": 0.0,
            "annualized_volatility": 0.0,
            "max_drawdown": 0.0,
            "sharpe_ratio_est": 0.0,
            "total_period_return": 0.0
        }
    
    daily_returns = [(prices[i] - prices[i - 1]) / prices[i - 1] for i in range(1, len(prices))]
    mean_return = sum(daily_returns) / len(daily_returns)
    
    variance = sum((r - mean_return) ** 2 for r in daily_returns) / len(daily_returns)
    daily_vol = math.sqrt(variance)
    annualized_vol = daily_vol * math.sqrt(252)
    
    # Calculate Maximum Drawdown
    peak = prices[0]
    max_dd = 0.0
    for p in prices:
        if p > peak:
            peak = p
        dd = (peak - p) / peak
        if dd > max_dd:
            max_dd = dd
            
    # Total period return
    total_ret = ((prices[-1] - prices[0]) / prices[0]) * 100.0
    
    # Sharpe ratio estimate assuming 6.5% risk free rate (RBI repo)
    risk_free_daily = 0.065 / 252
    excess_returns = [r - risk_free_daily for r in daily_returns]
    mean_excess = sum(excess_returns) / len(excess_returns)
    sharpe = (mean_excess / daily_vol * math.sqrt(252)) if daily_vol > 0 else 0.0
    
    return {
        "daily_returns_mean": round(mean_return * 100, 3), # in %
        "annualized_volatility": round(annualized_vol * 100, 2), # in %
        "max_drawdown": round(max_dd * 100, 2), # in %
        "sharpe_ratio_est": round(sharpe, 2),
        "total_period_return": round(total_ret, 2) # in %
    }
