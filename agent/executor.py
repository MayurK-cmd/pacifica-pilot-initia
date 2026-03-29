"""
executor.py — Places/closes market orders on Pacifica with full position management.

Fixes:
  - Position check before entry (no unintentional double-down)
  - Stop-loss + take-profit per position
  - PnL tracking for open positions
  - Exponential backoff on API failures
  - DRY_RUN from env only (single source of truth)
"""

import os, json, time, uuid, base58, requests
from pathlib import Path
from dotenv import load_dotenv
from solders.keypair import Keypair

# Load .env from the agent directory
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

BASE_URL           = os.getenv("PACIFICA_BASE_URL", "https://test-api.pacifica.fi/api/v1")
PRIVATE_KEY        = os.getenv("PACIFICA_PRIVATE_KEY", "")
MAX_POSITION_USDC  = float(os.getenv("MAX_POSITION_USDC", "50"))
ORDER_SLIPPAGE_PCT = os.getenv("ORDER_SLIPPAGE_PERCENT", "0.5")
DRY_RUN            = os.getenv("DRY_RUN", "true").lower() == "true"
STOP_LOSS_PCT      = float(os.getenv("STOP_LOSS_PCT", "3.0"))
TAKE_PROFIT_PCT    = float(os.getenv("TAKE_PROFIT_PCT", "6.0"))

_open_positions: dict = {}
_keypair = None


def _get_keypair() -> Keypair:
    global _keypair
    if _keypair is None:
        raw = PRIVATE_KEY.strip()
        try:
            _keypair = Keypair.from_base58_string(raw)
        except Exception:
            _keypair = Keypair.from_bytes(base58.b58decode(raw))
    return _keypair


def _sort_json_keys(v):
    if isinstance(v, dict):
        return {k: _sort_json_keys(vv) for k, vv in sorted(v.items())}
    if isinstance(v, list):
        return [_sort_json_keys(i) for i in v]
    return v


def _sign_payload(op: str, data: dict) -> dict:
    kp = _get_keypair()
    ts = int(time.time() * 1_000)
    ew = 5_000
    msg = json.dumps(_sort_json_keys({"timestamp": ts, "expiry_window": ew, "type": op, "data": data}), separators=(",", ":")).encode()
    sig = base58.b58encode(bytes(kp.sign_message(msg))).decode()
    return {"account": str(kp.pubkey()), "agent_wallet": None, "signature": sig, "timestamp": ts, "expiry_window": ew}


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    k = os.getenv("PACIFICA_API_KEY", "")
    if k:
        h["PF-API-KEY"] = k
    return h


def _post(path: str, op: str, data: dict, retries: int = 3) -> dict:
    body = {**_sign_payload(op, data), **data}
    for attempt in range(retries):
        try:
            r = requests.post(f"{BASE_URL}{path}", json=body, headers=_headers(), timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            wait = 2 ** attempt
            print(f"[Executor] POST {path} attempt {attempt+1}/{retries} failed: {e}. Waiting {wait}s...")
            time.sleep(wait)
    raise RuntimeError(f"[Executor] {path} failed after {retries} retries")


def _get_api(path: str, params: dict = None, retries: int = 3) -> dict:
    kp = _get_keypair()
    merged = {"account": str(kp.pubkey()), **(params or {})}
    for attempt in range(retries):
        try:
            r = requests.get(f"{BASE_URL}{path}", params=merged, headers=_headers(), timeout=10)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            wait = 2 ** attempt
            print(f"[Executor] GET {path} attempt {attempt+1}/{retries} failed: {e}. Waiting {wait}s...")
            time.sleep(wait)
    return {}


def get_account_info() -> dict:
    return _get_api("/account")


def get_open_positions() -> dict:
    global _open_positions
    try:
        info = get_account_info()
        positions = info.get("positions", []) or []
        live = {}
        for p in positions:
            sym  = p.get("symbol", "")
            size = float(p.get("size", 0) or 0)
            if size != 0:
                live[sym] = {
                    "side":           "bid" if size > 0 else "ask",
                    "size":           abs(size),
                    "entry_price":    float(p.get("entry_price", 0) or 0),
                    "unrealized_pnl": float(p.get("unrealized_pnl", 0) or 0),
                    "mark_price":     float(p.get("mark_price", 0) or 0),
                }
        _open_positions = live
        return live
    except Exception as e:
        print(f"[Executor] Could not fetch live positions: {e}")
        return _open_positions


def compute_pnl(symbol: str, current_price: float) -> float | None:
    pos = _open_positions.get(symbol)
    if not pos or pos["entry_price"] == 0:
        return None
    entry = pos["entry_price"]
    size  = pos["size"]
    if pos["side"] == "bid":
        return round((current_price - entry) / entry * size, 4)
    return round((entry - current_price) / entry * size, 4)


def should_exit(symbol: str, current_price: float) -> tuple[bool, str]:
    pos = _open_positions.get(symbol)
    if not pos or pos["entry_price"] == 0:
        return False, ""
    entry  = pos["entry_price"]
    change = (current_price - entry) / entry * 100
    if pos["side"] == "bid":
        if change <= -STOP_LOSS_PCT:
            return True, f"stop-loss {change:.2f}%"
        if change >= TAKE_PROFIT_PCT:
            return True, f"take-profit {change:.2f}%"
    else:
        inv = -change
        if inv <= -STOP_LOSS_PCT:
            return True, f"stop-loss {inv:.2f}%"
        if inv >= TAKE_PROFIT_PCT:
            return True, f"take-profit {inv:.2f}%"
    return False, ""


def place_market_order(symbol: str, side: str, usdc_size: float) -> dict:
    positions = get_open_positions()
    if symbol in positions:
        pos = positions[symbol]
        print(f"[Executor] Skipping {symbol}: already have {pos['side']} position (size={pos['size']:.2f})")
        return {"skipped": True, "reason": "existing_position", "symbol": symbol}

    capped  = min(usdc_size, MAX_POSITION_USDC)
    cid     = str(uuid.uuid4())
    order   = {"symbol": symbol, "side": side, "amount": str(round(capped, 4)),
                "slippage_percent": str(ORDER_SLIPPAGE_PCT), "reduce_only": False, "client_order_id": cid}

    if DRY_RUN:
        print(f"[DRY RUN] Would place {side.upper()} {symbol} ${capped:.2f}")
        return {"dry_run": True, "client_order_id": cid, "symbol": symbol, "side": side, "amount": capped, "status": "simulated"}

    return _post("/orders/create_market", "create_market_order", order)


def close_position(symbol: str, reason: str = "") -> dict:
    positions = get_open_positions()
    pos = positions.get(symbol)
    if not pos:
        return {"skipped": True, "reason": "no_position"}

    close_side = "ask" if pos["side"] == "bid" else "bid"
    order = {"symbol": symbol, "side": close_side, "amount": str(round(pos["size"], 4)),
             "slippage_percent": str(ORDER_SLIPPAGE_PCT), "reduce_only": True, "client_order_id": str(uuid.uuid4())}

    if reason:
        print(f"[Executor] Closing {symbol}: {reason}")

    if DRY_RUN:
        print(f"[DRY RUN] Would close {symbol} {close_side}")
        _open_positions.pop(symbol, None)
        return {"dry_run": True, "status": "simulated_close", "symbol": symbol, "reason": reason}

    result = _post("/orders/create_market", "create_market_order", order)
    _open_positions.pop(symbol, None)
    return result


def record_entry(symbol: str, side: str, entry_price: float, size: float):
    _open_positions[symbol] = {"side": side, "entry_price": entry_price, "size": size, "entry_time": time.time()}