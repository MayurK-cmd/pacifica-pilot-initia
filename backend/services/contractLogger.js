const { createPublicClient, createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

// Initia MiniEVM testnet config
const INITIA_MINIEVM = {
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

const TRADELOGGER_ADDRESS = "0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc";

// ABI matching the deployed trade_logger.sol on Initia MiniEVM
const TradeLoggerABI = [
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
    "inputs": [],
    "name": "totalDecisions",
    "outputs": [{ "internalType": "uint64", "name": "", "type": "uint64" }],
    "stateMutability": "view",
    "type": "function"
  }
];

class ContractLogger {
  constructor(privateKey) {
    if (!privateKey) {
      console.log("[ContractLogger] No private key provided - running in read-only mode");
      this.enabled = false;
      return;
    }

    this.enabled = true;
    // Ensure 0x prefix
    const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    this.account = privateKeyToAccount(formattedKey);

    this.publicClient = createPublicClient({
      chain: INITIA_MINIEVM,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      chain: INITIA_MINIEVM,
      transport: http(),
      account: this.account,
    });

    console.log("[ContractLogger] Initialized with account:", this.account.address);
  }

  async logDecision(trade) {
    if (!this.enabled) {
      console.log("[ContractLogger] Disabled - skipping");
      return null;
    }

    try {
      // Only log actual trading decisions (LONG, SHORT, EXIT), not HOLD
      if (!["LONG", "SHORT", "EXIT"].includes(trade.action?.toUpperCase())) {
        console.log("[ContractLogger] Skipping HOLD action");
        return null;
      }

      // Convert values to deployed contract format (uint64)
      const priceU64 = BigInt(Math.round((trade.mark_price || 0) * 1e6));
      const pnlAbsU64 = BigInt(Math.round(Math.abs(trade.pnl_usdc || 0) * 1e6));
      const pnlIsNeg = (trade.pnl_usdc || 0) < 0;
      const confidence = Math.min(100, Math.max(0, Math.round((trade.confidence || 0) * 100)));
      const rsi5m = BigInt(trade.rsi_14 ? Math.round(trade.rsi_14 * 100) : 0);
      const rsi1h = BigInt(trade.rsi_1h ? Math.round(trade.rsi_1h * 100) : 0);
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      console.log("[ContractLogger] Logging decision:", {
        symbol: trade.symbol,
        action: trade.action,
        price: priceU64.toString(),
        pnlUsdc: pnlAbsU64.toString(),
        pnlIsNeg,
        confidence,
        rsi5m: rsi5m.toString(),
        rsi1h: rsi1h.toString(),
        dryRun: trade.dry_run,
        timestamp: timestamp.toString(),
      });

      const hash = await this.walletClient.writeContract({
        address: TRADELOGGER_ADDRESS,
        abi: TradeLoggerABI,
        functionName: "logDecision",
        args: [
          trade.symbol,
          trade.action.toUpperCase(),
          priceU64,
          pnlAbsU64,
          pnlIsNeg,
          confidence,
          rsi5m,
          rsi1h,
          trade.reasoning || "",
          trade.dry_run !== false, // Default to true
          timestamp,
        ],
      });

      console.log("[ContractLogger] Transaction sent:", hash);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      console.log("[ContractLogger] Transaction confirmed:", receipt.transactionHash);

      return receipt;
    } catch (error) {
      console.error("[ContractLogger] Error:", error.message);
      // Don't throw - contract logging is best effort
      return null;
    }
  }

  async getTotalDecisions() {
    if (!this.enabled) return "0";
    try {
      const result = await this.publicClient.readContract({
        address: TRADELOGGER_ADDRESS,
        abi: TradeLoggerABI,
        functionName: "totalDecisions",
      });
      return result.toString();
    } catch (error) {
      console.error("[ContractLogger] Error getting total:", error.message);
      return "0";
    }
  }
}

// Create singleton instance
const contractLogger = new ContractLogger(process.env.CONTRACT_PRIVATE_KEY);

module.exports = { contractLogger, ContractLogger };

