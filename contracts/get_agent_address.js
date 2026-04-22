/**
 * get_agent_address.js — Derives the EVM address from a hex private key.
 *
 * Usage:
 *   node get_agent_address.js [private_key_hex]
 *
 * If no argument is given, reads from INITIA_PRIVATE_KEY env var.
 */

const { privateKeyToAccount } = require("viem/accounts");

const rawKey = process.argv[2] || process.env.INITIA_PRIVATE_KEY;

if (!rawKey) {
  console.error("Usage: node get_agent_address.js <private_key_hex>");
  console.error("   or: set INITIA_PRIVATE_KEY=... && node get_agent_address.js");
  process.exit(1);
}

const formatted = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
const account = privateKeyToAccount(formatted);

console.log(`Private key: ${rawKey.slice(0, 6)}...${rawKey.slice(-4)}`);
console.log(`EVM address: ${account.address}`);
console.log(`\nUse this address with add_agent.js to authorize on-chain logging.`);
