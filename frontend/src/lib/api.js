const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = {
  get: async (path, params = {}) => {
    const url = new URL(`${BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  post: async (path, body = {}) => {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

export const getTrades   = (params) => api.get("/api/trades", params);
export const getPnl      = (params) => api.get("/api/trades/pnl", params);
export const getLatest   = (symbols) => api.get("/api/trades/latest", symbols ? { symbols } : {});
export const getConfig   = ()        => api.get("/api/config");
export const saveConfig  = (body)    => api.post("/api/config", body);
export const getStatus   = ()        => api.get("/api/agent/status");