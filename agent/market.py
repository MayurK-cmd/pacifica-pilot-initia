"""
market.py — Fetches market data from Pacifica REST API.

Verified endpoints (testnet: https://test-api.pacifica.fi/api/v1):

  GET /api/v1/info/prices
      → list of all symbols; keys: symbol, mark, oracle, funding,
        next_funding, yesterday_price, volume_24h, open_interest, timestamp
      → change_24h is NOT in the response — computed from mark vs yesterday_price

  GET /api/v1/kline
      → query params: symbol (req), interval (req), start_time ms (req), end_time ms (opt)
      → response: {"success": true, "data": [{t, T, s, i, o, c, h, l, v, n}, ...]}
      → close price key is "c"  (these are dicts, NOT lists)

  GET /api/v1/funding_rate/history
      → query params: symbol (req), limit (opt, default 100)
      → response: {"success": true, "data": [{funding_rate, next_funding_rate,
                   oracle_price, bid_impact_price, ask_impact_price, created_at}, ...]}
      → /info/funding does NOT exist — this is the correct endpoint
"""

import os
import time
import requests
from typing import Optional

BASE_URL = os.getenv("PACIFICA_BASE_URL", "https://test-api.pacifica.fi/api/v1")

# Interval string → milliseconds
_INTERVAL_MS = {
    "1m":  60_000,
    "3m":  180_000,
    "5m":  300_000,
    "15m": 900_000,
    "30m": 1_800_000,
    "1h":  3_600_000,
    "2h":  7_200_000,
    "4h":  14_400_000,
    "8h":  28_800_000,
    "12h": 43_200_000,
    "1d":  86_400_000,
}


def _get(path: str, params: dict = None):
    url = f"{BASE_URL}{path}"
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


# ── Prices ────────────────────────────────────────────────────────────────────

def get_prices(symbol: str) -> dict:
    """
    GET /api/v1/info/prices
    Returns the price dict for the given symbol, or {} if not found.

    Response keys per item:
      symbol, mark, oracle, mid, funding, next_funding,
      yesterday_price, volume_24h, open_interest, timestamp
    """
    raw = _get("/info/prices")
    items = raw.get("data", []) if isinstance(raw, dict) else raw
    for item in items:
        if item.get("symbol") == symbol:
            return item
    print(f"[Market] Warning: '{symbol}' not found in /info/prices.")
    return {}


# ── Candles ───────────────────────────────────────────────────────────────────

def get_candles(symbol: str, interval: str = "5m", n_candles: int = 25) -> list:
    """
    GET /api/v1/kline
    Required params: symbol, interval, start_time (ms).
    Optional:        end_time (ms) — defaults to now on the server.

    Fetches n_candles worth of history:
        start_time = now - n_candles * interval_ms

    Each candle is a dict: {t, T, s, i, o, c, h, l, v, n}
      t = candle open time (ms)
      c = close price (decimal string)
    """
    interval_ms = _INTERVAL_MS.get(interval, 300_000)
    now_ms = int(time.time() * 1_000)
    start_ms = now_ms - n_candles * interval_ms

    try:
        raw = _get("/kline", params={
            "symbol": symbol,
            "interval": interval,
            "start_time": start_ms,
            "end_time": now_ms,
        })
        data = raw.get("data", []) if isinstance(raw, dict) else raw
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[Market] Warning: could not fetch candles for {symbol}: {e}")
        return []


# ── Funding rate ──────────────────────────────────────────────────────────────

def get_funding_rate(symbol: str) -> Optional[float]:
    """
    GET /api/v1/funding_rate/history?symbol=<symbol>&limit=1
    Returns the most recent funding_rate as a float.
    Positive = longs pay shorts.  Negative = shorts pay longs.

    Note: /info/funding does NOT exist — this is the correct endpoint.
    """
    try:
        raw = _get("/funding_rate/history", params={"symbol": symbol, "limit": 1})
        items = raw.get("data", []) if isinstance(raw, dict) else raw
        if items:
            return float(items[0].get("funding_rate", 0))
    except Exception as e:
        print(f"[Market] Warning: could not fetch funding rate for {symbol}: {e}")
    return None


# ── RSI ───────────────────────────────────────────────────────────────────────

def _parse_closes(candles: list) -> list:
    """
    Extract close prices from candle dicts {t, T, s, i, o, c, h, l, v, n}.
    Also handles list-of-lists [ts, o, h, l, c, v] just in case.
    """
    closes = []
    for candle in candles:
        if isinstance(candle, dict):
            val = candle.get("c") or candle.get("close") or candle.get("Close")
            if val is not None:
                closes.append(float(val))
        elif isinstance(candle, (list, tuple)) and len(candle) >= 5:
            closes.append(float(candle[4]))
    return closes


def compute_rsi(closes: list, period: int = 14) -> Optional[float]:
    """Simple RSI from a list of close prices. Returns None if too few data points."""
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0.0))
        losses.append(max(-diff, 0.0))
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


# ── Snapshot ──────────────────────────────────────────────────────────────────

def get_market_snapshot(symbol: str) -> dict:
    """
    Full snapshot combining prices + candles (RSI-14) + funding rate.

    change_24h is computed from mark vs yesterday_price because the
    /info/prices response does not include a pre-computed change_24h field.
    """
    prices  = get_prices(symbol)
    candles = get_candles(symbol, interval="5m", n_candles=25)  # 25 × 5m = 2h 5m
    closes  = _parse_closes(candles)
    rsi     = compute_rsi(closes)
    funding = get_funding_rate(symbol)

    if rsi is None:
        print(f"[Market] Note: got {len(closes)} closes for {symbol}; "
              f"need ≥15 for RSI-14. Candles returned: {len(candles)}.")

    mark       = float(prices.get("mark", 0))
    yesterday  = float(prices.get("yesterday_price", 0))
    change_24h = round(((mark - yesterday) / yesterday * 100), 4) if yesterday else 0.0

    return {
        "symbol":       symbol,
        "mark_price":   mark,
        "index_price":  float(prices.get("oracle", 0)),   # "oracle" is the index price
        "change_24h":   change_24h,
        "volume_24h":   float(prices.get("volume_24h", 0)),
        "rsi_14":       rsi,
        "candles":      candles,
        "funding_rate": funding if funding is not None else 0.0,
    }