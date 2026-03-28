import { useState, useEffect, useCallback } from "react";
import { getTrades, getPnl, getStatus } from "../lib/api";

const AC = { LONG:"#22c55e", SHORT:"#ef4444", HOLD:"#64748b", EXIT:"#f59e0b" };
const AI = { LONG:"▲", SHORT:"▼", HOLD:"—", EXIT:"✕" };

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"10px", padding:"0.9rem 1.1rem", minWidth:"110px" }}>
      <div style={{ fontSize:"11px", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>{label}</div>
      <div style={{ fontSize:"20px", fontWeight:700, color: color||"#e2e8f0" }}>{value}</div>
      {sub && <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{sub}</div>}
    </div>
  );
}

function TradeRow({ t }) {
  const ts  = new Date(t.createdAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  const ac  = AC[t.action] || "#64748b";
  const pnl = t.pnl_usdc !== null && t.pnl_usdc !== undefined;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"65px 55px 65px 80px 60px 60px 70px 1fr", gap:"0.4rem", alignItems:"start", padding:"0.6rem 1rem", borderBottom:"1px solid #0f172a", fontSize:"12px" }}>
      <span style={{ color:"#475569" }}>{ts}</span>
      <span style={{ fontWeight:700, color:"#38bdf8" }}>{t.symbol}</span>
      <span style={{ color:ac, fontWeight:700 }}>{AI[t.action]} {t.action}</span>
      <span style={{ color:"#94a3b8" }}>${(t.mark_price||0).toLocaleString("en-US",{maximumFractionDigits:0})}</span>
      <span style={{ color:"#64748b" }}>5m {t.rsi_14?.toFixed(1)??"—"}</span>
      <span style={{ color:"#64748b" }}>1h {t.rsi_1h?.toFixed(1)??"—"}</span>
      <span style={{ color: pnl ? (t.pnl_usdc>=0?"#22c55e":"#ef4444") : "#334155" }}>
        {pnl ? `${t.pnl_usdc>=0?"+":""}$${t.pnl_usdc.toFixed(3)}` : "—"}
      </span>
      <span style={{ color:"#64748b", lineHeight:1.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.reasoning}</span>
    </div>
  );
}

export default function Dashboard({ wallet }) {
  const [trades,  setTrades]  = useState([]);
  const [pnl,     setPnl]     = useState(null);
  const [status,  setStatus]  = useState(null);
  const [symbol,  setSymbol]  = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, p, s] = await Promise.all([
        getTrades({ limit:150, ...(symbol ? { symbol } : {}) }),
        getPnl(symbol ? { symbol } : {}),
        getStatus(),
      ]);
      setTrades(t.trades || []);
      setPnl(p);
      setStatus(s);
    } catch (e) {
      console.error(e);
      // Ensure status is set to null on error so UI can reflect unknown state
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  // Determine agent state more robustly
  const isRunning =
    status?.running === true &&
    status?.lastCycleAt &&
    Date.now() - new Date(status.lastCycleAt).getTime() < 10 * 60 * 1000;

  const filterSymbols = ["", ...(wallet?.suggestedSymbols || []), "BTC","ETH","SOL","ARB"].filter((v,i,a) => a.indexOf(v)===i);

  return (
    <div>
      {/* Agent status bar */}
      <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
        {status === null ? (
          <div style={{ display:"flex", alignItems:"center", gap:"6px", background:"#0f172a", border:"1px solid #1e293b", borderRadius:"8px", padding:"0.4rem 0.9rem", fontSize:"12px" }}>
            <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#f59e0b", display:"inline-block" }} />
            <span style={{ color:"#f59e0b" }}>AGENT STATUS UNKNOWN</span>
          </div>
        ) : isRunning ? (
          <div style={{ display:"flex", alignItems:"center", gap:"6px", background:"#0f172a", border:"1px solid #1e293b", borderRadius:"8px", padding:"0.4rem 0.9rem", fontSize:"12px" }}>
            <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
            <span style={{ color:"#22c55e" }}>AGENT RUNNING</span>
            {status.lastCycleAt && <span style={{ color:"#475569", marginLeft:"4px" }}>· last {new Date(status.lastCycleAt).toLocaleTimeString("en-IN")}</span>}
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:"6px", background:"#0f172a", border:"1px solid #1e293b", borderRadius:"8px", padding:"0.4rem 0.9rem", fontSize:"12px" }}>
            <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#ef4444", display:"inline-block" }} />
            <span style={{ color:"#ef4444" }}>AGENT OFFLINE</span>
            {status.lastCycleAt && <span style={{ color:"#475569", marginLeft:"4px" }}>· last {new Date(status.lastCycleAt).toLocaleTimeString("en-IN")}</span>}
          </div>
        )}
        {status?.cyclesCompleted > 0 && <span style={{ fontSize:"12px", color:"#475569" }}>{status.cyclesCompleted} cycles</span>}
        <button onClick={load} style={{ marginLeft:"auto", background:"#1e293b", border:"none", color:"#94a3b8", padding:"0.3rem 0.75rem", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontFamily:"monospace" }}>↻ refresh</button>
      </div>

      {/* Stats */}
      {pnl && (
        <div style={{ display:"flex", gap:"0.65rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
          <Stat label="Trades"    value={pnl.total} />
          <Stat label="Longs"     value={pnl.longs}  color="#22c55e" />
          <Stat label="Shorts"    value={pnl.shorts} color="#ef4444" />
          <Stat label="Exits"     value={pnl.exits}  color="#f59e0b" />
          <Stat label="Total PnL" value={`${pnl.totalPnl>=0?"+":""}$${pnl.totalPnl}`} color={pnl.totalPnl>=0?"#22c55e":"#ef4444"} />
          <Stat label="Avg conf"  value={`${(pnl.avgConfidence*100).toFixed(0)}%`} color="#38bdf8" />
          <Stat label="24h trades" value={pnl.trades24h} sub="last 24h" />
        </div>
      )}

      {/* Filter */}
      <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1rem", alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:"12px", color:"#64748b" }}>Filter:</span>
        {filterSymbols.map(s => (
          <button key={s||"all"} onClick={() => setSymbol(s)}
            style={{ background: symbol===s ? "#1e3a5f":"#0f172a", border:`1px solid ${symbol===s?"#38bdf8":"#1e293b"}`, color: symbol===s ? "#38bdf8":"#64748b", padding:"0.2rem 0.65rem", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontFamily:"monospace" }}>
            {s||"ALL"}
          </button>
        ))}
      </div>

      {/* Trade feed */}
      <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"10px", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"65px 55px 65px 80px 60px 60px 70px 1fr", gap:"0.4rem", padding:"0.5rem 1rem", background:"#0a0f1a", fontSize:"10px", color:"#334155", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid #1e293b" }}>
          <span>Time</span><span>Sym</span><span>Action</span><span>Price</span><span>RSI 5m</span><span>RSI 1h</span><span>PnL</span><span>Reasoning</span>
        </div>
        {loading
          ? <div style={{ padding:"2rem", textAlign:"center", color:"#475569" }}>Loading...</div>
          : trades.length === 0
            ? <div style={{ padding:"2rem", textAlign:"center", color:"#475569" }}>No trades yet — start the agent.</div>
            : trades.map(t => <TradeRow key={t._id || t.timestamp} t={t} />)
        }
      </div>
    </div>
  );
}
