# TradeLogger Smart Contract

**TradeLogger** is a Solidity smart contract deployed on HashKey Chain that provides an immutable, on-chain audit log for PacificaPilot AI trading decisions.

---

## Contract Overview

| Property | Value |
|----------|-------|
| **Network** | HashKey Chain Testnet |
| **Contract Address** | `0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B` |
| **Solidity Version** | ^0.8.20 |
| **License** | MIT |
| **Purpose** | On-chain audit trail for AI trading decisions |
| **Block Explorer** | [testnet-explorer.hsk.xyz/address/0xEe39...9a2B](https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B) |

---

## Why HashKey Chain?

HashKey Chain plays a critical role in the PacificaPilot ecosystem:

### 1. Immutable Audit Trail
Every AI trading decision (LONG/SHORT/HOLD/EXIT) is permanently recorded on-chain. This creates a tamper-proof history that anyone can verify.

### 2. Transparent AI Reasoning
The contract stores not just the action, but the AI's reasoning, confidence score, and market indicators (RSI, funding rates). This level of transparency is unprecedented in algorithmic trading.

### 3. Verifiable Performance
Judges, users, and auditors can query the contract to verify:
- Historical win/loss ratios
- Average confidence vs actual outcomes
- Strategy consistency over time

### 4. EVM Compatibility
HashKey Chain's EVM compatibility allows PacificaPilot to use standard web3.py tooling while maintaining a separate audit layer from the Solana-based Pacifica DEX.

---

## Contract Structure

### Decision Struct

```solidity
struct Decision {
    uint256 id;           // Unique decision ID
    address agent;        // AI agent's wallet address
    string  symbol;       // Trading pair (e.g., "BTC")
    string  action;       // "LONG" | "SHORT" | "HOLD" | "EXIT"
    uint256 price;        // Mark price × 1e6 (fixed-point precision)
    int256  pnlUsdc;      // Realized PnL × 1e6 (negative = loss)
    uint8   confidence;   // AI confidence 0-100
    int16   rsi5m;        // RSI 5-minute × 100 (-1 if unavailable)
    int16   rsi1h;        // RSI 1-hour × 100 (-1 if unavailable)
    string  reasoning;    // AI's plain-English explanation
    bool    dryRun;       // true = paper trade, false = live
    uint256 timestamp;    // Block timestamp
}
```

### Key Functions

#### `logDecision()` — Record a New Decision

```solidity
function logDecision(
    string calldata symbol,
    string calldata action,
    uint256 price,
    int256 pnlUsdc,
    uint8 confidence,
    int16 rsi5m,
    int16 rsi1h,
    string calldata reasoning,
    bool dryRun
) external onlyAgent returns (uint256 id)
```

**Parameters:**
- `symbol`: Token symbol (e.g., "BTC", "ETH")
- `action`: Trading action ("LONG", "SHORT", "HOLD", "EXIT")
- `price`: Mark price scaled by 1e6 (e.g., $66,500.00 → 66500000000)
- `pnlUsdc`: Realized PnL in USDC scaled by 1e6 (0 if no position closed)
- `confidence`: AI confidence score (0-100)
- `rsi5m`: RSI 5-minute timeframe × 100 (-1 if unavailable)
- `rsi1h`: RSI 1-hour timeframe × 100 (-1 if unavailable)
- `reasoning`: AI's plain-English explanation (max ~500 chars)
- `dryRun`: true for paper trading, false for live execution

**Returns:**
- `id`: Unique decision ID for reference

**Access Control:** Only authorized agents or owner can call.

---

#### `getDecision()` — Query a Specific Decision

```solidity
function getDecision(uint256 id) external view returns (Decision memory)
```

Returns the full Decision struct for a given ID.

---

#### `getRecentDecisions()` — Dashboard Query

```solidity
function getRecentDecisions(uint256 count) external view returns (Decision[] memory)
```

Returns the last N decisions across all agents (newest first). Useful for frontend dashboards.

---

#### `getAgentDecisionIds()` — Agent History

```solidity
function getAgentDecisionIds(address agent) external view returns (uint256[] memory)
```

Returns all decision IDs for a specific agent address.

---

### Events

#### `DecisionLogged`

```solidity
event DecisionLogged(
    uint256 indexed id,
    address indexed agent,
    string  symbol,
    string  action,
    uint256 price,
    int256  pnlUsdc,
    uint8   confidence,
    int16   rsi5m,
    int16   rsi1h,
    string  reasoning,
    bool    dryRun
);
```

Emitted every time a decision is logged. Indexes `id` and `agent` for efficient filtering.

---

### Access Control

| Function | Access |
|----------|--------|
| `logDecision()` | Owner or authorized agents |
| `addAgent()` | Owner only |
| `removeAgent()` | Owner only |
| All `get*()` functions | Public (view) |

---

## Deployed Contract

The TradeLogger contract is **already deployed** on HashKey Chain testnet:

```
Contract Address: 0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B
```

### Network Details

