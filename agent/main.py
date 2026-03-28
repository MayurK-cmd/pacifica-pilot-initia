"""
main.py — PacificaPilot agent loop.

Pulls config from Express backend each cycle so user changes take effect immediately.
Posts all decisions to backend via logger.py.
Sends heartbeat so dashboard knows agent is alive.

Usage:
    python main.py

Environment (agent/.env):
    BACKEND_URL=http://localhost:3001
    PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1
    PACIFICA_PRIVATE_KEY=your_key_here
    GEMINI_API_KEY=your_key_here
    ELFA_API_KEY=your_key_here
    DRY_RUN=true
"""

import os
import sys
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

import market as mkt
import sentiment as snt
import strategy as strat
import executor as exe
import logger as log

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

# Defaults — overridden by backend config each cycle
DEFAULT_SYMBOLS   = [s.strip() for s in os.getenv("TRADE_SYMBOLS", "BTC,ETH").split(",")]
DEFAULT_INTERVAL  = int(os.getenv("LOOP_INTERVAL_SECONDS", "300"))
DEFAULT_MAX_POS   = float(os.getenv("MAX_POSITION_USDC", "50"))
DEFAULT_MIN_CONF  = float(os.getenv("MIN_CONFIDENCE", "0.6"))
DRY_RUN           = os.getenv("DRY_RUN", "true").lower() == "true"


def fetch_config() -> dict:
    """Pull live config from backend. Falls back to env defaults if backend is down."""
    try:
        resp = requests.get(f"{BACKEND_URL}/api/config", timeout=5)
        resp.raise_for_status()
        cfg = resp.json()
        return {
            "symbols":      cfg.get("symbols", DEFAULT_SYMBOLS),
            "interval":     cfg.get("loopIntervalSeconds", DEFAULT_INTERVAL),
            "max_pos":      cfg.get("maxPositionUsdc", DEFAULT_MAX_POS),
            "min_conf":     cfg.get("minConfidence", DEFAULT_MIN_CONF),
            "dry_run":      cfg.get("dryRun", DRY_RUN),
            "enabled":      cfg.get("enabled", True),
            "risk_level":   cfg.get("riskLevel", "balanced"),
        }
    except Exception as e:
        print(f"[Config] Backend unreachable, using env defaults: {e}")
        return {
            "symbols":    DEFAULT_SYMBOLS,
            "interval":   DEFAULT_INTERVAL,
            "max_pos":    DEFAULT_MAX_POS,
            "min_conf":   DEFAULT_MIN_CONF,
            "dry_run":    DRY_RUN,
            "enabled":    True,
            "risk_level": "balanced",
        }


def run_cycle(cfg: dict):
    symbols   = cfg["symbols"]
    max_pos   = cfg["max_pos"]
    min_conf  = cfg["min_conf"]
    dry_run   = cfg["dry_run"]

    print(f"\n{'='*60}")
    print(f"[PacificaPilot] Cycle — {symbols}")
    print(f"  Mode: {'DRY RUN' if dry_run else '🔴 LIVE'}  |  "
          f"Max: ${max_pos}  |  Min confidence: {min_conf:.0%}  |  "
          f"Risk: {cfg['risk_level']}")
    print(f"{'='*60}")

    for symbol in symbols:
        try:
            # 1. Market data
            print(f"\n[{symbol}] Fetching market data...")
            market_data = mkt.get_market_snapshot(symbol)
            rsi_s = f"{market_data['rsi_14']:.2f}" if market_data.get("rsi_14") is not None else "N/A"
            print(f"  Price: ${market_data['mark_price']:,.2f}  RSI: {rsi_s}  "
                  f"Funding: {market_data['funding_rate']}")

            # 2. Sentiment
            print(f"[{symbol}] Fetching Elfa AI sentiment...")
            sentiment_data = snt.get_token_sentiment(symbol)
            print(f"  Sentiment: {sentiment_data['sentiment_score']:+.2f}  "
                  f"Mentions: {sentiment_data['mention_count']}  "
                  f"Trending: {sentiment_data['trending_score']:.0f}")

            # 3. Decide
            print(f"[{symbol}] Asking Gemini for decision...")
            decision = strat.decide(market_data, sentiment_data)
            print(f"  Decision: {decision['action']} (confidence {decision['confidence']:.0%})")

            # 4. Execute — respect min_confidence from user config
            order_result = None
            if decision["action"] in ("LONG", "SHORT"):
                if decision["confidence"] >= min_conf:
                    side      = "bid" if decision["action"] == "LONG" else "ask"
                    usdc_size = max_pos * decision.get("size_pct", 0.5)
                    print(f"[{symbol}] Placing {decision['action']} — ${usdc_size:.2f} USDC...")
                    order_result = exe.place_market_order(symbol, side, usdc_size)
                else:
                    print(f"[{symbol}] Signal below min confidence "
                          f"({decision['confidence']:.0%} < {min_conf:.0%}) — skipping order.")
                    decision["action"] = "HOLD"
            else:
                print(f"[{symbol}] Holding — no order placed.")

            # 5. Log to backend
            log.log_decision(decision, market_data, sentiment_data, order_result)

            # 6. Heartbeat
            log.send_heartbeat(symbol=symbol)

        except Exception as e:
            print(f"[{symbol}] Error during cycle: {e}")
            import traceback
            traceback.print_exc()
            log.send_heartbeat(symbol=symbol, error=str(e))


def main():
    print("\n[PacificaPilot] Starting...")
    print(f"  Backend: {BACKEND_URL}")
    print(f"  DRY RUN: {DRY_RUN}\n")

    cycle_count = 0
    while True:
        cfg = fetch_config()

        if not cfg["enabled"] and cycle_count > 0:
            print("[PacificaPilot] Agent disabled via config — sleeping...")
            time.sleep(30)
            continue

        run_cycle(cfg)
        cycle_count += 1

        print(f"\nSleeping {cfg['interval']}s until next cycle...")
        time.sleep(cfg["interval"])


if __name__ == "__main__":
    main()