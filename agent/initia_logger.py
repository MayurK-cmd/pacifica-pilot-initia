"""
initia_logger.py — Logs every PacificaPilot AI decision to Initia's Move chain.
Called from executor.py after each trade decision.
"""

import time
import subprocess
import json
import os
from logger import push_log


MODULE_ADDRESS = os.getenv("INITIA_MODULE_ADDRESS", "")
ACCOUNT_NAME   = os.getenv("INITIA_ACCOUNT_NAME", "initia-trader")
NODE_URL       = os.getenv("INITIA_NODE_URL", "https://rpc.testnet.initia.xyz")
CHAIN_ID       = os.getenv("INITIA_CHAIN_ID", "initiation-2")
GAS_PRICES     = os.getenv("INITIA_GAS_PRICES", "0.015uinit")


def log_to_initia(
    symbol: str,
    action: str,
    price: float,
    pnl_usdc: float = 0.0,
    confidence: float = 0.0,
    rsi_5m: float | None = None,
    rsi_1h: float | None = None,
    reasoning: str = "",
    dry_run: bool = True,
) -> bool:
    """
    Fire-and-forget: calls trade_logger::log_decision on Initia via initiad CLI.
    Returns True on success. On failure logs a warning and returns False —
    the trading bot continues running regardless.
    """
    if not MODULE_ADDRESS:
        push_log("⚠️  INITIA_MODULE_ADDRESS not set — skipping on-chain log")
        return False

    # Convert to on-chain types
    price_u64     = int(price * 1_000_000)
    pnl_abs_u64   = int(abs(pnl_usdc) * 1_000_000)
    pnl_is_neg    = "true" if pnl_usdc < 0 else "false"
    confidence_u8 = max(0, min(100, int(confidence)))
    rsi5_u64      = int((rsi_5m or 0.0) * 100)
    rsi1_u64      = int((rsi_1h or 0.0) * 100)
    ts            = int(time.time())
    dry_run_str   = "true" if dry_run else "false"
    reasoning_safe = reasoning[:500].replace('"', "'")

    args_str = (
        f'["string:{symbol}", "string:{action}", '
        f'"u64:{price_u64}", "u64:{pnl_abs_u64}", "bool:{pnl_is_neg}", '
        f'"u8:{confidence_u8}", "u64:{rsi5_u64}", "u64:{rsi1_u64}", '
        f'"string:{reasoning_safe}", "bool:{dry_run_str}", "u64:{ts}"]'
    )

    cmd = [
        "wsl", "bash", "--login", "-c",
        f"~/bin/initiad_v1.2.3 tx move execute "
        f"{MODULE_ADDRESS} trade_logger log_decision "
        f"--args {args_str} "
        f"--from {ACCOUNT_NAME} "
        f"--gas auto "
        f"--gas-adjustment 1.5 "
        f"--gas-prices {GAS_PRICES} "
        f"--node {NODE_URL} "
        f"--chain-id {CHAIN_ID} "
        f"--yes "
        f"--output json"
    ]

    try:
        push_log(f"⛓️  Logging {action} {symbol} to Initia...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if result.returncode == 0:
            data = json.loads(result.stdout)
            txhash = data.get("txhash", "unknown")
            push_log(f"✅ Initia tx: {txhash}")
            push_log(f"   🔍 https://scan.testnet.initia.xyz/txs/{txhash}")
            return True
        else:
            push_log(f"❌ Initia tx failed: {result.stderr.strip()}")
            return False

    except subprocess.TimeoutExpired:
        push_log("⏰ Initia tx timed out (30s) — continuing without on-chain log")
        return False
    except Exception as e:
        push_log(f"❌ Initia logger error: {e}")
        return False
