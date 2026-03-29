import { useState, useEffect } from "react";
import { getConfig, saveConfig, startAgent, stopAgent, getStatus } from "../lib/api";

const ALL_SYMBOLS = ["BTC","ETH","SOL","ARB","OP","DOGE","AVAX","LINK","SUI","APT"];
const RISK_LEVELS = [
  { value:"conservative", label:"Conservative", desc:"Trade only when confidence ≥ 80%" },
  { value:"balanced",     label:"Balanced",     desc:"Trade when confidence ≥ 65%" },
  { value:"aggressive",   label:"Aggressive",   desc:"Trade when confidence ≥ 55%" },
];
const INTERVALS = [
  { value:60,   label:"1 min" },
  { value:300,  label:"5 min" },
  { value:900,  label:"15 min" },
  { value:3600, label:"1 hour" },
];

function Label({ children }) {
  return <div style={{ fontSize:"11px", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"6px" }}>{children}</div>;
}
function Section({ title, children }) {
  return (
    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"10px", padding:"1.25rem", marginBottom:"1rem" }}>
      <div style={{ fontSize:"13px", fontWeight:600, color:"#94a3b8", marginBottom:"1rem", paddingBottom:"0.5rem", borderBottom:"1px solid #1e293b" }}>{title}</div>
      {children}
    </div>
  );
}

