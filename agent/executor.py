"""
executor.py — Places/closes market orders on Pacifica with full position management.

Improvements over v1:
  - Dynamic balance-aware sizing: usdc_size capped at available_balance * 0.9
  - Trailing stops: trailing_high/trailing_low updated each cycle, stop trails the peak
  - Persistent position tracking: positions.json survives agent restarts
  - walletAddress comes from backend config, NOT derived from private key
  - stop_loss_pct and take_profit_pct come from config per cycle, NOT env vars
"""

import os, json, time, uuid, base58, requests
from pathlib import Path
from dotenv import load_dotenv
from solders.keypair import Keypair

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

BASE_URL           = os.getenv("PACIFICA_BASE_URL", "https://test-api.pacifica.fi/api/v1")
PRIVATE_KEY        = os.getenv("PACIFICA_PRIVATE_KEY", "")
AGENT_PRIVATE_KEY  = os.getenv("PACIFICA_AGENT_PRIVATE_KEY", "")
AGENT_PUBLIC_KEY   = os.getenv("PACIFICA_AGENT_PUBLIC_KEY", "")
ORDER_SLIPPAGE_PCT = os.getenv("ORDER_SLIPPAGE_PERCENT", "0.5")
DRY_RUN            = os.getenv("DRY_RUN", "true").lower() == "true"

POSITIONS_FILE = Path(__file__).parent / "positions.json"

_open_positions: dict = {}
_keypair              = None
_agent_keypair        = None


# ── Persistent position tracking ──────────────────────────────────────────────

# Add this near the top of executor.py with the other module-level vars
_market_info_cache: dict = {}   # symbol → { lot_size, tick_size, min_order_size }

def _get_market_info(symbol: str) -> dict:
    global _market_info_cache
    if symbol in _market_info_cache:
        return _market_info_cache[symbol]
    try:
        r = requests.get(f"{BASE_URL}/info", headers=_headers(), timeout=10)
        r.raise_for_status()
        data = r.json().get("data", [])
        for m in data:
            _market_info_cache[m["symbol"]] = {
                "lot_size":       float(m.get("lot_size", "0.0001")),
                "tick_size":      float(m.get("tick_size", "0.01")),
                "min_order_size": float(m.get("min_order_size", "10")),
            }
        return _market_info_cache.get(symbol, {"lot_size": 0.0001, "tick_size": 0.01, "min_order_size": 10})
    except Exception as e:
        print(f"[Executor] Could not fetch market info for {symbol}: {e}")
        return {"lot_size": 0.0001, "tick_size": 0.01, "min_order_size": 10}


def _usdc_to_coin_amount(usdc_size: float, mark_price: float, lot_size: float) -> str:
    """
    Pacifica amount field = coin quantity (not USDC).
    $10 of WIF at $0.18 = 55.55 WIF → rounded to lot_size → "55.0"
    """
    if mark_price <= 0:
        raise ValueError(f"Invalid mark price: {mark_price}")
    raw_coins = usdc_size / mark_price
    # Round DOWN to nearest lot_size multiple
    snapped = int(raw_coins / lot_size) * lot_size
    # Format without trailing noise
    decimals = max(0, -int(f"{lot_size:e}".split("e")[1]))
    return f"{snapped:.{decimals}f}"

def _load_positions() -> dict:
    """Load positions from disk on startup so restarts don't lose open trades."""
    try:
        if POSITIONS_FILE.exists():
            data = json.loads(POSITIONS_FILE.read_text())
            print(f"[Executor] Loaded {len(data)} persisted position(s) from disk.")
            return data
    except Exception as e:
        print(f"[Executor] Could not load positions.json: {e}")
    return {}


def _save_positions():
    """Flush in-memory positions to disk after every mutation."""
    try:
        POSITIONS_FILE.write_text(json.dumps(_open_positions, indent=2))
    except Exception as e:
        print(f"[Executor] Could not save positions.json: {e}")


# Load persisted positions at import time (survives restarts)
_open_positions = _load_positions()


# ── Key management ────────────────────────────────────────────────────────────

def _get_keypair() -> Keypair:
    global _keypair
    if _keypair is None:
        raw = PRIVATE_KEY.strip()
        if not raw:
            raise RuntimeError("PACIFICA_PRIVATE_KEY is not set in agent .env")
        try:
            _keypair = Keypair.from_base58_string(raw)
        except Exception:
            _keypair = Keypair.from_bytes(base58.b58decode(raw))
    return _keypair


