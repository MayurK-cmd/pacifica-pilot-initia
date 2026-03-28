"""
market.py — Fetches market data from Pacifica.

Pacifica REST (`https://…/api/v1`) is often behind AWS WAF (HTTP 202 + empty body),
so plain `requests` calls fail with JSON decode errors. This module:

  1. Uses WebSocket `wss://…/ws` + `subscribe` / `prices` for mark/oracle/funding
     (same fields as REST /info/prices).
  2. Falls back to REST when it returns real JSON (200 + body), with optional
     `PF-API-KEY` / `PACIFICA_API_KEY` header.
  3. Uses Binance public klines for RSI when REST /kline is blocked (spot proxy;
     configurable via USE_BINANCE_KLINE_FALLBACK).

Official WS examples: pacifica-fi/python-sdk `ws/subscribe_prices.py`
REST paths documented in Pacifica GitBook.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any, Optional

import requests
import websockets

BASE_URL = os.getenv("PACIFICA_BASE_URL", "https://test-api.pacifica.fi/api/v1")
WS_URL = os.getenv("PACIFICA_WS_URL", "wss://test-ws.pacifica.fi/ws")
PACIFICA_API_KEY = os.getenv("PACIFICA_API_KEY") or os.getenv("PF_API_KEY", "")
USE_BINANCE_KLINE_FALLBACK = os.getenv("USE_BINANCE_KLINE_FALLBACK", "true").lower() == "true"

_SESSION = requests.Session()
_SESSION.headers.update(
    {
        "Accept": "application/json",
        "User-Agent": "PacificaPilot/1.0",
    }
)
if PACIFICA_API_KEY:
    _SESSION.headers["PF-API-KEY"] = PACIFICA_API_KEY

# Interval string → milliseconds
_INTERVAL_MS = {
    "1m": 60_000,
    "3m": 180_000,
    "5m": 300_000,
    "15m": 900_000,
    "30m": 1_800_000,
    "1h": 3_600_000,
    "2h": 7_200_000,
    "4h": 14_400_000,
    "8h": 28_800_000,
    "12h": 43_200_000,
    "1d": 86_400_000,
}


def _rest_ok(resp: requests.Response) -> bool:
    if resp.status_code != 200:
        return False
    ct = (resp.headers.get("content-type") or "").lower()
    if "json" not in ct and resp.text.strip():
        return False
    if not resp.text.strip():
        return False
    return True


def _get(path: str, params: dict | None = None) -> Any | None:
    url = f"{BASE_URL}{path}"
    resp = _SESSION.get(url, params=params, timeout=15)
    if not _rest_ok(resp):
        return None
    try:
        return resp.json()
    except Exception:
        return None


async def _ws_fetch_price_row(symbol: str, timeout: float = 25.0) -> dict:
    """Subscribe to `prices` and return the row for `symbol` (testnet/mainnet WS)."""
    want = symbol.upper()
    t0 = time.time()
    async with websockets.connect(WS_URL, ping_interval=30) as ws:
        await ws.send(json.dumps({"method": "subscribe", "params": {"source": "prices"}}))
        while time.time() - t0 < timeout:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            except asyncio.TimeoutError:
                continue
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get("channel") != "prices":
                continue
            data = msg.get("data")
            if not isinstance(data, list):
                continue
            for item in data:
                if isinstance(item, dict) and str(item.get("symbol", "")).upper() == want:
                    return item
    return {}


def _ws_fetch_price_row_sync(symbol: str) -> dict:
    try:
        return asyncio.run(_ws_fetch_price_row(symbol))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_ws_fetch_price_row(symbol))
        finally:
            loop.close()


def get_prices(symbol: str) -> dict:
    """
    GET /api/v1/info/prices (or WebSocket `prices` stream).

    Response keys per item:
      symbol, mark, oracle, mid, funding, next_funding,
      yesterday_price, volume_24h, open_interest, timestamp
    """
    raw = _get("/info/prices")
    if raw is not None:
        items = raw.get("data", []) if isinstance(raw, dict) else raw
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and item.get("symbol") == symbol:
                    return item

    row = _ws_fetch_price_row_sync(symbol)
    if row:
        return row

    print(f"[Market] Warning: '{symbol}' — REST blocked or empty and WS returned no row.")
    return {}


def _symbol_to_binance_pair(pacifica_symbol: str) -> str | None:
    """Map Pacifica perp symbol (e.g. BTC) to Binance USDT spot pair."""
    s = pacifica_symbol.upper().strip()
    if not s or s in ("USD", "EUR", "EURUSD"):
        return None
    if s.endswith("USD") and len(s) > 3:
        return None
    return f"{s}USDT"


def _binance_klines_as_candles(symbol: str, interval: str, limit: int) -> list:
    pair = _symbol_to_binance_pair(symbol)
    if not pair:
        return []
    try:
        r = requests.get(
            "https://api.binance.com/api/v3/klines",
            params={"symbol": pair, "interval": interval, "limit": limit},
            timeout=15,
            headers={"Accept": "application/json"},
        )
        r.raise_for_status()
        raw = r.json()
    except Exception as e:
        print(f"[Market] Binance kline fallback failed for {symbol}: {e}")
        return []

    out = []
    for k in raw:
        if not isinstance(k, (list, tuple)) or len(k) < 6:
            continue
        out.append(
            {
                "t": k[0],
                "T": k[6] if len(k) > 6 else k[0],
                "s": symbol,
                "i": interval,
                "o": k[1],
                "c": k[4],
                "h": k[2],
                "l": k[3],
                "v": k[5],
                "n": 0,
            }
        )
    return out


def get_candles(symbol: str, interval: str = "5m", n_candles: int = 50) -> list:
    """
    GET /api/v1/kline — or Binance klines when REST is unavailable or returns too few candles.
    We need at least 15 candles for RSI-14, so we fetch 50 and fall back to Binance
    if Pacifica returns fewer than 15.
    """
    MIN_CANDLES_FOR_RSI = 15
    interval_ms = _INTERVAL_MS.get(interval, 300_000)
    now_ms = int(time.time() * 1_000)
    # Request double the needed window to ensure we get enough closed candles
    start_ms = now_ms - (n_candles * 2) * interval_ms

    raw = _get(
        "/kline",
        params={
            "symbol": symbol,
            "interval": interval,
            "start_time": start_ms,
            "end_time": now_ms,
            "limit": n_candles,
        },
    )
    if raw is not None:
        data = raw.get("data", []) if isinstance(raw, dict) else raw
        if isinstance(data, list) and len(data) >= MIN_CANDLES_FOR_RSI:
            return data
        elif isinstance(data, list) and data:
            print(f"[Market] Pacifica /kline returned only {len(data)} candles for {symbol} — falling back to Binance.")

    if USE_BINANCE_KLINE_FALLBACK:
        candles = _binance_klines_as_candles(symbol, interval, max(n_candles + 10, 50))
        if candles:
            print(f"[Market] Using Binance spot klines as RSI proxy for {symbol}.")
        return candles

    return []


def get_funding_rate(symbol: str) -> Optional[float]:
    """
    GET /api/v1/funding_rate/history — fallback: funding already in get_prices() row.
    """
    try:
        raw = _get("/funding_rate/history", params={"symbol": symbol, "limit": 1})
        if raw is None:
            return None
        items = raw.get("data", []) if isinstance(raw, dict) else raw
        if items:
            return float(items[0].get("funding_rate", 0))
    except Exception as e:
        print(f"[Market] Warning: could not fetch funding rate for {symbol}: {e}")
    return None


def _parse_closes(candles: list) -> list:
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


def get_market_snapshot(symbol: str) -> dict:
    prices = get_prices(symbol)
    candles = get_candles(symbol, interval="5m", n_candles=50)
    closes = _parse_closes(candles)
    rsi = compute_rsi(closes)

    funding_val: Optional[float] = None
    if prices.get("funding") is not None and str(prices.get("funding")).strip() != "":
        try:
            funding_val = float(prices["funding"])
        except (TypeError, ValueError):
            funding_val = None
    if funding_val is None:
        funding_val = get_funding_rate(symbol)

    if rsi is None:
        print(
            f"[Market] Note: got {len(closes)} closes for {symbol}; "
            f"need ≥15 for RSI-14. Candles returned: {len(candles)}."
        )

    try:
        mark = float(prices.get("mark", 0) or 0)
    except (TypeError, ValueError):
        mark = 0.0
    try:
        y_raw = prices.get("yesterday_price", 0)
        yesterday = float(y_raw) if y_raw not in (None, "", "-1") else 0.0
    except (TypeError, ValueError):
        yesterday = 0.0

    change_24h = round(((mark - yesterday) / yesterday * 100), 4) if yesterday > 0 else 0.0

    return {
        "symbol": symbol,
        "mark_price": mark,
        "index_price": float(prices.get("oracle", 0) or 0),
        "change_24h": change_24h,
        "volume_24h": float(prices.get("volume_24h", 0) or 0),
        "rsi_14": rsi,
        "candles": candles,
        "funding_rate": funding_val if funding_val is not None else 0.0,
    }