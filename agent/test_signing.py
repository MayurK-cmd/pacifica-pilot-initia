"""
test_signing.py — Verifies keypair loading + signing works correctly.
Run: python test_signing.py
"""
import os, json, time, base58
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

from solders.keypair import Keypair
import executor as exe

print("\n=== Signing Test ===")

# 1. Check keys load
try:
    kp = exe._get_keypair()
    print(f"✓ Main wallet:  {kp.pubkey()}")
except Exception as e:
    print(f"✗ Main wallet failed: {e}")

try:
    akp = exe._get_agent_keypair()
    print(f"✓ Agent wallet: {akp.pubkey()}")
except Exception as e:
    print(f"✗ Agent wallet failed: {e}")

# 2. Check signing produces valid output
try:
    payload = exe._sign_payload("create_market_order", {
        "symbol": "BTC", "side": "bid",
        "amount": "0.001", "slippage_percent": "0.5",
        "reduce_only": False, "client_order_id": "test-123"
    })
    print(f"✓ Signature:    {payload['signature'][:20]}...")
    print(f"  account:      {payload['account']}")
    print(f"  agent_wallet: {payload['agent_wallet']}")
except Exception as e:
    print(f"✗ Signing failed: {e}")

# 3. Check account info fetches correctly
WALLET = os.getenv("PACIFICA_WALLET_ADDRESS", "")
if WALLET:
    try:
        info = exe.get_account_info(WALLET)
        print(f"\n✓ Account info fetched:")
        print(f"  balance:          {info.get('balance')}")
        print(f"  account_equity:   {info.get('account_equity')}")
        print(f"  available_spend:  {info.get('available_to_spend')}")
    except Exception as e:
        print(f"✗ Account fetch failed: {e}")
else:
    print("\n⚠ Set PACIFICA_WALLET_ADDRESS in .env to test account fetch")

print("\n=== Done ===\n")