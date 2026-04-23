<p align="center">
  <img src="https://img.shields.io/badge/Initia-MiniEVM-00d1ff?style=for-the-badge&logo=ethereum&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/DEX-Pacifica-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Track-DeFi_%2B_AI-green?style=for-the-badge" />
</p>

# 🤖 PacificaPilot — Autonomous AI Trading Agent on Initia

> **INITIATE Hackathon (Season 1) — DeFi + AI & Tooling Tracks**
>
> An autonomous AI trading agent for [Pacifica](https://pacifica.fi) perpetual futures, with every decision logged on-chain to [Initia MiniEVM](https://docs.initia.xyz) for full transparency and auditability.

---

## 📌 What is PacificaPilot?

PacificaPilot is a **full-stack autonomous trading system** that:

1. **Ingests real-time market signals** — RSI (5m/1h), funding rates, and basis spread vs Binance spot
2. **Analyzes social sentiment** — via [Elfa AI](https://elfa.ai) Twitter/X engagement scoring
3. **Makes AI-powered decisions** — Google Gemini 2.5 Flash synthesizes all signals into LONG / SHORT / HOLD with confidence-weighted reasoning
4. **Executes trades** — automated order placement on Pacifica perpetual futures DEX
5. **Logs every decision on-chain** — immutable audit trail on **Initia MiniEVM** via the `TradeLogger` smart contract
6. **Streams everything to a dashboard** — real-time React frontend connected via InterwovenKit

---

## 🏗️ Architecture

```
┌──────────────────────┐
│   React Frontend     │◀─── InterwovenKit (Initia Wallet)
│   (Vite + TailwindCSS)│
└──────────┬───────────┘
           │ REST API
┌──────────▼───────────┐      ┌─────────────────────────┐
│   Express Backend    │◀────▶│   Python AI Agent       │
│   (Node.js + MongoDB)│      │   (Gemini 2.5 Flash)    │
└──────────────────────┘      └──────────┬──────────────┘
                                         │
                              ┌──────────▼──────────────┐
                              │   Initia MiniEVM        │
                              │   TradeLogger Contract  │
                              │   (On-chain audit log)  │
                              └─────────────────────────┘
                                         │
                              ┌──────────▼──────────────┐
                              │   Pacifica DEX          │
                              │   (Perpetual Futures)   │
                              └─────────────────────────┘
```

---

## 🌟 Initia Integration

### InterwovenKit
- Wallet connection via `@initia/interwovenkit-react` for seamless Initia wallet auth
- Users connect their Initia wallet on the landing page and are routed to the dashboard
- Configuration: `InterwovenKitProvider` with `TESTNET` preset and `defaultChainId="initiation-2"`

### TradeLogger Smart Contract (Initia MiniEVM)
- **Contract Address:** [`0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc`](https://scan.testnet.initia.xyz/address/0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc)
- **Network:** Initia MiniEVM Testnet (Chain ID: `17300`)
- **RPC:** `https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz`
- Every AI decision (symbol, action, price, PnL, confidence, RSI, reasoning) is permanently logged on-chain
- Frontend reads decisions directly from the contract using `viem` — no backend dependency for on-chain data
- Agent uses `web3.py` to submit transactions with thread-safe nonce management

### On-Chain Decision Schema
```solidity
struct Decision {
    uint64  id;
    address agent;
    string  symbol;      // "BTC", "ETH", etc.
    string  action;      // "LONG", "SHORT", "HOLD", "EXIT"
    uint64  price;       // mark price × 1e6
    uint64  pnlUsdc;     // |PnL| × 1e6
    bool    pnlIsNeg;    // true if PnL is negative
    uint8   confidence;  // 0–100
    uint64  rsi5m;       // RSI × 100
    uint64  rsi1h;       // RSI × 100
    string  reasoning;   // plain-English from Gemini
    bool    dryRun;      // true = paper trade
    uint64  timestamp;
}
```

---

## 🧠 AI Decision Pipeline

```
Market Data ──┐
              ├──▶ Gemini 2.5 Flash ──▶ LONG/SHORT/HOLD ──▶ Execute ──▶ Log to Initia
Sentiment ────┘       (confidence %)       (if conf > min)     │
                                                               ▼
                                                        Dashboard (SSE)
```

| Signal | Source | Bullish | Bearish |
|--------|--------|---------|---------|
| RSI-14 (1h) | Pacifica / Binance | < 35 (oversold) | > 65 (overbought) |
| RSI-14 (5m) | Pacifica / Binance | < 35 (oversold) | > 65 (overbought) |
| Funding Rate | Pacifica | Negative (shorts crowded) | Positive (longs crowded) |
| Basis Spread | Pacifica vs Binance | Discount | Premium |
| Sentiment | Elfa AI (Twitter/X) | Engagement > 0.3 | Engagement < 0.1 |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **On-Chain Audit Trail** | Every AI decision logged to Initia MiniEVM — tamper-proof, verifiable |
| **Dual AI Architecture** | Gemini 2.5 Flash primary + rule-based fallback engine |
| **Parallel Processing** | ThreadPoolExecutor runs BTC, ETH, SOL analysis concurrently |
| **Trailing Stop-Loss** | High-water mark tracking locks in profits dynamically |
| **Balance-Aware Sizing** | Caps at 90% of available collateral to prevent overextension |
| **Persistent State** | `positions.json` survives agent restarts — no lost trades |
| **Circuit Breaker** | Auto-fallback to Binance Klines when Pacifica API is down |
| **SSE Streaming** | Real-time log streaming from agent → dashboard |
| **AES-256 Encryption** | Private keys encrypted before MongoDB storage |
| **Dry Run Mode** | Full simulation with paper trading — no funds at risk |

---

## 📁 Project Structure

```
pacifica-pilot/
├── agent/                    # Python AI trading agent
│   ├── main.py               # Agent loop & orchestration
│   ├── strategy.py            # Gemini AI + fallback decision engine
│   ├── market.py              # Market data (RSI, funding, basis)
│   ├── sentiment.py           # Elfa AI social sentiment
│   ├── executor.py            # Order execution & position management
│   ├── initia_logger_evm.py   # On-chain logging to Initia MiniEVM
│   ├── logger.py              # Backend log push & SSE streaming
│   └── requirements.txt
│
├── backend/                  # Node.js Express API
│   ├── index.js               # Server entry point
│   ├── routes/                # auth, config, trades, agent, logs, portfolio
│   ├── models/                # MongoDB schemas (User, Config, Trade)
│   ├── middleware/             # Auth middleware
│   └── services/              # Business logic & encryption
│
├── contracts/                # Solidity smart contract
│   ├── trade_logger.sol       # Deployed TradeLogger contract (Initia MiniEVM)
│   ├── TradeLogger.sol        # Full version with extended read functions
│   ├── add_agent.js           # Script to authorize agent addresses
│   └── details.txt            # Deployed contract address
│
└── frontend/                 # React + Vite dashboard
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx    # Hero + features showcase
    │   │   ├── Dashboard.jsx      # Main trading dashboard
    │   │   ├── DocsPage.jsx       # Documentation page
    │   │   ├── LoginPage.jsx      # InterwovenKit wallet connect
    │   │   └── Onboarding.jsx     # First-time setup wizard
    │   ├── tabs/
    │   │   ├── PortfolioTab.jsx   # Portfolio overview & charts
    │   │   ├── ConfigTab.jsx      # Agent configuration panel
    │   │   ├── DecisionsTab.jsx   # On-chain decision ledger
    │   │   └── LogsTab.jsx        # Real-time agent logs (SSE)
    │   ├── hooks/
    │   │   └── useTradeLogger.js  # Initia contract read hook (viem)
    │   └── contracts/
    │       └── TradeLoggerABI.js   # ABI + chain config for Initia MiniEVM
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Python** 3.11+
- **MongoDB** (Atlas or local)
- **API Keys:** Gemini (Google AI Studio), Elfa AI, Pacifica testnet

### 1. Clone & Setup

```bash
git clone https://github.com/MayurK-cmd/pacifica-pilot-initia.git
cd pacifica-pilot-initia
```

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pacifica
ENCRYPTION_SECRET=<32_char_hex>
AGENT_API_SECRET=<secure_random_string>
```

```bash
npm start
# Runs on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

```bash
npm run dev
# Runs on http://localhost:5173
```

### 4. Agent

```bash
cd agent
pip install -r requirements.txt
pip install web3  # Required for Initia on-chain logging
```

Create `agent/.env`:
```env
# Backend connection
BACKEND_URL=http://localhost:3001
AGENT_API_SECRET=<same_as_backend>

# Pacifica DEX
PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1
PACIFICA_PRIVATE_KEY=<your_wallet_key>
PACIFICA_AGENT_PRIVATE_KEY=<agent_wallet_key>
PACIFICA_AGENT_API_KEY=<agent_api_key>

# AI & Sentiment
GEMINI_API_KEY=<from_Google_AI_Studio>
ELFA_API_KEY=<from_Elfa_AI>

# Initia MiniEVM (on-chain logging)
INITIA_RPC_URL=https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz
INITIA_CONTRACT_ADDRESS=0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc
INITIA_PRIVATE_KEY=<your_initia_evm_private_key>

# Trading
DRY_RUN=true
TRADE_SYMBOLS=BTC,ETH
LOOP_INTERVAL_SECONDS=300
```

```bash
python main.py
```

---

## 🔐 Security

| Layer | Implementation |
|-------|---------------|
| **Key Storage** | AES-256-CBC encryption for all private keys in MongoDB |
| **Agent Auth** | `x-agent-key` header authentication for agent ↔ backend |
| **Wallet Auth** | InterwovenKit wallet signature verification |
| **On-Chain** | Authorized agent addresses only — owner-controlled ACL on TradeLogger |
| **Nonce Safety** | Thread-locked nonce management prevents race conditions |

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19, Vite 8, Framer Motion, TailwindCSS 4 |
| Wallet | InterwovenKit (`@initia/interwovenkit-react`) |
| Backend | Node.js, Express 5, MongoDB (Mongoose) |
| AI Agent | Python 3.11+, Google Gemini 2.5 Flash |
| Sentiment | Elfa AI API (Twitter/X engagement scoring) |
| On-Chain | Solidity ^0.8.20, Initia MiniEVM Testnet |
| Contract I/O | `web3.py` (agent), `viem` (frontend) |
| DEX | Pacifica Perpetual Futures |

---

## 📊 Dashboard Screens

| Screen | Description |
|--------|-------------|
| **Landing Page** | Hero section with live ticker, system capabilities, and workflow overview |
| **Dashboard → Portfolio** | Real-time portfolio tracking, PnL charts, position overview |
| **Dashboard → Config** | Risk profile selector, symbol toggles, stop-loss/take-profit, agent enable/disable |
| **Dashboard → Decisions** | On-chain decision ledger — reads directly from Initia MiniEVM contract |
| **Dashboard → Logs** | Live SSE stream of agent reasoning and execution logs |
| **Docs** | Full documentation with architecture, deployment, signals, and FAQ |

---

## 📄 Smart Contract

The `TradeLogger` contract is deployed on **Initia MiniEVM Testnet**:

- **Address:** `0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc`
- **Explorer:** [View on Initia Scan](https://scan.testnet.initia.xyz/address/0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc)

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `logDecision(...)` | Authorized agents only | Log a new AI trading decision on-chain |
| `getDecision(id)` | Public (view) | Retrieve a specific decision by ID |
| `getRecentDecisions(count)` | Public (view) | Get the last N decisions (newest first) |
| `addAgent(address)` | Owner only | Authorize a new agent address |
| `removeAgent(address)` | Owner only | Revoke agent authorization |
| `totalDecisions()` | Public (view) | Total number of logged decisions |

---

## 🤝 Built For

**INITIATE: The Initia Hackathon (Season 1)** on [DoraHacks](https://dorahacks.io/hackathon/initiate/detail)

- **Tracks:** DeFi + AI & Tooling
- **Initia Features Used:**
  - ✅ InterwovenKit (`@initia/interwovenkit-react`) for wallet connection
  - ✅ Initia MiniEVM smart contract for on-chain audit trail
  - ✅ Initia Testnet deployment (`initiation-2`)

---

## 📜 License

MIT

---

<p align="center">
  <b>Built with ❤️ for the Initia ecosystem</b><br/>
  <sub>PacificaPilot — Where AI meets DeFi, verified on-chain.</sub>
</p>
