import { useState, useEffect } from "react";
import { getKeys, saveKeys, deleteKeys, verifyKeys } from "../lib/api";

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

function Input({ label, value, onChange, placeholder, type = "password", hint }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom:"1rem" }}>
      <Label>{label}</Label>
      <div style={{ display:"flex", gap:"0.5rem" }}>
        <input
          type={show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: "#0a0f1a",
            border: "1px solid #1e293b",
            borderRadius: "6px",
            padding: "0.6rem 0.8rem",
            color: "#e2e8f0",
            fontSize: "13px",
            fontFamily: "monospace",
          }}
        />
        <button
          onClick={() => setShow(!show)}
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "6px",
            padding: "0.5rem 0.75rem",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "monospace",
          }}
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
      {hint && <div style={{ fontSize:"11px", color:"#475569", marginTop:"4px" }}>{hint}</div>}
    </div>
  );
}

export default function ApiKeys({ wallet }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [keys, setKeys] = useState({
    pacificaApiKey: "",
    pacificaPrivateKey: "",
    geminiApiKey: "",
    elfaApiKey: "",
  });

  const [configured, setConfigured] = useState({
    pacificaApiKey: false,
    pacificaPrivateKey: false,
    geminiApiKey: false,
    elfaApiKey: false,
  });

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const data = await getKeys();
      setConfigured(data.configured);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const toSave = {};
      if (keys.pacificaApiKey) toSave.pacificaApiKey = keys.pacificaApiKey;
      if (keys.pacificaPrivateKey) toSave.pacificaPrivateKey = keys.pacificaPrivateKey;
      if (keys.geminiApiKey) toSave.geminiApiKey = keys.geminiApiKey;
      if (keys.elfaApiKey) toSave.elfaApiKey = keys.elfaApiKey;

      if (Object.keys(toSave).length === 0) {
        setError("Please enter at least one key");
        setSaving(false);
        return;
      }

      await saveKeys(toSave);
      setSuccess("Keys saved and encrypted successfully!");
      setKeys({ pacificaApiKey: "", pacificaPrivateKey: "", geminiApiKey: "", elfaApiKey: "" });
      loadKeys();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete all stored keys? This cannot be undone.")) return;

    setLoading(true);
    setError("");
    try {
      await deleteKeys();
      setConfigured({ pacificaApiKey: false, pacificaPrivateKey: false, geminiApiKey: false, elfaApiKey: false });
      setSuccess("All keys deleted");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerified(false);
    try {
      await verifyKeys();
      setVerified(true);
      setTimeout(() => setVerified(false), 3000);
    } catch (e) {
      setError("Verification failed: " + e.message);
    }
  };

  const isConfigured = Object.values(configured).some(v => v);

  return (
    <div style={{ maxWidth: "620px" }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.5rem" }}>
        API Keys Configuration
      </div>
      <div style={{ fontSize: "13px", color: "#475569", marginBottom: "1.5rem" }}>
        Your keys are encrypted with AES-256-GCM and stored securely. They are only used when running the agent in hosted mode.
      </div>

      {success && (
        <div style={{ padding: "0.75rem", background: "#14532d", border: "1px solid #166534", borderRadius: "8px", color: "#22c55e", fontSize: "13px", marginBottom: "1rem" }}>
          ✓ {success}
        </div>
      )}

      {error && (
        <div style={{ padding: "0.75rem", background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: "8px", color: "#ef4444", fontSize: "13px", marginBottom: "1rem" }}>
          ⚠ {error}
        </div>
      )}

      <Section title="Stored Keys Status">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
          {[
            { key: "pacificaApiKey", label: "Pacifica API Key" },
            { key: "pacificaPrivateKey", label: "Pacifica Private Key" },
            { key: "geminiApiKey", label: "Gemini API Key" },
            { key: "elfaApiKey", label: "Elfa API Key" },
          ].map(({ key, label }) => (
            <div
              key={key}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "6px",
                border: `1px solid ${configured[key] ? "#166534" : "#1e293b"}`,
                background: configured[key] ? "#14532d" : "#0a0f1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "12px", color: configured[key] ? "#22c55e" : "#475569" }}>{label}</span>
              {configured[key] ? (
                <span style={{ color: "#22c55e", fontSize: "14px" }}>✓</span>
              ) : (
                <span style={{ color: "#475569", fontSize: "14px" }}>—</span>
              )}
            </div>
          ))}
        </div>

        {isConfigured && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleVerify}
              style={{
                flex: 1,
                padding: "0.5rem 1rem",
                background: "#1e3a5f",
                border: "1px solid #38bdf8",
                borderRadius: "6px",
                color: "#38bdf8",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              {verified ? "✓ Verified" : "🔐 Verify Keys"}
            </button>
            <button
              onClick={handleDelete}
              style={{
                padding: "0.5rem 1rem",
                background: "#1a0a0a",
                border: "1px solid #7f1d1d",
                borderRadius: "6px",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              Delete All
            </button>
          </div>
        )}
      </Section>

      <Section title={isConfigured ? "Update Keys" : "Add Your Keys"}>
        <Input
          label="Pacifica API Key"
          value={keys.pacificaApiKey}
          onChange={(v) => setKeys({ ...keys, pacificaApiKey: v })}
          placeholder="774Sc2e5b6mcaEPW77Sz4SVPryeF3mt..."
          hint="Get from Pacifica dashboard"
        />
        <Input
          label="Pacifica Private Key (Solana wallet)"
          value={keys.pacificaPrivateKey}
          onChange={(v) => setKeys({ ...keys, pacificaPrivateKey: v })}
          placeholder="Base58 encoded private key..."
          hint="Used for signing orders on Pacifica"
        />
        <Input
          label="Gemini API Key"
          value={keys.geminiApiKey}
          onChange={(v) => setKeys({ ...keys, geminiApiKey: v })}
          placeholder="AIzaSy..."
          hint="For AI trading decisions (Google AI Studio)"
        />
        <Input
          label="Elfa API Key"
          value={keys.elfaApiKey}
          onChange={(v) => setKeys({ ...keys, elfaApiKey: v })}
          placeholder="elfak_..."
          hint="For social sentiment analysis (elfa.ai)"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: saving ? "#334155" : "#1d4ed8",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "14px",
            fontFamily: "monospace",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : isConfigured ? "Update Keys" : "Save Keys"}
        </button>

        <div style={{ fontSize: "11px", color: "#475569", marginTop: "0.75rem", textAlign: "center" }}>
          Keys are encrypted before storage. Only enter keys you want to use with hosted agent.
        </div>
      </Section>

      <Section title="Where to Get Keys">
        <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.8 }}>
          <div><strong style={{ color: "#38bdf8" }}>Pacifica:</strong> <a href="https://pacifica.fi" target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>Dashboard → API Keys</a></div>
          <div><strong style={{ color: "#38bdf8" }}>Gemini:</strong> <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>Google AI Studio</a></div>
          <div><strong style={{ color: "#38bdf8" }}>Elfa:</strong> <a href="https://elfa.ai/api" target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>Elfa AI Dashboard</a></div>
        </div>
      </Section>
    </div>
  );
}
