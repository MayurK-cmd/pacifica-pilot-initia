import { useState } from "react";
import { useWallet } from "./hooks/useWallet";
import Dashboard from "./pages/Dashboard";
import Config    from "./pages/Config";
import Portfolio from "./pages/Portfolio";
import ApiKeys   from "./pages/ApiKeys";

const NAV = ["Dashboard", "Portfolio", "API Keys", "Config"];

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const wallet = useWallet();

  if (!wallet.address) return <ConnectScreen wallet={wallet} />;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#e2e8f0", fontFamily:"monospace" }}>
      <nav style={{ borderBottom:"1px solid #1e293b", padding:"0 1.5rem", display:"flex", alignItems:"center", gap:"1.5rem", height:"52px" }}>
        <span style={{ fontWeight:700, color:"#38bdf8", fontSize:"15px", letterSpacing:"0.05em" }}>
          ◆ PACIFICA<span style={{ color:"#64748b" }}>PILOT</span>
        </span>
        <div style={{ display:"flex", gap:"0.25rem", flex:1 }}>
          {NAV.map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{ background: page===n ? "#1e293b":"transparent", border:"none", color: page===n ? "#38bdf8":"#64748b", padding:"0.3rem 0.9rem", borderRadius:"6px", cursor:"pointer", fontSize:"13px", fontFamily:"monospace" }}>
              {n}
            </button>
          ))}
        </div>
        <WalletBadge wallet={wallet} />
      </nav>
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"1.5rem 1rem" }}>
        {page === "Dashboard"  && <Dashboard  wallet={wallet} />}
        {page === "Portfolio"  && <Portfolio  wallet={wallet} />}
        {page === "API Keys"   && <ApiKeys   wallet={wallet} />}
        {page === "Config"     && <Config    wallet={wallet} />}
      </div>
    </div>
  );
}

function WalletBadge({ wallet }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
      <span style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
      <span style={{ fontSize:"12px", color:"#94a3b8" }}>{wallet.shortAddress}</span>
      <button onClick={wallet.disconnect}
        style={{ background:"transparent", border:"1px solid #1e293b", color:"#64748b", padding:"0.2rem 0.6rem", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontFamily:"monospace" }}>
        disconnect
      </button>
    </div>
  );
}

function ConnectScreen({ wallet }) {
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace" }}>
      <div style={{ textAlign:"center", maxWidth:"400px", padding:"2rem" }}>
        <div style={{ fontSize:"32px", fontWeight:700, color:"#38bdf8", marginBottom:"0.5rem", letterSpacing:"0.05em" }}>
          ◆ PACIFICAPILOT
        </div>
        <div style={{ fontSize:"14px", color:"#475569", marginBottom:"2.5rem", lineHeight:1.7 }}>
          Autonomous AI trading agent for Pacifica perps.<br/>Connect your wallet to get started.
        </div>
        {wallet.error && (
          <div style={{ color:"#ef4444", fontSize:"12px", marginBottom:"1rem", padding:"0.75rem", background:"#1a0a0a", borderRadius:"8px", border:"1px solid #7f1d1d" }}>
            {wallet.error}
          </div>
        )}
        {!wallet.isMetaMask ? (
          <div style={{ color:"#64748b", fontSize:"13px" }}>
            MetaMask not detected.{" "}
            <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{ color:"#38bdf8" }}>Install MetaMask</a>
          </div>
        ) : (
          <button onClick={wallet.connect} disabled={wallet.loading}
            style={{ width:"100%", padding:"0.85rem", background:"#1d4ed8", border:"none", borderRadius:"10px", color:"#fff", fontSize:"14px", fontFamily:"monospace", fontWeight:700, cursor: wallet.loading ? "not-allowed":"pointer", opacity: wallet.loading ? 0.7:1 }}>
            {wallet.loading ? "Connecting..." : "Connect MetaMask"}
          </button>
        )}
        <div style={{ fontSize:"11px", color:"#334155", marginTop:"1.5rem" }}>
          Wallet used for display only. The agent uses its own Pacifica key.
        </div>
      </div>
    </div>
  );
}