"""
initia_logger_evm.py — Logs PacificaPilot AI decisions to Initia MiniEVM (Solidity).
Uses web3.py to call the TradeLogger contract.
"""

import time
import json
import os
from logger import push_log

try:
    from web3 import Web3
except ImportError:
    push_log("[InitiaLogger] web3.py not installed. Run: pip install web3")
    Web3 = None


# Initia MiniEVM Testnet RPC
RPC_URL = os.getenv("INITIA_RPC_URL", "https://rpc.minievm.testnet.initia.xyz")
CONTRACT_ADDRESS = os.getenv("INITIA_CONTRACT_ADDRESS", "")
PRIVATE_KEY = os.getenv("INITIA_PRIVATE_KEY", "")

# Minimal ABI for logDecision function
ABI = [{
    "inputs": [
        {"name": "symbol", "type": "string"},
        {"name": "action", "type": "string"},
        {"name": "price", "type": "uint64"},
        {"name": "pnlUsdc", "type": "uint64"},
        {"name": "pnlIsNeg", "type": "bool"},
        {"name": "confidence", "type": "uint8"},
        {"name": "rsi5m", "type": "uint64"},
        {"name": "rsi1h", "type": "uint64"},
        {"name": "reasoning", "type": "string"},
        {"name": "dryRun", "type": "bool"},
        {"name": "timestamp", "type": "uint64"},
    ],
    "name": "logDecision",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
}]


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

        # Setup contract
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)
        account = w3.eth.account.from_key(PRIVATE_KEY)

        # Build transaction
        txn = contract.functions.logDecision(
            symbol,
            action,
            int(price * 1_000_000),
            int(abs(pnl_usdc) * 1_000_000),
            pnl_usdc < 0,
            max(0, min(100, int(confidence))),
            int((rsi_5m or 0.0) * 100),
            int((rsi_1h or 0.0) * 100),
            reasoning[:500],
            dry_run,
            int(time.time()),
        ).build_transaction({
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
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
        push_log(f"❌ Initia EVM logger error: {e}")
        return False
