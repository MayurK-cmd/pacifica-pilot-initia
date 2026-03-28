import { useState, useEffect, useCallback } from "react";
import { getTrades, getPnl, getStatus } from "../lib/api";

const ACTION_COLOR = { LONG: "#22c55e", SHORT: "#ef4444", HOLD: "#64748b" };
const ACTION_ICON  = { LONG: "▲", SHORT: "▼", HOLD: "—" };

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "1rem 1.25rem", minWidth: "120px" }}>
      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color || "#e2e8f0" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function TradeRow({ trade }) {
  const ts = new Date(trade.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const ac = ACTION_COLOR[trade.action] || "#64748b";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 60px 60px 80px 70px 60px 1fr", gap: "0.5rem", alignItems: "start", padding: "0.65rem 1rem", borderBottom: "1px solid #0f172a", fontSize: "12px" }}>
      <span style={{ color: "#475569" }}>{ts}</span>
      <span style={{ fontWeight: 700, color: "#38bdf8" }}>{trade.symbol}</span>
      <span style={{ color: ac, fontWeight: 700 }}>{ACTION_ICON[trade.action]} {trade.action}</span>
      <span style={{ color: "#94a3b8" }}>${trade.mark_price?.toLocaleString("en-US", { maximumFractionDigits: 2 }) || "—"}</span>
      <span style={{ color: "#94a3b8" }}>RSI {trade.rsi_14?.toFixed(1) ?? "—"}</span>
      <span style={{ color: trade.sentiment_score > 0 ? "#22c55e" : trade.sentiment_score < 0 ? "#ef4444" : "#64748b" }}>
        {trade.sentiment_score !== null ? (trade.sentiment_score > 0 ? "+" : "") + trade.sentiment_score?.toFixed(2) : "—"}
      </span>
      <span style={{ color: "#64748b", lineHeight: 1.5 }}>{trade.reasoning}</span>
    </div>
  );
}

export default function Dashboard() {
  const [trades, setTrades]   = useState([]);
  const [pnl, setPnl]         = useState(null);
  const [status, setStatus]   = useState(null);
  const [symbol, setSymbol]   = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, p, s] = await Promise.all([
        getTrades({ limit: 100, ...(symbol ? { symbol } : {}) }),
        getPnl(symbol ? { symbol } : {}),
        getStatus(),
      ]);
      setTrades(t.trades || []);
      setPnl(p);
      setStatus(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { load(); }, [load]);
  // Auto-refresh every 30s
  useEffect(() => { const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  const alive = status?.running && status?.lastCycleAt
    ? (Date.now() - new Date(status.lastCycleAt).getTime()) < 10 * 60 * 1000
    : false;

  return (
    <div>
      {/* Agent status bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "0.4rem 0.9rem", fontSize: "12px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: alive ? "#22c55e" : "#ef4444", display: "inline-block" }} />
          <span style={{ color: alive ? "#22c55e" : "#ef4444" }}>{alive ? "AGENT RUNNING" : "AGENT OFFLINE"}</span>
          {status?.lastCycleAt && (
            <span style={{ color: "#475569", marginLeft: "4px" }}>
              · last cycle {new Date(status.lastCycleAt).toLocaleTimeString("en-IN")}
            </span>
          )}
        </div>
        {status?.cyclesCompleted > 0 && (
          <span style={{ fontSize: "12px", color: "#475569" }}>{status.cyclesCompleted} cycles completed</span>
        )}
        <button onClick={load} style={{ marginLeft: "auto", background: "#1e293b", border: "none", color: "#94a3b8", padding: "0.35rem 0.8rem", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace" }}>
          ↻ refresh
        </button>
      </div>

      {/* Stats row */}
      {pnl && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <StatCard label="Total Trades" value={pnl.total} />
          <StatCard label="Longs" value={pnl.longs} color="#22c55e" />
          <StatCard label="Shorts" value={pnl.shorts} color="#ef4444" />
          <StatCard label="Holds" value={pnl.holds} color="#64748b" />
          <StatCard label="Avg Confidence" value={`${(pnl.avgConfidence * 100).toFixed(0)}%`} color="#38bdf8" />
          <StatCard label="24h Trades" value={pnl.trades24h} sub="last 24 hours" />
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#64748b" }}>Filter:</span>
        {["", "BTC", "ETH", "SOL"].map((s) => (
          <button key={s} onClick={() => setSymbol(s)}
            style={{ background: symbol === s ? "#1e3a5f" : "#0f172a", border: `1px solid ${symbol === s ? "#38bdf8" : "#1e293b"}`, color: symbol === s ? "#38bdf8" : "#64748b", padding: "0.25rem 0.7rem", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace" }}>
            {s || "ALL"}
          </button>
        ))}
      </div>

      {/* Trade feed */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "70px 60px 60px 80px 70px 60px 1fr", gap: "0.5rem", padding: "0.5rem 1rem", background: "#0a0f1a", fontSize: "10px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #1e293b" }}>
          <span>Time</span><span>Symbol</span><span>Action</span><span>Price</span><span>RSI</span><span>Senti</span><span>Reasoning</span>
        </div>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#475569" }}>Loading...</div>
        ) : trades.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#475569" }}>No trades yet — start the agent to see decisions here.</div>
        ) : (
          trades.map((t) => <TradeRow key={t._id} trade={t} />)
        )}
      </div>
    </div>
  );
}