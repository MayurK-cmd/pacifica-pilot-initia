const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getWalletAddress = () => {
  if (typeof window === 'undefined') return "";
  return localStorage.getItem('walletAddress') || "";
};

const agentKey = () => import.meta.env.VITE_AGENT_KEY || "";

const _headers = (includeWallet = true) => {
  const h = { "Content-Type": "application/json" };
  const key = agentKey();
  if (key) h["x-agent-key"] = key;
  if (includeWallet) {
    const wallet = getWalletAddress();
    if (wallet) h["x-wallet-address"] = wallet;
  }
  return h;
};

const _fetch = async (url, opts = {}) => {
  const r = await fetch(url, {
    ...opts,
    headers: { ..._headers(opts.includeWallet !== false), ...(opts.headers || {}) }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

// Trades
export const getTrades  = (p) => _fetch(`${BASE}/api/trades?${new URLSearchParams(p)}`);
export const getPnl     = (p) => _fetch(`${BASE}/api/trades/pnl${p?.symbol ? `?symbol=${p.symbol}` : ""}`);
export const getLatest  = () => _fetch(`${BASE}/api/trades/latest`);

// Config
export const getConfig  = () => _fetch(`${BASE}/api/config`);
export const saveConfig = (body) => _fetch(`${BASE}/api/config`, {
  method: "POST",
  body: JSON.stringify(body),
});

// Agent status
export const getStatus  = () => _fetch(`${BASE}/api/agent/status`);
export const startAgent = () => _fetch(`${BASE}/api/agent/start`, { method: "POST" });
export const stopAgent  = () => _fetch(`${BASE}/api/agent/stop`, { method: "POST" });

// API Keys management
export const getKeys    = () => _fetch(`${BASE}/api/keys`);
export const saveKeys   = (body) => _fetch(`${BASE}/api/keys`, { method: "POST", body: JSON.stringify(body) });
export const deleteKeys = () => _fetch(`${BASE}/api/keys`, { method: "DELETE" });
export const verifyKeys = () => _fetch(`${BASE}/api/keys/verify`, { method: "POST" });