| Property | Value |
|----------|-------|
| **Network** | HashKey Chain Testnet |
| **RPC URL** | `https://testnet.hsk.xyz` |
| **Chain ID** | 17069 |
| **Block Explorer** | `https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B` |

### Configuration

Add to your `agent/.env`:

```bash
HASHKEY_RPC_URL=https://testnet.hsk.xyz
HASHKEY_PRIVATE_KEY=0xyour_evm_wallet_private_key
TRADE_LOGGER_ADDRESS=0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B
```

---

## Deploy Your Own (Optional)

If you want to deploy your own instance:

### Prerequisites

- Foundry or Hardhat installed
- HashKey Chain testnet RPC access
- EVM wallet with HSK testnet tokens

### Deploy with Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Deploy
forge create --rpc-url https://testnet-explorer.hsk.xyz \
    --private-key $DEPLOYER_PRIVATE_KEY \
    contracts/TradeLogger.sol:TradeLogger
```

### Deploy with Remix

1. Open [Remix IDE](https://remix.ethereum.org)
2. Paste `TradeLogger.sol` code
3. Select "Injected Provider - HashKey Chain"
4. Compile with Solidity 0.8.20+
5. Click "Deploy"

### Post-Deployment

1. Copy the deployed contract address
2. Add to `agent/.env`:
   ```bash
   TRADE_LOGGER_ADDRESS=0xYourDeployedContractAddress
   ```
3. Fund the agent wallet with testnet HSK for gas

---

## Integration Flow

```
┌─────────────────────┐
│ PacificaPilot Agent │
│   (Python + web3.py)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  hashkey_logger.py                      │
│  1. Convert floats to fixed-point ints  │
│  2. Build logDecision() transaction     │
│  3. Sign with EVM private key           │
│  4. Broadcast to HashKey Chain RPC      │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  TradeLogger.sol (HashKey Chain)        │
│  - Validates sender is authorized agent │
│  - Stores Decision struct in mapping    │
│  - Emits DecisionLogged event           │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Frontend (React + viem/wagmi)          │
│  - Queries getRecentDecisions()         │
│  - Displays audit trail in UI           │
│  - Filters by agent/symbol/action       │
└─────────────────────────────────────────┘
```

---

## Gas Optimization

The contract uses several gas-saving techniques:

1. **Fixed-point arithmetic**: Prices stored as integers (×1e6) avoid expensive Solidity math libraries
2. **Packed storage**: Related fields ordered to minimize storage slots
3. **Calldata strings**: External functions use `calldata` for string parameters (cheaper than `memory`)
4. **Indexed events**: Key fields indexed for efficient off-chain querying

---

## Security Considerations

### Access Control
- Only the owner can add/remove authorized agents
- Agent addresses stored in a mapping for O(1) lookup
- Owner can log decisions directly (bypasses agent authorization)

### Data Integrity
- Once logged, decisions cannot be modified or deleted
- Timestamps use `block.timestamp` (miner-manipulable within limits)
- String reasoning truncated to ~500 chars to prevent excessive gas costs

### Circuit Breaker
The Python `hashkey_logger.py` includes a circuit breaker pattern:
- If on-chain logging fails repeatedly, it disables and logs locally
- Prevents infinite retry loops during network issues

---

## Querying the Contract

### Using web3.py

```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://testnet-explorer.hsk.xyz"))
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)

# Get last 10 decisions
decisions = contract.functions.getRecentDecisions(10).call()
```

### Using viem (TypeScript)

```typescript
import { createPublicClient, http } from 'viem'
import { hashkeyTestnet } from 'viem/chains'

const client = createPublicClient({
  chain: hashkeyTestnet,
  transport: http()
})

const decisions = await client.readContract({
  address: CONTRACT_ADDRESS,
  functionName: 'getRecentDecisions',
  args: [10n]
})
```

### Block Explorer

Visit the deployed contract on HashKey Chain block explorer:

**https://testnet-explorer.hsk.xyz/address/0xEe39002BF9783DB5dac224Df968D0e3c5CE39a2B**

You can:
- View all transactions to/from the contract
- Read contract state (decisions, agent mappings)
- Filter by `DecisionLogged` event logs
- Verify the contract source code

---

## Future Enhancements

Potential upgrades for v2:

1. **Batch Logging**: `logDecisions()` to batch multiple decisions in one tx
2. **Verification Proofs**: Store cryptographic proofs of AI model inputs
3. **Staking Mechanism**: Agents stake HSK as collateral for performance guarantees
4. **Governance**: DAO voting on authorized agents and parameters
5. **Cross-Chain Bridge**: Mirror decisions to other chains for redundancy

---

## License

MIT License — same as PacificaPilot project

---

## Support

For issues or questions:
- GitHub Issues: [MayurK-cmd/pacifica-pilot-hashkey](https://github.com/MayurK-cmd/pacifica-pilot-hashkey/issues)
- HashKey Chain Docs: [https://hashkeychain.org/docs](https://hashkeychain.org/docs)
