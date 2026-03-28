"""
logger.py — Posts every agent decision to the Express backend (MongoDB).
Also sends heartbeat so the dashboard knows the agent is alive.
Falls back to local trades.json if backend is unreachable.
"""

import json
import os
import time
from datetime import datetime, timezone
import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"

# Fallback file if backend is down
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "trades.json")

_cycles_completed = 0


def _load_fallback() -> list:
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_fallback(trades: list):
    try:
        with open(LOG_FILE, "w") as f:
            json.dump(trades, f, indent=2)
    except Exception as e:
        print(f"[Logger] Fallback file write failed: {e}")


def log_decision(decision: dict, market: dict, sentiment: dict, order_result: dict = None):
    """
    Posts a complete agent cycle to the backend API.
    Falls back to local JSON if backend is unreachable.
    """
    payload = {
        "symbol": decision["symbol"],
        "action": decision["action"],
        "confidence": decision["confidence"],
        "reasoning": decision["reasoning"],
        "size_pct": decision.get("size_pct", 0),
        "mark_price": decision.get("mark_price", market.get("mark_price")),
        "rsi_14": market.get("rsi_14"),
        "funding_rate": market.get("funding_rate"),
        "change_24h": market.get("change_24h"),
        "sentiment_score": sentiment.get("sentiment_score"),
        "mention_count": sentiment.get("mention_count"),
        "trending_score": sentiment.get("trending_score"),
        "order": order_result,
        "dry_run": DRY_RUN,
        "pnl_usdc": None,
    }

    # Try posting to backend
    posted = False
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/trades",
            json=payload,
            timeout=5,
        )
        resp.raise_for_status()
        posted = True
    except Exception as e:
        print(f"[Logger] Backend unreachable, falling back to file: {e}")
        trades = _load_fallback()
        entry = {**payload, "timestamp": datetime.now(timezone.utc).isoformat()}
        trades.insert(0, entry)
        _save_fallback(trades[:500])

    # Pretty stdout log
    action_tag = {"LONG": "[LONG ]", "SHORT": "[SHORT]", "HOLD": "[HOLD ]"}.get(
        decision["action"], "[?]"
    )
    rsi_str = f"{market.get('rsi_14'):.2f}" if market.get("rsi_14") is not None else "N/A"
    print(
        f"\n{action_tag}  [{datetime.now(timezone.utc).strftime('%H:%M:%S')}] "
        f"{decision['symbol']} -> {decision['action']} "
        f"(confidence {decision['confidence']:.0%})\n"
        f"   Price: ${decision.get('mark_price', 0):,.2f}  |  "
        f"RSI: {rsi_str}  |  "
        f"Sentiment: {sentiment.get('sentiment_score', 0):+.2f}  |  "
        f"{'✓ posted' if posted else '⚠ fallback'}\n"
        f"   Reason: {decision['reasoning']}\n"
    )

    return payload


def send_heartbeat(symbol: str = None, error: str = None):
    """Called each cycle so dashboard knows agent is alive."""
    global _cycles_completed
    _cycles_completed += 1
    try:
        requests.post(
            f"{BACKEND_URL}/api/agent/heartbeat",
            json={
                "symbol": symbol,
                "cyclesCompleted": _cycles_completed,
                "error": error,
            },
            timeout=3,
        )
    except Exception:
        pass  # Heartbeat failure is non-critical


def get_recent_trades(limit: int = 50) -> list:
    """Fetch recent trades from backend (used by any local tooling)."""
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/trades",
            params={"limit": limit},
            timeout=5,
        )
        resp.raise_for_status()
        return resp.json().get("trades", [])
    except Exception:
        return _load_fallback()[:limit]