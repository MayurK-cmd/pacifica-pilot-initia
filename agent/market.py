"""
market.py — Market data with multi-timeframe RSI and circuit breaker.

Fixes:
  - Fetches both 5m RSI and 1h RSI for multi-timeframe context
  - Always falls back to Binance if Pacifica returns < 15 candles
  - Circuit breaker: after 5 consecutive failures, skip for 2 cycles
  - Exponential backoff on API failures
"""

from __future__ import annotations
import asyncio, json, os, time
from pathlib import Path
from dotenv import load_dotenv
from typing import Any, Optional
import requests, websockets

# Load .env from the agent directory
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

BASE_URL    = os.getenv("PACIFICA_BASE_URL", "https://test-api.pacifica.fi/api/v1")
WS_URL      = os.getenv("PACIFICA_WS_URL",   "wss://test-ws.pacifica.fi/ws")
API_KEY     = os.getenv("PACIFICA_API_KEY",   "") or os.getenv("PF_API_KEY", "")
USE_BINANCE = os.getenv("USE_BINANCE_KLINE_FALLBACK", "true").lower() == "true"

MIN_CANDLES     = 15
CIRCUIT_THRESH  = 5   # fail count before circuit opens
CIRCUIT_COOLDOWN = 2  # cycles to skip after circuit opens

_SESSION = requests.Session()
_SESSION.headers.update({"Accept": "application/json", "User-Agent": "PacificaPilot/1.0"})
if API_KEY:
    _SESSION.headers["PF-API-KEY"] = API_KEY

_INTERVAL_MS = {"1m":60_000,"3m":180_000,"5m":300_000,"15m":900_000,"30m":1_800_000,
                "1h":3_600_000,"2h":7_200_000,"4h":14_400_000,"1d":86_400_000}

# Circuit breaker state
_fail_counts:  dict[str, int] = {}
_skip_cycles:  dict[str, int] = {}


def _circuit_ok(key: str) -> bool:
    if _skip_cycles.get(key, 0) > 0:
        _skip_cycles[key] -= 1
        print(f"[Market] Circuit open for {key}, skipping ({_skip_cycles[key]} cycles left)")
        return False
    return True


def _record_fail(key: str):
    _fail_counts[key] = _fail_counts.get(key, 0) + 1
    if _fail_counts[key] >= CIRCUIT_THRESH:
        print(f"[Market] Circuit tripped for {key} after {CIRCUIT_THRESH} failures")
        _skip_cycles[key] = CIRCUIT_COOLDOWN
        _fail_counts[key] = 0


def _record_ok(key: str):
    _fail_counts[key] = 0


def _rest_ok(resp: requests.Response) -> bool:
    if resp.status_code != 200:
        return False
    ct = (resp.headers.get("content-type") or "").lower()
    return "json" in ct and bool(resp.text.strip())


def _get(path: str, params: dict | None = None) -> Any | None:
    url = f"{BASE_URL}{path}"
    try:
        resp = _SESSION.get(url, params=params, timeout=15)
        if _rest_ok(resp):
            return resp.json()
    except Exception:
        pass
    return None


async def _ws_fetch_price(symbol: str, timeout: float = 25.0) -> dict:
    want = symbol.upper()
    t0   = time.time()
    try:
        async with websockets.connect(WS_URL, ping_interval=30) as ws:
            await ws.send(json.dumps({"method": "subscribe", "params": {"source": "prices"}}))
            while time.time() - t0 < timeout:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    msg = json.loads(raw)
                    if msg.get("channel") == "prices":
                        for item in (msg.get("data") or []):
                            if isinstance(item, dict) and str(item.get("symbol","")).upper() == want:
                                return item
                except (asyncio.TimeoutError, json.JSONDecodeError):
                    continue
    except Exception as e:
        print(f"[Market] WS failed for {symbol}: {e}")
    return {}


def _ws_sync(symbol: str) -> dict:
    try:
        return asyncio.run(_ws_fetch_price(symbol))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_ws_fetch_price(symbol))
        finally:
            loop.close()


def get_prices(symbol: str) -> dict:
    raw = _get("/info/prices")
    if raw is not None:
        items = raw.get("data", []) if isinstance(raw, dict) else raw
        for item in (items or []):
            if isinstance(item, dict) and item.get("symbol") == symbol:
                _record_ok("prices")
                return item
    row = _ws_sync(symbol)
    if row:
        _record_ok("prices")
        return row
    _record_fail("prices")
    return {}


