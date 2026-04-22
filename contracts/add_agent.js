/**
 * add_agent.js — Authorizes an agent wallet on the TradeLogger contract.
 *
 * Usage:
 *   node add_agent.js <agent_address>
 *
 * The OWNER_PRIVATE_KEY env var must be the private key of the wallet that
 * deployed the TradeLogger contract (the contract owner).
 *
 * Example:
 *   set OWNER_PRIVATE_KEY=0xabc123...
 *   node add_agent.js 0x1234567890abcdef1234567890abcdef12345678
 */

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
};

const TRADELOGGER_ADDRESS = "0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc";

const ABI = [
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "addAgent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "authorizedAgents",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const agentAddress = process.argv[2];
  if (!agentAddress) {
    console.error("Usage: node add_agent.js <agent_evm_address>");
    console.error("\nTip: Run 'node get_agent_address.js' first to find your agent's EVM address.");
    process.exit(1);
  }

  const ownerPK = process.env.OWNER_PRIVATE_KEY;
  if (!ownerPK) {
    console.error("Error: OWNER_PRIVATE_KEY env var is required.");
    console.error("This must be the private key of the wallet that deployed the TradeLogger contract.");
    process.exit(1);
  }

  // Ensure 0x prefix
  const formattedPK = ownerPK.startsWith("0x") ? ownerPK : `0x${ownerPK}`;
  const account = privateKeyToAccount(formattedPK);

  const publicClient = createPublicClient({
    chain: INITIA_MINIEVM,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: INITIA_MINIEVM,
    transport: http(),
    account,
  });

  // Verify caller is the owner
  const contractOwner = await publicClient.readContract({
    address: TRADELOGGER_ADDRESS,
    abi: ABI,
    functionName: "owner",
  });
  console.log(`Contract owner:  ${contractOwner}`);
  console.log(`Your wallet:     ${account.address}`);

  if (contractOwner.toLowerCase() !== account.address.toLowerCase()) {
    console.error("\n❌ Your wallet is NOT the contract owner. Only the owner can add agents.");
    process.exit(1);
  }

  // Check if agent is already authorized
  const alreadyAuthorized = await publicClient.readContract({
    address: TRADELOGGER_ADDRESS,
    abi: ABI,
    functionName: "authorizedAgents",
    args: [agentAddress],
  });

  if (alreadyAuthorized) {
    console.log(`\n✅ Agent ${agentAddress} is already authorized. Nothing to do.`);
    return;
  }

  // Call addAgent
  console.log(`\n⛓️  Adding agent ${agentAddress} ...`);
  const hash = await walletClient.writeContract({
    address: TRADELOGGER_ADDRESS,
    abi: ABI,
    functionName: "addAgent",
    args: [agentAddress],
  });

  console.log(`   Tx hash: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   Status:  ${receipt.status}`);
  console.log(`\n✅ Agent ${agentAddress} is now authorized to log decisions on-chain!`);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