def _get_agent_keypair() -> Keypair:
    global _agent_keypair
    if _agent_keypair is None:
        raw = AGENT_PRIVATE_KEY.strip()
        if not raw:
            raise RuntimeError("PACIFICA_AGENT_PRIVATE_KEY is not set in agent .env")
        try:
            _agent_keypair = Keypair.from_base58_string(raw)
        except Exception:
            _agent_keypair = Keypair.from_bytes(base58.b58decode(raw))
    return _agent_keypair


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _sort_json_keys(v):
    if isinstance(v, dict):
        return {k: _sort_json_keys(vv) for k, vv in sorted(v.items())}
    if isinstance(v, list):
        return [_sort_json_keys(i) for i in v]
    return v


def _sign_payload(op: str, data: dict) -> dict:
    main_kp = _get_keypair()

    if AGENT_PRIVATE_KEY and AGENT_PUBLIC_KEY:
        signing_kp   = _get_agent_keypair()
        agent_wallet = AGENT_PUBLIC_KEY.strip()
    else:
        signing_kp   = main_kp
        agent_wallet = None

    ts  = int(time.time() * 1_000)
    ew  = 5_000
    msg = json.dumps(
        _sort_json_keys({
            "timestamp":     ts,
            "expiry_window": ew,
            "type":          op,
            "data":          data,
        }),
        separators=(",", ":"),
    ).encode()

    sig = base58.b58encode(bytes(signing_kp.sign_message(msg))).decode()

    return {
        "account":       str(main_kp.pubkey()),
        "agent_wallet":  agent_wallet,
        "signature":     sig,
        "timestamp":     ts,
        "expiry_window": ew,
    }


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    k = os.getenv("PACIFICA_API_KEY", "")
    if k: h["PF-API-KEY"] = k
    return h



def _post(path: str, op: str, data: dict, retries: int = 3) -> dict:
    body = {**_sign_payload(op, data), **data}
    for attempt in range(retries):
        try:
            r = requests.post(
                f"{BASE_URL}{path}", json=body, headers=_headers(), timeout=15
            )
            # Print full response body on failure so we can see the real error
            if not r.ok:
                print(f"[Executor] Error response body: {r.text}")
            r.raise_for_status()
            return r.json()
        except requests.exceptions.HTTPError as e:
            wait = 2 ** attempt
            print(f"[Executor] POST {path} attempt {attempt+1}/{retries} failed: {e}. Waiting {wait}s...")
            time.sleep(wait)
        except Exception as e:
            wait = 2 ** attempt
            print(f"[Executor] POST {path} attempt {attempt+1}/{retries} failed: {e}. Waiting {wait}s...")
            time.sleep(wait)
    raise RuntimeError(f"[Executor] {path} failed after {retries} retries")


