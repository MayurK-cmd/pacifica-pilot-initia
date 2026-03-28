import { useState, useEffect } from "react";
import { getConfig, saveConfig } from "../lib/api";

const PACIFICA_SYMBOLS = ["BTC", "ETH", "SOL", "ARB", "OP", "DOGE", "AVAX", "LINK", "SUI", "APT"];
const RISK_LEVELS = [
  { value: "conservative", label: "Conservative", desc: "Trade only when confidence ≥ 80%" },
  { value: "balanced",     label: "Balanced",     desc: "Trade when confidence ≥ 65%" },
  { value: "aggressive",   label: "Aggressive",   desc: "Trade when confidence ≥ 55%" },
];
const INTERVALS = [
  { value: 60,   label: "1 min" },
  { value: 300,  label: "5 min" },
  { value: 900,  label: "15 min" },
  { value: 3600, label: "1 hour" },
];

function Label({ children }) {
  return <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>{children}</div>;
}

function Section({ title, children }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", padding: "1.25rem", marginBottom: "1rem" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #1e293b" }}>{title}</div>
      {children}
    </div>
  );
}

export default function Config() {
  const [cfg, setCfg]         = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    getConfig().then(setCfg).catch((e) => setError(e.message));
  }, []);

  const update = (key, val) => setCfg((c) => ({ ...c, [key]: val }));

  const toggleSymbol = (sym) => {
    const current = cfg.symbols || [];
    if (current.includes(sym)) {
      if (current.length === 1) return; // keep at least 1
      update("symbols", current.filter((s) => s !== sym));
    } else {
      update("symbols", [...current, sym]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveConfig({
        symbols:              cfg.symbols,
        loopIntervalSeconds:  cfg.loopIntervalSeconds,
        maxPositionUsdc:      cfg.maxPositionUsdc,
        minConfidence:        cfg.minConfidence,
        dryRun:               cfg.dryRun,
        riskLevel:            cfg.riskLevel,
        enabled:              cfg.enabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return <div style={{ color: "#475569", padding: "2rem" }}>Loading config...</div>;

  return (
    <div style={{ maxWidth: "620px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0", marginBottom: "1.25rem" }}>Agent Configuration</div>

      {/* Agent toggle */}
      <Section title="Agent Status">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "14px", color: "#e2e8f0" }}>Agent enabled</div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>Agent polls market and makes decisions when enabled</div>
          </div>
          <button onClick={() => update("enabled", !cfg.enabled)}
            style={{ width: "44px", height: "24px", borderRadius: "12px", border: "none", background: cfg.enabled ? "#22c55e" : "#334155", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <span style={{ position: "absolute", top: "3px", left: cfg.enabled ? "22px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
          <div>
            <div style={{ fontSize: "14px", color: "#e2e8f0" }}>Dry run mode</div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>Simulate trades without real execution</div>
          </div>
          <button onClick={() => update("dryRun", !cfg.dryRun)}
            style={{ width: "44px", height: "24px", borderRadius: "12px", border: "none", background: cfg.dryRun ? "#38bdf8" : "#ef4444", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <span style={{ position: "absolute", top: "3px", left: cfg.dryRun ? "22px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
        </div>
      </Section>

      {/* Symbols */}
      <Section title="Markets to Watch">
        <Label>Select symbols (max 10)</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {PACIFICA_SYMBOLS.map((sym) => {
            const active = cfg.symbols?.includes(sym);
            return (
              <button key={sym} onClick={() => toggleSymbol(sym)}
                style={{ padding: "0.3rem 0.8rem", borderRadius: "6px", border: `1px solid ${active ? "#38bdf8" : "#1e293b"}`, background: active ? "#1e3a5f" : "#0a0f1a", color: active ? "#38bdf8" : "#475569", cursor: "pointer", fontSize: "13px", fontFamily: "monospace", fontWeight: active ? 600 : 400 }}>
                {sym}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: "11px", color: "#475569", marginTop: "8px" }}>
          Selected: {cfg.symbols?.join(", ")}
        </div>
      </Section>

      {/* Risk */}
      <Section title="Risk Level">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {RISK_LEVELS.map((r) => (
            <button key={r.value} onClick={() => update("riskLevel", r.value)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1rem", borderRadius: "8px", border: `1px solid ${cfg.riskLevel === r.value ? "#38bdf8" : "#1e293b"}`, background: cfg.riskLevel === r.value ? "#1e3a5f" : "#0a0f1a", cursor: "pointer", textAlign: "left" }}>
              <div>
                <div style={{ fontSize: "13px", color: cfg.riskLevel === r.value ? "#38bdf8" : "#94a3b8", fontFamily: "monospace" }}>{r.label}</div>
                <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{r.desc}</div>
              </div>
              {cfg.riskLevel === r.value && <span style={{ color: "#38bdf8", fontSize: "16px" }}>✓</span>}
            </button>
          ))}
        </div>
      </Section>

      {/* Interval + Position size */}
      <Section title="Execution">
        <Label>Loop interval</Label>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {INTERVALS.map((i) => (
            <button key={i.value} onClick={() => update("loopIntervalSeconds", i.value)}
              style={{ padding: "0.3rem 0.8rem", borderRadius: "6px", border: `1px solid ${cfg.loopIntervalSeconds === i.value ? "#38bdf8" : "#1e293b"}`, background: cfg.loopIntervalSeconds === i.value ? "#1e3a5f" : "#0a0f1a", color: cfg.loopIntervalSeconds === i.value ? "#38bdf8" : "#475569", cursor: "pointer", fontSize: "13px", fontFamily: "monospace" }}>
              {i.label}
            </button>
          ))}
        </div>

        <Label>Max position size (USDC)</Label>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <input type="range" min="5" max="500" step="5" value={cfg.maxPositionUsdc}
            onChange={(e) => update("maxPositionUsdc", parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: "#38bdf8" }} />
          <span style={{ color: "#38bdf8", fontWeight: 700, minWidth: "70px", fontSize: "14px" }}>
            ${cfg.maxPositionUsdc}
          </span>
        </div>
      </Section>

      {/* Save */}
      {error && <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "0.75rem" }}>⚠ {error}</div>}
      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", padding: "0.75rem", background: saved ? "#166534" : "#1d4ed8", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontFamily: "monospace", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "background 0.3s" }}>
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save Configuration"}
      </button>
      <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px", textAlign: "center" }}>
        Config is picked up by the agent on its next cycle automatically.
      </div>
    </div>
  );
}