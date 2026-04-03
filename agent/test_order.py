"""
test_order.py — Places a real $10 market order on Pacifica testnet then closes it.
Run ONLY with DRY_RUN=false in .env.
"""
import os, time
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

import executor as exe

WALLET = "AMVvva41pZkvnQRbud1Kh3jqZmEsTngzifuGMPesEsrv"
DRY    = os.getenv("DRY_RUN", "true").lower() == "true"

if DRY:
    print("⚠  DRY_RUN=true — set DRY_RUN=false in .env to place real orders")
    exit(0)

print("\n=== Live Order Test (TESTNET) ===")
print(f"Wallet: {WALLET}")

# 1. Check balance
info = exe.get_account_info(WALLET)
avail = float(info.get("available_to_spend", 0))
print(f"Available to spend: ${avail:.2f}")

if avail < 15:
    print("✗ Insufficient balance — need at least $15")
    exit(1)

# 2. Fetch real mark price before placing order
import market as mkt
print("\n→ Fetching WIF market data...")
market_data = mkt.get_market_snapshot("WIF")
mark_price = market_data.get("mark_price", 0)
print(f"  WIF mark price: ${mark_price:.4f}")

if mark_price <= 0:
    print("✗ Could not fetch valid mark price")
    exit(1)

# 3. Place a small LONG (use $12 to account for lot-size rounding down)
print("\n→ Placing $12 LONG on WIF...")
result = exe.place_market_order("WIF", "bid", 12.0, 50.0, available_balance=avail, mark_price=mark_price)
print(f"  Result: {result}")

if result.get("skipped") or result.get("dry_run"):
    print("✗ Order was skipped or dry-run — check DRY_RUN setting")
    exit(1)

# 3. Wait for position to appear (API has propagation delay)
print("\n⏳ Waiting for position to appear...")
positions = {}
for attempt in range(10):  # Try for up to 30s
    time.sleep(3)
    positions = exe.get_open_positions(WALLET)
    if "WIF" in positions:
        print(f"  Position detected after {attempt+1} attempts: {positions['WIF']['size']} WIF")
        break
    print(f"  Attempt {attempt+1}: position not visible yet...")

# 4. Close it
if "WIF" in positions:
    print("\n→ Closing WIF position...")
    close = exe.close_position("WIF", reason="test-close")
    print(f"  Result: {close}")
    print("\n✓ Full buy + sell cycle completed successfully")
else:
    print("\n⚠ WIF position not found after 30s — check Pacifica dashboard")

print("=== Done ===\n")