"""
hashkey_logger.py — Logs PacificaPilot AI decisions to TradeLogger_v2.sol on HashKey Chain.

Requirements:
    pip install web3

Env vars to add to agent/.env:
    HASHKEY_RPC_URL=https://hashkeychain-testnet.alt.technology
    HASHKEY_PRIVATE_KEY=0xyour_evm_wallet_private_key
    TRADE_LOGGER_ADDRESS=0xYourDeployedContractAddress
"""

import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

HASHKEY_RPC_URL      = os.getenv("HASHKEY_RPC_URL", "https://testnet.hsk.xyz")
HASHKEY_PRIVATE_KEY  = os.getenv("HASHKEY_PRIVATE_KEY", "")
TRADE_LOGGER_ADDRESS = os.getenv("TRADE_LOGGER_ADDRESS", "")

# ABI for v2 contract — two functions
TRADE_LOGGER_ABI = [
    {
        "inputs": [
            {"name": "symbol",     "type": "string"},
            {"name": "action",     "type": "string"},
            {"name": "price",      "type": "uint256"},
            {"name": "pnlUsdc",    "type": "int256"},
            {"name": "confidence", "type": "uint8"},
            {"name": "dryRun",     "type": "bool"},
        ],
        "name": "logDecision",
        "outputs": [{"name": "id", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "id",        "type": "uint256"},
            {"name": "rsi5m",     "type": "int16"},
            {"name": "rsi1h",     "type": "int16"},
            {"name": "reasoning", "type": "string"},
        ],
        "name": "addDetails",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalDecisions",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]

_w3       = None
_contract = None
_account  = None
_enabled  = False


def _init():
    global _w3, _contract, _account, _enabled
    if not HASHKEY_PRIVATE_KEY or not TRADE_LOGGER_ADDRESS:
        print("[HashKey] HASHKEY_PRIVATE_KEY or TRADE_LOGGER_ADDRESS not set — on-chain logging disabled.")
        return
    try:
        from web3 import Web3
        _w3 = Web3(Web3.HTTPProvider(HASHKEY_RPC_URL))
        if not _w3.is_connected():
            print(f"[HashKey] Cannot connect to {HASHKEY_RPC_URL} — disabled.")
            return
        _account  = _w3.eth.account.from_key(HASHKEY_PRIVATE_KEY)
        _contract = _w3.eth.contract(
            address=Web3.to_checksum_address(TRADE_LOGGER_ADDRESS),
            abi=TRADE_LOGGER_ABI,
        )
        _enabled = True
        print(f"[HashKey] Connected — logging to {TRADE_LOGGER_ADDRESS} as {_account.address}")
    except Exception as e:
        print(f"[HashKey] Init failed: {e} — disabled.")


def _send_tx(fn, nonce: int) -> str:
    """
    Build, sign and send a contract function call.

    Accepts an explicit nonce so the caller can sequence multiple transactions
    without re-querying the node between broadcasts (which would return the same
    pending nonce and trigger a 'replacement transaction underpriced' error).

    Returns the tx hash hex string.
    """
    tx = fn.build_transaction({
        "from":     _account.address,
        "nonce":    nonce,
        "gas":      300_000,
        "gasPrice": _w3.to_wei("1", "gwei"),
    })
    signed  = _account.sign_transaction(tx)
    tx_hash = _w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()


def log_to_chain(
    symbol:     str,
    action:     str,
    mark_price: float,
    pnl_usdc:   Optional[float],
    confidence: float,
    rsi_5m:     Optional[float],
    rsi_1h:     Optional[float],
    reasoning:  str,
    dry_run:    bool,
) -> Optional[str]:
    """
    Sends two transactions to TradeLogger_v2.sol:
      1. logDecision() — core fields
      2. addDetails()  — RSI + reasoning

    Returns the first tx hash, or None if disabled/failed.
    """
    global _enabled

    if _w3 is None:
        _init()
    if not _enabled:
        return None

    try:
        from web3 import Web3

        # Convert floats → contract integers
        price_int = int(round(mark_price * 1_000_000))
        pnl_int   = int(round((pnl_usdc or 0.0) * 1_000_000))
        conf_int  = max(0, min(100, int(round(confidence * 100))))
        rsi5m_int = int(round(rsi_5m * 100)) if rsi_5m is not None else -1
        rsi1h_int = int(round(rsi_1h * 100)) if rsi_1h is not None else -1
        reasoning_short = (reasoning or "")[:400]

        # Fetch nonce once; increment manually for TX 2 to avoid the
        # "replacement transaction underpriced" error that occurs when both
        # calls to get_transaction_count(..., "pending") return the same value
        # while TX 1 is still unconfirmed.
        base_nonce = _w3.eth.get_transaction_count(_account.address, "pending")

        # TX 1: logDecision
        tx1_hash = _send_tx(
            _contract.functions.logDecision(
                symbol, action, price_int, pnl_int, conf_int, dry_run
            ),
            nonce=base_nonce,
        )
        print(f"[HashKey] ✓ logDecision tx: {tx1_hash}")

        # Wait for TX 1 to be mined before reading totalDecisions().
        # This guarantees the on-chain counter has already been incremented,
        # so decision_id correctly refers to the record we just created.
        _w3.eth.wait_for_transaction_receipt(tx1_hash, timeout=60)
        decision_id = _contract.functions.totalDecisions().call()

        # TX 2: addDetails — use nonce base_nonce + 1 (TX 1 is now mined,
        # but being explicit is safer than re-querying and racing again).
        tx2_hash = _send_tx(
            _contract.functions.addDetails(
                decision_id, rsi5m_int, rsi1h_int, reasoning_short
            ),
            nonce=base_nonce + 1,
        )
        print(f"[HashKey] ✓ addDetails tx: {tx2_hash}")

        return tx1_hash

    except Exception as e:
        print(f"[HashKey] ✗ On-chain log failed for {symbol}: {e}")
        _enabled = False  # circuit-break on repeated failures
        return None