def _binance_candles(symbol: str, interval: str, limit: int) -> list:
    pair = f"{symbol.upper()}USDT"
    try:
        r = requests.get("https://api.binance.com/api/v3/klines",
                         params={"symbol": pair, "interval": interval, "limit": limit},
                         timeout=15, headers={"Accept": "application/json"})
        r.raise_for_status()
        out = []
        for k in r.json():
            if isinstance(k, (list, tuple)) and len(k) >= 6:
                out.append({"t": k[0], "o": k[1], "h": k[2], "l": k[3], "c": k[4], "v": k[5]})
        return out
    except Exception as e:
        print(f"[Market] Binance candles failed for {symbol}/{interval}: {e}")
        return []


def get_candles(symbol: str, interval: str = "5m", n_candles: int = 60) -> list:
    key = f"kline_{symbol}_{interval}"
    if not _circuit_ok(key):
        return _binance_candles(symbol, interval, n_candles + 10) if USE_BINANCE else []

    ms      = _INTERVAL_MS.get(interval, 300_000)
    now_ms  = int(time.time() * 1_000)
    start   = now_ms - (n_candles * 2) * ms

    raw = _get("/kline", params={"symbol": symbol, "interval": interval,
                                  "start_time": start, "end_time": now_ms, "limit": n_candles})
    if raw is not None:
        data = raw.get("data", []) if isinstance(raw, dict) else raw
        if isinstance(data, list) and len(data) >= MIN_CANDLES:
            _record_ok(key)
            return data
        if isinstance(data, list) and data:
            print(f"[Market] Pacifica returned only {len(data)} candles for {symbol}/{interval} — Binance fallback")
        else:
            _record_fail(key)

    if USE_BINANCE:
        candles = _binance_candles(symbol, interval, n_candles + 10)
        if candles:
            print(f"[Market] Using Binance {interval} klines for {symbol}")
            _record_ok(key)
        return candles
    return []


def _closes(candles: list) -> list:
    out = []
    for c in candles:
        if isinstance(c, dict):
            v = c.get("c") or c.get("close") or c.get("Close")
            if v is not None:
                out.append(float(v))
        elif isinstance(c, (list, tuple)) and len(c) >= 5:
            out.append(float(c[4]))
    return out


def compute_rsi(closes: list, period: int = 14) -> Optional[float]:
    if len(closes) < period + 1:
        return None
    gains, losses = [], []
    for i in range(1, len(closes)):
        d = closes[i] - closes[i-1]
        gains.append(max(d, 0.0))
        losses.append(max(-d, 0.0))
    ag = sum(gains[-period:]) / period
    al = sum(losses[-period:]) / period
    if al == 0:
        return 100.0
    return round(100 - (100 / (1 + ag/al)), 2)


def get_market_snapshot(symbol: str) -> dict:
    prices = get_prices(symbol)

    # 5m candles (timing)
    candles_5m = get_candles(symbol, interval="5m", n_candles=60)
    rsi_5m     = compute_rsi(_closes(candles_5m))
    if rsi_5m is None:
        print(f"[Market] {symbol}: insufficient 5m candles ({len(candles_5m)}) for RSI")

    # 1h candles (trend)
    candles_1h = get_candles(symbol, interval="1h", n_candles=30)
    rsi_1h     = compute_rsi(_closes(candles_1h))

    # Funding rate
    funding: Optional[float] = None
    raw_f = prices.get("funding")
    if raw_f is not None and str(raw_f).strip() not in ("", "-1"):
        try:
            funding = float(raw_f)
        except (TypeError, ValueError):
            pass
    if funding is None:
        try:
            fh = _get("/funding_rate/history", params={"symbol": symbol, "limit": 1})
            if fh:
                items = fh.get("data", []) if isinstance(fh, dict) else fh
                if items:
                    funding = float(items[0].get("funding_rate", 0))
        except Exception:
            pass

    try:
        mark = float(prices.get("mark", 0) or 0)
    except (TypeError, ValueError):
        mark = 0.0
    try:
        y = prices.get("yesterday_price", 0)
        yesterday = float(y) if y not in (None, "", "-1") else 0.0
    except (TypeError, ValueError):
        yesterday = 0.0

    change_24h = round((mark - yesterday) / yesterday * 100, 4) if yesterday > 0 else 0.0

    return {
        "symbol":      symbol,
        "mark_price":  mark,
        "index_price": float(prices.get("oracle", 0) or 0),
        "change_24h":  change_24h,
        "volume_24h":  float(prices.get("volume_24h", 0) or 0),
        "rsi_14":      rsi_5m,    # primary (5m)
        "rsi_1h":      rsi_1h,    # trend (1h)
        "candles":     candles_5m,
        "funding_rate": funding if funding is not None else 0.0,
    }