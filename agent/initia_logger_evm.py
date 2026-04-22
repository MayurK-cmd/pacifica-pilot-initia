"""
initia_logger_evm.py — Logs PacificaPilot AI decisions to Initia MiniEVM (Solidity).
Uses web3.py to call the TradeLogger contract.
"""

import time
import json
import os
import threading
from logger import push_log

try:
    from web3 import Web3
except ImportError:
    push_log("[InitiaLogger] web3.py not installed. Run: pip install web3")
    Web3 = None


# Initia MiniEVM Testnet RPC
RPC_URL = os.getenv("INITIA_RPC_URL", "https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz")
CONTRACT_ADDRESS = os.getenv("INITIA_CONTRACT_ADDRESS", "0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc")
PRIVATE_KEY = os.getenv("INITIA_PRIVATE_KEY", "")

# ABI matching the deployed trade_logger.sol contract on Initia MiniEVM
ABI = [{
    "inputs": [
        {"name": "symbol",    "type": "string"},
        {"name": "action",    "type": "string"},
        {"name": "price",     "type": "uint64"},
        {"name": "pnlUsdc",   "type": "uint64"},
        {"name": "pnlIsNeg",  "type": "bool"},
        {"name": "confidence","type": "uint8"},
        {"name": "rsi5m",     "type": "uint64"},
        {"name": "rsi1h",     "type": "uint64"},
        {"name": "reasoning", "type": "string"},
        {"name": "dryRun",    "type": "bool"},
        {"name": "timestamp", "type": "uint64"},
    ],
    "name": "logDecision",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
}]

# Thread lock to prevent nonce race conditions when multiple symbols
# are processed concurrently (e.g. BTC + ETH in parallel threads)
_tx_lock = threading.Lock()

MAX_RETRIES = 3


def log_to_initia_evm(
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
    Fire-and-forget: calls logDecision on Initia MiniEVM via web3.py.
    Returns True on success. On failure logs warning and returns False.
    Thread-safe: uses a lock to serialize nonce assignment across threads.
    """
    if Web3 is None:
        push_log("⚠️  web3.py not available — skipping on-chain log")
        return False

    if not CONTRACT_ADDRESS:
        push_log("⚠️  INITIA_CONTRACT_ADDRESS not set — skipping on-chain log")
        return False

    if not PRIVATE_KEY:
        push_log("⚠️  INITIA_PRIVATE_KEY not set — skipping on-chain log")
        return False

    try:
        # Connect to Initia MiniEVM
        w3 = Web3(Web3.HTTPProvider(RPC_URL))
        if not w3.is_connected():
            push_log(f"❌ Could not connect to Initia RPC: {RPC_URL}")
            return False

        # Ensure 0x prefix on private key
        pk = PRIVATE_KEY if PRIVATE_KEY.startswith("0x") else f"0x{PRIVATE_KEY}"

        # Setup contract
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)
        account = w3.eth.account.from_key(pk)

        # Convert values to match deployed contract types (uint64)
        price_u64     = int(price * 1_000_000)
        pnl_abs_u64   = int(abs(pnl_usdc) * 1_000_000)
        pnl_is_neg    = pnl_usdc < 0
        confidence_u8 = max(0, min(100, int(confidence * 100)))
        rsi5m_u64     = int((rsi_5m or 0.0) * 100)
        rsi1h_u64     = int((rsi_1h or 0.0) * 100)
        ts            = int(time.time())

        # Retry loop handles nonce race conditions from concurrent threads
        for attempt in range(MAX_RETRIES):
            try:
                with _tx_lock:
                    # Fetch nonce inside lock to prevent race conditions
                    nonce = w3.eth.get_transaction_count(account.address)

                    # Build transaction matching deployed trade_logger.sol signature
                    txn = contract.functions.logDecision(
                        symbol,
                        action,
                        price_u64,
                        pnl_abs_u64,
                        pnl_is_neg,
                        confidence_u8,
                        rsi5m_u64,
                        rsi1h_u64,
                        reasoning[:500],
                        dry_run,
                        ts,
                    ).build_transaction({
                        "from": account.address,
                        "nonce": nonce,
                        "maxFeePerGas": w3.eth.gas_price,
                        "maxPriorityFeePerGas": w3.eth.gas_price,
                    })

                    # Sign and send
                    signed = account.sign_transaction(txn)
                    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

                push_log(f"⛓️  Logging {action} {symbol} to Initia MiniEVM...")
                push_log(f"✅ Initia tx: {tx_hash.hex()}")
                push_log(f"   🔍 https://scan.testnet.initia.xyz/txs/{tx_hash.hex()}")
                return True

            except Exception as e:
                err_msg = str(e)
                if "sequence mismatch" in err_msg and attempt < MAX_RETRIES - 1:
                    wait = 2 ** attempt
                    push_log(f"⚠️  Nonce conflict for {symbol}, retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})...")
                    time.sleep(wait)
                    continue
                raise

    except Exception as e:
        push_log(f"❌ Initia EVM logger error: {e}")
        return False
