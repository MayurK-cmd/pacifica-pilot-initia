import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { TradeLoggerABI, TRADELOGGER_ADDRESS, INITIA_MINIEVM } from "../contracts/TradeLoggerABI";

// Initia MiniEVM testnet config
const publicClient = createPublicClient({
  chain: INITIA_MINIEVM,
  transport: http(),
});

export function useTradeLogger() {
  // Get total decisions
  const { data: totalDecisions, refetch: refetchTotal } = useQuery({
    queryKey: ["tradeLogger", "totalDecisions"],
    queryFn: async () => {
      const result = await publicClient.readContract({
        address: TRADELOGGER_ADDRESS,
        abi: TradeLoggerABI,
        functionName: "totalDecisions",
      });
      return BigInt(result);
    },
    enabled: true,
  });

  // Get owner
  const { data: owner } = useQuery({
    queryKey: ["tradeLogger", "owner"],
    queryFn: async () => {
      return await publicClient.readContract({
        address: TRADELOGGER_ADDRESS,
        abi: TradeLoggerABI,
        functionName: "owner",
      });
    },
    enabled: true,
  });

  // Get recent decisions
  const { data: recentDecisions, refetch: refetchDecisions, isLoading: loadingDecisions } = useQuery({
    queryKey: ["tradeLogger", "recentDecisions", totalDecisions?.toString()],
    queryFn: async () => {
      const count = totalDecisions > 50n ? 50n : totalDecisions;
      if (count === 0n) return [];

      const result = await publicClient.readContract({
        address: TRADELOGGER_ADDRESS,
        abi: TradeLoggerABI,
        functionName: "getRecentDecisions",
        args: [count],
      });
      return result;
    },
    enabled: true,
  });

  // Check if address is authorized agent
  const checkAuthorizedAgent = async (address) => {
    if (!address) return false;
    return await publicClient.readContract({
      address: TRADELOGGER_ADDRESS,
      abi: TradeLoggerABI,
      functionName: "authorizedAgents",
      args: [address],
    });
  };

  // Log decision (requires wallet client)
  const logDecision = async (walletClient, account, decision) => {
    const hash = await walletClient.writeContract({
      address: TRADELOGGER_ADDRESS,
      abi: TradeLoggerABI,
      functionName: "logDecision",
      args: [
        decision.symbol,
        decision.action,
        BigInt(decision.price),
        BigInt(Math.abs(decision.pnlUsdc || 0)),
        (decision.pnlUsdc || 0) < 0,  // pnlIsNeg
        decision.confidence,
        BigInt(decision.rsi5m || 0),
        BigInt(decision.rsi1h || 0),
        decision.reasoning,
        decision.dryRun,
        BigInt(Math.floor(Date.now() / 1000)),  // timestamp
      ],
      account,
    });
    return hash;
  };

  return {
    totalDecisions: totalDecisions?.toString() || "0",
    owner,
    recentDecisions: recentDecisions || [],
    loadingDecisions,
    checkAuthorizedAgent,
    logDecision,
    refetchDecisions,
    refetchTotal,
  };
}