def _get_api(path: str, wallet_address: str, params: dict = None, retries: int = 3) -> dict:
    merged = {"account": wallet_address, **(params or {})}
    for attempt in range(retries):
        try:
            r = requests.get(
                f"{BASE_URL}{path}", params=merged, headers=_headers(), timeout=10
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            wait = 2 ** attempt
            print(f"[Executor] GET {path} attempt {attempt+1}/{retries} failed: {e}. Waiting {wait}s...")
            time.sleep(wait)
    return {}


# ── Account / position queries ────────────────────────────────────────────────

def get_account_info(wallet_address: str) -> dict:
    raw = _get_api("/account", wallet_address)
    return raw.get("data", raw)


def get_open_positions(wallet_address: str) -> dict:
    """
    Fetches live positions from Pacifica /positions endpoint and merges with
    persisted state so trailing high-water marks survive across multiple API calls.
    """
    global _open_positions
    try:
        # Fetch from dedicated /positions endpoint (not nested in /account)
        raw = _get_api("/positions", wallet_address)
        positions = raw.get("data", []) or []
        live      = {}
        for p in positions:
            sym  = p.get("symbol", "")
            # Pacifica uses "amount" field, not "size"
            amount = float(p.get("amount", 0) or 0)
            side   = p.get("side", "")
            if amount > 0:
                persisted = _open_positions.get(sym, {})
                live[sym] = {
                    "side":           side,  # "bid" or "ask"
                    "size":           amount,
                    "entry_price":    float(p.get("entry_price", 0) or 0),
                    "unrealized_pnl": 0.0,  # Not returned by API
                    "mark_price":     float(p.get("mark_price", 0) or 0),
                    # Preserve trailing marks from persisted state — crucial for trailing stops
                    "trailing_high":  persisted.get("trailing_high"),
                    "trailing_low":   persisted.get("trailing_low"),
                    "entry_time":     persisted.get("entry_time", time.time()),
                }
        _open_positions = live
        _save_positions()
        return live
    except Exception as e:
        print(f"[Executor] Could not fetch live positions: {e}")
        return _open_positions


# ── Trailing stop update ──────────────────────────────────────────────────────

def _update_trailing_mark(symbol: str, current_price: float):
    """
    Called once per cycle BEFORE should_exit.
    Long:  trailing_high climbs with the price, never resets down.
    Short: trailing_low  falls with the price, never resets up.
    """
    pos = _open_positions.get(symbol)
    if not pos:
        return

    changed = False
    if pos["side"] == "bid":
        prev = pos.get("trailing_high") or pos["entry_price"]
        if current_price > prev:
            _open_positions[symbol]["trailing_high"] = current_price
            changed = True
    else:
        prev = pos.get("trailing_low") or pos["entry_price"]
        if current_price < prev:
            _open_positions[symbol]["trailing_low"] = current_price
            changed = True

    if changed:
        _save_positions()


# ── Risk checks ───────────────────────────────────────────────────────────────

def compute_pnl(symbol: str, current_price: float) -> float | None:
    pos = _open_positions.get(symbol)
    if not pos or pos["entry_price"] == 0:
        return None
    entry = pos["entry_price"]
    size  = pos["size"]
    if pos["side"] == "bid":
        return round((current_price - entry) / entry * size, 4)
    return round((entry - current_price) / entry * size, 4)


def should_exit(
    symbol: str,
    current_price: float,
    stop_loss_pct: float,
    take_profit_pct: float,
) -> tuple[bool, str]:
    """
    Trailing stop-loss + fixed take-profit.

    Long example:
      entry=$100, price peaks at $110, stop_loss_pct=3
      → trailing floor = $110 * (1 - 0.03) = $106.70
      → exit triggered if price falls to or below $106.70
      → NOT triggered if price merely dips -4% from entry to $96 then recovers

    Short example (mirrored):
      entry=$100, price troughs at $90, stop_loss_pct=3
      → trailing ceiling = $90 * (1 + 0.03) = $92.70
      → exit triggered if price rises to or above $92.70
    """
    pos = _open_positions.get(symbol)
    if not pos or pos["entry_price"] == 0:
        return False, ""

    # Advance the trailing mark before checking
    _update_trailing_mark(symbol, current_price)
    pos = _open_positions[symbol]  # re-read after update

    entry = pos["entry_price"]

    if pos["side"] == "bid":
        trail_ref   = pos.get("trailing_high") or entry
        trail_floor = trail_ref * (1 - stop_loss_pct / 100)
        entry_chg   = (current_price - entry) / entry * 100

        if current_price <= trail_floor:
            locked = (trail_ref - entry) / entry * 100
            return True, (
                f"trailing-stop ${trail_floor:,.2f} "
                f"(peaked +{locked:.1f}%, now {entry_chg:.1f}% from entry)"
            )
        if entry_chg >= take_profit_pct:
            return True, f"take-profit +{entry_chg:.2f}%"

    else:  # short
        trail_ref  = pos.get("trailing_low") or entry
        trail_ceil = trail_ref * (1 + stop_loss_pct / 100)
        entry_chg  = (entry - current_price) / entry * 100

        if current_price >= trail_ceil:
            locked = (entry - trail_ref) / entry * 100
            return True, (
                f"trailing-stop ${trail_ceil:,.2f} "
                f"(peaked +{locked:.1f}%, now {entry_chg:.1f}% from entry)"
            )
        if entry_chg >= take_profit_pct:
            return True, f"take-profit +{entry_chg:.2f}%"

    return False, ""


# ── Order placement ───────────────────────────────────────────────────────────

def place_market_order(
    symbol: str,
    side: str,
    usdc_size: float,
    max_position_usdc: float,
    available_balance: float | None = None,
     mark_price: float | None = None,
) -> dict:
    """
    Dynamic balance-aware sizing:
      1. Cap at max_position_usdc (user config limit)
      2. Cap at 90% of available_balance (don't exhaust free collateral)
      3. Reject if resulting size < $10 (minimum order)
    """
    if symbol in _open_positions:
        pos = _open_positions[symbol]
        print(f"[Executor] Skipping {symbol}: already have {pos['side']} position (size={pos['size']:.2f})")
        return {"skipped": True, "reason": "existing_position", "symbol": symbol}

    # Cap 1: configured max
    capped = min(usdc_size, max_position_usdc)

    # Cap 2: 90% of free collateral
    if available_balance is not None:
        balance_cap = available_balance * 0.9
        if balance_cap < capped:
            print(
                f"[Executor] {symbol}: sizing down ${capped:.2f} → ${balance_cap:.2f} "
                f"(90% of ${available_balance:.2f} available balance)"
            )
            capped = balance_cap

    # Cap 3: minimum order guard — never silently fail
    if capped < 10.0:
        # reason = (
        #     f"order size ${capped:.2f} below $10 minimum "
        #     f"(available: ${available_balance:.2f})" if available_balance is not None
        #     else f"order size ${capped:.2f} below $10 minimum"
        # )
        print(f"[Executor] {symbol}: {reason} — skipping")
        return {"skipped": True, "reason": "insufficient_balance", "symbol": symbol, "size_attempted": capped}

    
    info     = _get_market_info(symbol)
    lot_size = info["lot_size"]

    # Convert USDC → coin amount using mark price
    price = mark_price or 1.0
    try:
        coin_amount = _usdc_to_coin_amount(capped, price, lot_size)
    except Exception as e:
        print(f"[Executor] Amount conversion failed for {symbol}: {e} — skipping")
        return {"skipped": True, "reason": f"amount_conversion_failed: {e}", "symbol": symbol}

    # Validate minimum coin amount translates to at least $10
    coin_float = float(coin_amount)
    if coin_float * price < 10.0:
        print(f"[Executor] {symbol}: {coin_amount} coins × ${price:.4f} = ${coin_float*price:.2f} < $10 min — skipping")
        return {"skipped": True, "reason": "below_min_order_value", "symbol": symbol}

    cid   = str(uuid.uuid4())
    order = {
        "symbol":           symbol,
        "side":             side,
        "amount":           coin_amount,  # Use coin quantity, not USDC
        "slippage_percent": str(ORDER_SLIPPAGE_PCT),
        "reduce_only":      False,
        "client_order_id":  cid,
    }

    if DRY_RUN:
        print(f"[DRY RUN] Would place {side.upper()} {symbol} ${capped:.2f}")
        return {
            "dry_run": True, "client_order_id": cid,
            "symbol": symbol, "side": side,
            "amount": capped, "status": "simulated",
        }

    return _post("/orders/create_market", "create_market_order", order)


def close_position(symbol: str, reason: str = "") -> dict:
    pos = _open_positions.get(symbol)
    if not pos:
        return {"skipped": True, "reason": "no_position"}

    close_side = "ask" if pos["side"] == "bid" else "bid"
    order = {
        "symbol":           symbol,
        "side":             close_side,
        "amount":           str(round(pos["size"], 4)),
        "slippage_percent": str(ORDER_SLIPPAGE_PCT),
        "reduce_only":      True,
        "client_order_id":  str(uuid.uuid4()),
    }

    if reason:
        print(f"[Executor] Closing {symbol}: {reason}")

    if DRY_RUN:
        print(f"[DRY RUN] Would close {symbol} {close_side}")
        _open_positions.pop(symbol, None)
        _save_positions()
        return {"dry_run": True, "status": "simulated_close", "symbol": symbol, "reason": reason}

    result = _post("/orders/create_market", "create_market_order", order)
    _open_positions.pop(symbol, None)
    _save_positions()
    return result


def record_entry(symbol: str, side: str, entry_price: float, size: float):
    _open_positions[symbol] = {
        "side":          side,
        "entry_price":   entry_price,
        "size":          size,
        "entry_time":    time.time(),
        # Initialise trailing marks at entry so the first update can only improve them
        "trailing_high": entry_price if side == "bid" else None,
        "trailing_low":  entry_price if side == "ask" else None,
    }
    _save_positions()