export default function Config({ wallet }) {
  const [cfg,    setCfg]    = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");
  const [applied, setApplied] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null);
  const [agentStarting, setAgentStarting] = useState(false);

  useEffect(() => {
    getConfig().then(setCfg).catch(e => setError(e.message));
    loadAgentStatus();
    const interval = setInterval(loadAgentStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAgentStatus = async () => {
    try {
      const status = await getStatus();
      setAgentStatus(status);
    } catch (e) {
      // Status endpoint may fail if agent not running - that's ok
    }
  };

  const update = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const toggleSym = (sym) => {
    const cur = cfg.symbols || [];
    if (cur.includes(sym)) {
      if (cur.length === 1) return;
      update("symbols", cur.filter(s => s !== sym));
    } else {
      update("symbols", [...cur, sym]);
    }
  };

  const applyWalletSymbols = () => {
    if (!wallet?.suggestedSymbols) return;
    update("symbols", wallet.suggestedSymbols);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await saveConfig({
        symbols: cfg.symbols, loopIntervalSeconds: cfg.loopIntervalSeconds,
        maxPositionUsdc: cfg.maxPositionUsdc, minConfidence: cfg.minConfidence,
        dryRun: cfg.dryRun, riskLevel: cfg.riskLevel, enabled: cfg.enabled,
        walletAddress: wallet?.address,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return <div style={{ color:"#475569", padding:"2rem" }}>Loading...</div>;

  return (
    <div style={{ maxWidth:"620px" }}>
      <div style={{ fontSize:"18px", fontWeight:700, color:"#e2e8f0", marginBottom:"1.25rem" }}>Agent Configuration</div>

      <Section title="Agent status">
        <Row label="Agent enabled" desc="Agent polls market and makes decisions when enabled">
          <Toggle value={cfg.enabled} onChange={v => update("enabled", v)} color="#22c55e" />
        </Row>
        <Row label="Dry run mode" desc="Simulate trades without real execution">
          <Toggle value={cfg.dryRun}  onChange={v => update("dryRun", v)}  color="#38bdf8" />
        </Row>

        {/* Agent Mode Selection */}
        <div style={{ marginTop: "1rem" }}>
          <Label>Agent Mode</Label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => update("agentMode", "local")}
              style={{
                flex: 1,
                padding: "0.6rem 1rem",
                background: cfg.agentMode === "local" ? "#1e3a5f" : "#0a0f1a",
                border: cfg.agentMode === "local" ? "1px solid #38bdf8" : "1px solid #1e293b",
                color: cfg.agentMode === "local" ? "#38bdf8" : "#475569",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "monospace",
                textAlign: "left",
              }}
            >
              🖥️ Run Locally
              {cfg.agentMode === "local" && <div style={{ fontSize: "10px", marginTop: "2px", color: "#38bdf8" }}>● Active</div>}
            </button>
            <button
              onClick={() => update("agentMode", "hosted")}
              style={{
                flex: 1,
                padding: "0.6rem 1rem",
                background: cfg.agentMode === "hosted" ? "#1e3a5f" : "#0a0f1a",
                border: cfg.agentMode === "hosted" ? "1px solid #38bdf8" : "1px solid #1e293b",
                color: cfg.agentMode === "hosted" ? "#38bdf8" : "#475569",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "monospace",
                textAlign: "left",
              }}
            >
              ☁️ Run on Server
              {cfg.agentMode === "hosted" && <div style={{ fontSize: "10px", marginTop: "2px", color: "#38bdf8" }}>● Active</div>}
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "#475569", marginTop: "0.5rem" }}>
            {cfg.agentMode === "local"
              ? "Python agent runs on your machine. Keys stored in local .env file."
              : "Agent runs on our servers. Keys encrypted and stored securely. Requires API keys configured."}
          </div>
        </div>

        {/* Hosted Agent Controls */}
        {cfg.agentMode === "hosted" && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#0a0f1a", borderRadius: "6px", border: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: agentStatus?.running ? "#22c55e" : "#ef4444",
                  display: "inline-block"
                }} />
                <span style={{ fontSize: "12px", color: agentStatus?.running ? "#22c55e" : "#ef4444", fontFamily: "monospace" }}>
                  {agentStatus?.running ? "AGENT RUNNING" : "AGENT STOPPED"}
                </span>
              </div>
              {agentStatus?.lastCycleAt && (
                <span style={{ fontSize: "11px", color: "#475569" }}>
                  Last cycle: {new Date(agentStatus.lastCycleAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {agentStatus?.running ? (
                <button
                  onClick={async () => {
                    setAgentStarting(true);
                    try { await stopAgent(); loadAgentStatus(); }
                    catch (e) { setError(e.message); }
                    finally { setAgentStarting(false); }
                  }}
                  disabled={agentStarting}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    background: "#7f1d1d",
                    border: "1px solid #ef4444",
                    borderRadius: "6px",
                    color: "#ef4444",
                    cursor: agentStarting ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  {agentStarting ? "Stopping..." : "⏹ Stop Agent"}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setAgentStarting(true);
                    try { await startAgent(); loadAgentStatus(); }
                    catch (e) { setError(e.message); }
                    finally { setAgentStarting(false); }
                  }}
                  disabled={agentStarting}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    background: "#14532d",
                    border: "1px solid #22c55e",
                    borderRadius: "6px",
                    color: "#22c55e",
                    cursor: agentStarting ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  {agentStarting ? "Starting..." : "▶ Start Agent"}
                </button>
              )}
            </div>
          </div>
        )}
      </Section>

      <Section title="Markets to watch">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.75rem" }}>
          <Label>Select symbols (max 10)</Label>
          {wallet?.suggestedSymbols && (
            <button onClick={applyWalletSymbols}
              style={{ background: applied ? "#14532d":"#1e293b", border:"none", color: applied ? "#22c55e":"#64748b", padding:"0.25rem 0.7rem", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontFamily:"monospace" }}>
              {applied ? "✓ Applied" : `Use wallet symbols (${wallet.suggestedSymbols.join(", ")})`}
            </button>
          )}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
          {ALL_SYMBOLS.map(sym => {
            const active = cfg.symbols?.includes(sym);
            const suggested = wallet?.suggestedSymbols?.includes(sym);
            return (
              <button key={sym} onClick={() => toggleSym(sym)}
                style={{ padding:"0.3rem 0.8rem", borderRadius:"6px", border:`1px solid ${active ? "#38bdf8" : suggested ? "#1e3a5f":"#1e293b"}`, background: active ? "#1e3a5f":"#0a0f1a", color: active ? "#38bdf8": suggested ? "#3b82f6":"#475569", cursor:"pointer", fontSize:"13px", fontFamily:"monospace", fontWeight: active ? 600:400, position:"relative" }}>
                {sym}
                {suggested && !active && <span style={{ fontSize:"8px", marginLeft:"3px", color:"#3b82f6" }}>●</span>}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize:"11px", color:"#475569", marginTop:"8px" }}>
          Selected: {cfg.symbols?.join(", ")}
          {wallet?.suggestedSymbols && <span style={{ color:"#3b82f6", marginLeft:"8px" }}>● = in your wallet</span>}
        </div>
      </Section>

      <Section title="Risk level">
        {RISK_LEVELS.map(r => (
          <button key={r.value} onClick={() => update("riskLevel", r.value)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"0.65rem 1rem", borderRadius:"8px", border:`1px solid ${cfg.riskLevel===r.value?"#38bdf8":"#1e293b"}`, background: cfg.riskLevel===r.value?"#1e3a5f":"#0a0f1a", cursor:"pointer", textAlign:"left", marginBottom:"0.4rem" }}>
            <div>
              <div style={{ fontSize:"13px", color: cfg.riskLevel===r.value?"#38bdf8":"#94a3b8", fontFamily:"monospace" }}>{r.label}</div>
              <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{r.desc}</div>
            </div>
            {cfg.riskLevel===r.value && <span style={{ color:"#38bdf8" }}>✓</span>}
          </button>
        ))}
      </Section>

      <Section title="Execution">
        <Label>Loop interval</Label>
        <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.25rem" }}>
          {INTERVALS.map(i => (
            <button key={i.value} onClick={() => update("loopIntervalSeconds", i.value)}
              style={{ padding:"0.3rem 0.8rem", borderRadius:"6px", border:`1px solid ${cfg.loopIntervalSeconds===i.value?"#38bdf8":"#1e293b"}`, background: cfg.loopIntervalSeconds===i.value?"#1e3a5f":"#0a0f1a", color: cfg.loopIntervalSeconds===i.value?"#38bdf8":"#475569", cursor:"pointer", fontSize:"13px", fontFamily:"monospace" }}>
              {i.label}
            </button>
          ))}
        </div>
        <Label>Max position size (USDC)</Label>
        <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
          <input type="range" min="5" max="500" step="5" value={cfg.maxPositionUsdc}
            onChange={e => update("maxPositionUsdc", +e.target.value)}
            style={{ flex:1, accentColor:"#38bdf8" }} />
          <span style={{ color:"#38bdf8", fontWeight:700, minWidth:"70px", fontSize:"14px" }}>${cfg.maxPositionUsdc}</span>
        </div>
      </Section>

      {error && <div style={{ color:"#ef4444", fontSize:"12px", marginBottom:"0.75rem" }}>⚠ {error}</div>}
      <button onClick={handleSave} disabled={saving}
        style={{ width:"100%", padding:"0.75rem", background: saved?"#166534":"#1d4ed8", border:"none", borderRadius:"8px", color:"#fff", fontSize:"14px", fontFamily:"monospace", fontWeight:700, cursor: saving?"not-allowed":"pointer", opacity: saving?0.7:1 }}>
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save configuration"}
      </button>
      <div style={{ fontSize:"11px", color:"#475569", marginTop:"6px", textAlign:"center" }}>
        Config picked up by agent on next cycle automatically.
      </div>
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
      <div>
        <div style={{ fontSize:"14px", color:"#e2e8f0" }}>{label}</div>
        {desc && <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, color }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ width:"44px", height:"24px", borderRadius:"12px", border:"none", background: value ? color:"#334155", cursor:"pointer", position:"relative", flexShrink:0 }}>
      <span style={{ position:"absolute", top:"3px", left: value?"22px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
    </button>
  );
}