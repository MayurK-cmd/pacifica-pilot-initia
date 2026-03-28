import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Config from "./pages/Config";

const NAV = ["Dashboard", "Config"];

export default function App() {
  const [page, setPage] = useState("Dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e2e8f0", fontFamily: "monospace" }}>
      {/* Navbar */}
      <nav style={{ borderBottom: "1px solid #1e293b", padding: "0 1.5rem", display: "flex", alignItems: "center", gap: "2rem", height: "52px" }}>
        <span style={{ fontWeight: 700, color: "#38bdf8", fontSize: "15px", letterSpacing: "0.05em" }}>
          ◆ PACIFICA<span style={{ color: "#64748b" }}>PILOT</span>
        </span>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {NAV.map((n) => (
            <button key={n} onClick={() => setPage(n)}
              style={{ background: page === n ? "#1e293b" : "transparent", border: "none", color: page === n ? "#38bdf8" : "#64748b", padding: "0.3rem 0.9rem", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontFamily: "monospace" }}>
              {n}
            </button>
          ))}
        </div>
      </nav>

      {/* Page */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        {page === "Dashboard" && <Dashboard />}
        {page === "Config"    && <Config />}
      </div>
    </div>
  );
}