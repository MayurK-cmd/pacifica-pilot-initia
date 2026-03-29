import { useState } from "react";
import { saveConfig, getConfig } from "../lib/api";

export default function Portfolio({ wallet }) {
  const { portfolio, loading, suggestedSymbols, shortAddress } = wallet;
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [msg,    setMsg]    = useState("");

  const applyToAgent = async (symbols) => {
    setSaving(true); setMsg("");
    try {
      await saveConfig({ symbols });
      setSaved(true); setMsg(`Agent updated to track: ${symbols.join(", ")}`);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const withBalance = portfolio.filter(p => p.hasBalance);
  const withoutBalance = portfolio.filter(p => !p.hasBalance);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div>
          <div style={{ fontSize:"18px", fontWeight:700, color:"#e2e8f0" }}>Portfolio</div>
          <div style={{ fontSize:"12px", color:"#475569", marginTop:"2px" }}>{shortAddress}</div>
        </div>
        <button onClick={() => applyToAgent(suggestedSymbols)} disabled={saving}
          style={{ background:"#1d4ed8", border:"none", color:"#fff", padding:"0.5rem 1.2rem", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontFamily:"monospace", fontWeight:700, opacity: saving ? 0.7:1 }}>
          {saved ? "✓ Applied" : saving ? "Saving..." : `Apply suggested symbols to agent`}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize:"12px", color: msg.startsWith("Error") ? "#ef4444":"#22c55e", marginBottom:"1rem", padding:"0.65rem 1rem", background:"#0f172a", borderRadius:"8px", border:`1px solid ${msg.startsWith("Error") ? "#7f1d1d":"#14532d"}` }}>
          {msg}
        </div>
      )}

      <div style={{ fontSize:"11px", color:"#475569", marginBottom:"1rem", padding:"0.6rem 1rem", background:"#0f172a", border:"1px solid #1e293b", borderRadius:"8px" }}>
        Suggested symbols based on wallet balance: <span style={{ color:"#38bdf8", fontWeight:700 }}>{suggestedSymbols.join(", ")}</span>
        {withBalance.length === 0 && " — no token balance detected, defaulting to BTC"}
      </div>

      {loading ? (
        <div style={{ color:"#475569", padding:"2rem", textAlign:"center" }}>Loading balances...</div>
      ) : (
        <div>
          {withBalance.length > 0 && (
            <>
              <div style={{ fontSize:"11px", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.5rem" }}>Tokens with balance</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:"0.75rem", marginBottom:"1.25rem" }}>
                {withBalance.map(p => <PortfolioCard key={p.symbol} p={p} highlight />)}
              </div>
            </>
          )}

          <div style={{ fontSize:"11px", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.5rem" }}>Available markets</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:"0.75rem" }}>
            {withoutBalance.map(p => <PortfolioCard key={p.symbol} p={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioCard({ p, highlight }) {
  return (
    <div style={{ background:"#0f172a", border:`1px solid ${highlight ? "#1e3a5f":"#1e293b"}`, borderRadius:"10px", padding:"1rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
        <span style={{ fontSize:"14px", fontWeight:700, color: highlight ? "#38bdf8":"#94a3b8" }}>{p.symbol}</span>
        {highlight && <span style={{ fontSize:"10px", padding:"1px 6px", background:"#1e3a5f", color:"#38bdf8", borderRadius:"20px", border:"0.5px solid #38bdf8" }}>has balance</span>}
      </div>
      <div style={{ fontSize:"18px", fontWeight:700, color:"#e2e8f0" }}>
        {p.balance > 0 ? p.balance.toFixed(4) : "—"}
      </div>
      {p.price > 0 && (
        <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>
          ${p.price.toLocaleString("en-US", { maximumFractionDigits: 2 })} per {p.symbol}
          {p.valueUsd > 0 && <span style={{ color:"#64748b" }}> · ${p.valueUsd.toFixed(2)} total</span>}
        </div>
      )}
    </div>
  );
}