import { useState, useEffect, useCallback } from "react";

const SUPPORTED_SYMBOLS = ["BTC","ETH","SOL","ARB","OP","DOGE","AVAX","LINK","SUI","APT"];
const COINGECKO_IDS = {
  BTC:"bitcoin",ETH:"ethereum",SOL:"solana",ARB:"arbitrum",
  OP:"optimism",DOGE:"dogecoin",AVAX:"avalanche-2",LINK:"chainlink",SUI:"sui",APT:"aptos",
};

export function useWallet() {
  const [address,   setAddress]   = useState(null);
  const [chainId,   setChainId]   = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const isMetaMask = typeof window !== "undefined" && !!window.ethereum;

  const fetchPortfolio = useCallback(async (addr) => {
    if (!addr) return;
    setLoading(true);
    try {
      const ethBalHex = await window.ethereum.request({ method: "eth_getBalance", params: [addr, "latest"] });
      const ethBal    = parseInt(ethBalHex, 16) / 1e18;

      let prices = {};
      try {
        const ids = Object.values(COINGECKO_IDS).join(",");
        const r   = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        prices    = await r.json();
      } catch { /* price fetch optional */ }

      const items = SUPPORTED_SYMBOLS.map((sym) => {
        const price    = prices[COINGECKO_IDS[sym]]?.usd || 0;
        const balance  = sym === "ETH" ? ethBal : 0;
        return { symbol: sym, balance, valueUsd: balance * price, price, hasBalance: balance > 0.001 };
      });
      setPortfolio(items);
    } catch (e) {
      console.error("Portfolio fetch:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isMetaMask) { setError("MetaMask not detected. Please install it."); return null; }
    setError(""); setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chain    = await window.ethereum.request({ method: "eth_chainId" });
      const addr = accounts[0];
      setAddress(addr);
      setChainId(parseInt(chain, 16));
      localStorage.setItem('walletAddress', addr);
      await fetchPortfolio(addr);
      return addr;
    } catch (e) {
      setError(e.message || "Connection rejected");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isMetaMask, fetchPortfolio]);

  const disconnect = useCallback(() => {
    setAddress(null); setChainId(null); setPortfolio([]);
    localStorage.removeItem('walletAddress');
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAcc   = (a) => a.length === 0 ? disconnect() : (setAddress(a[0]), fetchPortfolio(a[0]));
    const onChain = (c) => setChainId(parseInt(c, 16));
    window.ethereum.on("accountsChanged", onAcc);
    window.ethereum.on("chainChanged", onChain);
    return () => { window.ethereum.removeListener("accountsChanged", onAcc); window.ethereum.removeListener("chainChanged", onChain); };
  }, [disconnect, fetchPortfolio]);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((a) => {
      if (a.length > 0) {
        setAddress(a[0]);
        window.ethereum.request({ method: "eth_chainId" }).then((c) => setChainId(parseInt(c, 16)));
        fetchPortfolio(a[0]);
      }
    });
  }, [fetchPortfolio]);

  const defaultSymbols = portfolio.filter(p => p.hasBalance).map(p => p.symbol);
  const suggestedSymbols = defaultSymbols.length > 0 ? defaultSymbols : ["BTC"];

  return {
    address, chainId, portfolio, loading, error, isMetaMask,
    connect, disconnect, suggestedSymbols,
    shortAddress: address ? `${address.slice(0,6)}...${address.slice(-4)}` : null,
  };
}