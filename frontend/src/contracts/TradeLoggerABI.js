export const TradeLoggerABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalDecisions",
    "outputs": [{ "internalType": "uint64", "name": "", "type": "uint64" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "authorizedAgents",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint64", "name": "id", "type": "uint64" }],
    "name": "getDecision",
    "outputs": [{
      "components": [
        { "internalType": "uint64",  "name": "id",         "type": "uint64" },
        { "internalType": "address", "name": "agent",      "type": "address" },
        { "internalType": "string",  "name": "symbol",     "type": "string" },
        { "internalType": "string",  "name": "action",     "type": "string" },
        { "internalType": "uint64",  "name": "price",      "type": "uint64" },
        { "internalType": "uint64",  "name": "pnlUsdc",    "type": "uint64" },
        { "internalType": "bool",    "name": "pnlIsNeg",   "type": "bool" },
        { "internalType": "uint8",   "name": "confidence",  "type": "uint8" },
        { "internalType": "uint64",  "name": "rsi5m",      "type": "uint64" },
        { "internalType": "uint64",  "name": "rsi1h",      "type": "uint64" },
        { "internalType": "string",  "name": "reasoning",  "type": "string" },
        { "internalType": "bool",    "name": "dryRun",     "type": "bool" },
        { "internalType": "uint64",  "name": "timestamp",  "type": "uint64" }
      ],
      "internalType": "struct TradeLogger.Decision",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint64", "name": "count", "type": "uint64" }],
    "name": "getRecentDecisions",
    "outputs": [{
      "components": [
        { "internalType": "uint64",  "name": "id",         "type": "uint64" },
        { "internalType": "address", "name": "agent",      "type": "address" },
        { "internalType": "string",  "name": "symbol",     "type": "string" },
        { "internalType": "string",  "name": "action",     "type": "string" },
        { "internalType": "uint64",  "name": "price",      "type": "uint64" },
        { "internalType": "uint64",  "name": "pnlUsdc",    "type": "uint64" },
        { "internalType": "bool",    "name": "pnlIsNeg",   "type": "bool" },
        { "internalType": "uint8",   "name": "confidence",  "type": "uint8" },
        { "internalType": "uint64",  "name": "rsi5m",      "type": "uint64" },
        { "internalType": "uint64",  "name": "rsi1h",      "type": "uint64" },
        { "internalType": "string",  "name": "reasoning",  "type": "string" },
        { "internalType": "bool",    "name": "dryRun",     "type": "bool" },
        { "internalType": "uint64",  "name": "timestamp",  "type": "uint64" }
      ],
      "internalType": "struct TradeLogger.Decision[]",
      "name": "",
      "type": "tuple[]"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string",  "name": "symbol",     "type": "string" },
      { "internalType": "string",  "name": "action",     "type": "string" },
      { "internalType": "uint64",  "name": "price",      "type": "uint64" },
      { "internalType": "uint64",  "name": "pnlUsdc",    "type": "uint64" },
      { "internalType": "bool",    "name": "pnlIsNeg",   "type": "bool" },
      { "internalType": "uint8",   "name": "confidence",  "type": "uint8" },
      { "internalType": "uint64",  "name": "rsi5m",      "type": "uint64" },
      { "internalType": "uint64",  "name": "rsi1h",      "type": "uint64" },
      { "internalType": "string",  "name": "reasoning",  "type": "string" },
      { "internalType": "bool",    "name": "dryRun",     "type": "bool" },
      { "internalType": "uint64",  "name": "timestamp",  "type": "uint64" }
    ],
    "name": "logDecision",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "agent", "type": "address" }
    ],
    "name": "addAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "agent", "type": "address" }
    ],
    "name": "removeAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint64",  "name": "id",         "type": "uint64" },
      { "indexed": true,  "internalType": "address", "name": "agent",      "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "symbol",     "type": "string" },
      { "indexed": false, "internalType": "string",  "name": "action",     "type": "string" },
      { "indexed": false, "internalType": "uint64",  "name": "price",      "type": "uint64" },
      { "indexed": false, "internalType": "uint64",  "name": "pnlUsdc",    "type": "uint64" },
      { "indexed": false, "internalType": "bool",    "name": "pnlIsNeg",   "type": "bool" },
      { "indexed": false, "internalType": "uint8",   "name": "confidence",  "type": "uint8" },
      { "indexed": false, "internalType": "uint64",  "name": "rsi5m",      "type": "uint64" },
      { "indexed": false, "internalType": "uint64",  "name": "rsi1h",      "type": "uint64" },
      { "indexed": false, "internalType": "string",  "name": "reasoning",  "type": "string" },
      { "indexed": false, "internalType": "bool",    "name": "dryRun",     "type": "bool" },
      { "indexed": false, "internalType": "uint64",  "name": "timestamp",  "type": "uint64" }
    ],
    "name": "DecisionLogged",
    "type": "event"
  }
];

export const TRADELOGGER_ADDRESS = "0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc";

// Initia MiniEVM testnet config
export const INITIA_MINIEVM = {
  id: 17300,
  name: "Initia MiniEVM Testnet",
  nativeCurrency: { name: "INIT", symbol: "INIT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://jsonrpc-evm-1.anvil.asia-southeast.initia.xyz"] },
  },
  blockExplorers: {
    default: { url: "https://scan.minievm.initia.xyz" },
  },
};

