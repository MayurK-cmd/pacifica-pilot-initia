import { useState, useEffect } from "react";
import { useApi } from "../useApi";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_DEV_API = "https://www.logo.dev/api";
const getIcon = (sym) => `${LOGO_DEV_API}?symbol=${sym.toUpperCase()}&size=64`;

export default function PortfolioTab() {
  const api = useApi();
  const [portfolio, setPortfolio] = useState(null);
  const [subTab, setSubTab] = useState("positions");
  const [loading, setLoading] = useState(true);
  const PACIFICA_BLUE = "#00d1ff";

  const load = () => {
    setLoading(true);
    api.get("/api/portfolio")
      .then(data => { setPortfolio(data); })
      .catch(e => console.error("Sync Error:", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading || !portfolio) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-[#1a2b3b] border-t-[#00d1ff] rounded-full"
      />
      <div className="font-mono text-zinc-500 animate-pulse uppercase tracking-[0.3em] text-xs">
        Syncing_Live_Chain_State...
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">

      {/* Header */}
      <div className="flex justify-between items-end border-b border-zinc-900 pb-8">
        <div>
          <h2 className="text-white text-4xl font-black uppercase tracking-tighter italic">Portfolio_Terminal</h2>
          <div className="flex gap-4 items-center mt-3 font-mono uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
              <p className="text-[9px] text-zinc-500">{portfolio.pacificaAddress}</p>
            </div>
            <a href="https://test-app.pacifica.fi/faucet" target="_blank" rel="noreferrer" className="text-[9px] text-[#00d1ff] hover:underline flex items-center gap-1">
              <span>+</span> Access_Faucet
            </a>
          </div>
        </div>
        <button onClick={load} className="cursor-pointer text-[10px] bg-white text-black px-6 py-3 font-black uppercase tracking-widest hover:bg-[#00d1ff] hover:shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all active:scale-95">
          {loading ? "SYNCING..." : "Refresh_Node"}
        </button>
      </div>

      {/* 1. Spot Inventory Cards */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.5em] italic">// Spot_Inventory</h3>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>

        {(!portfolio.spotBalances || portfolio.spotBalances.length === 0) ? (
          <div className="p-12 border border-zinc-900 bg-zinc-950/30 text-center">
            <div className="text-zinc-700 font-mono text-xs uppercase tracking-[0.3em] mb-2">No_Spot_Holdings</div>
            <p className="text-zinc-600 text-[10px] uppercase">Deposit assets to view spot inventory</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {portfolio.spotBalances?.map((b) => (
                <motion.div
                  key={b.symbol}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ borderColor: PACIFICA_BLUE, boxShadow: `0 0 25px rgba(0,209,255,0.15)` }}
                  className="bg-zinc-950 border border-zinc-900 p-8 transition-all group overflow-hidden relative cursor-default"
                >
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <CryptoIcon symbol={b.symbol} size="10" />
                      <span className="bg-zinc-900 text-white px-3 py-1 font-black text-[9px] tracking-widest group-hover:bg-[#00d1ff] group-hover:text-black transition-all">{b.symbol}</span>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white tracking-tighter group-hover:text-[#00d1ff] transition-colors relative z-10 truncate">
                    {b.amount % 1 === 0 ? b.amount.toLocaleString() : b.amount.toFixed(4)}
                  </div>
                  <div className="absolute -bottom-4 -right-4 text-[64px] font-black text-zinc-900/15 group-hover:text-[#00d1ff11] transition-colors select-none pointer-events-none">
                    {b.symbol}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* 2. Global Metrics */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.5em] italic">// Account_Metrics</h3>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Account_Equity"
            value={`$${portfolio.accountEquity?.toFixed(2) ?? "0.00"}`}
            icon="◈"
          />
          <StatCard
            label="Trading_Volume"
            value={`$${portfolio.totalVolumeUsdc?.toFixed(2) ?? "0.00"}`}
            icon="◈"
          />
          <StatCard
            label="Unrealised_PnL"
            value={`$${portfolio.totalUnrealisedPnl?.toFixed(4) ?? "0.0000"}`}
            color={portfolio.totalUnrealisedPnl >= 0 ? "#22c55e" : "#ef4444"}
            icon={portfolio.totalUnrealisedPnl >= 0 ? "▲" : "▼"}
          />
          <StatCard
            label="Used_Margin"
            value={`$${portfolio.usedMargin?.toFixed(2) ?? "0.00"}`}
            icon="◈"
          />
        </div>
      </section>

      {/* 3. Sub-Navigation Tabs */}
      <section className="space-y-6">
        <div className="flex gap-1 bg-zinc-950/50 p-1 border border-zinc-900 rounded-lg w-fit">
          {["positions", "orders", "history", "funding"].map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`cursor-pointer px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-md ${
                subTab === t
                  ? "text-black bg-[#00d1ff] shadow-[0_0_15px_rgba(0,209,255,0.3)]"
                  : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {t === "history" ? "Trade_History" : t === "funding" ? "Funding" : `${t}`}
              <span className="ml-2 opacity-50">({portfolio[t]?.length || 0})</span>
            </button>
          ))}
        </div>

        <div className="border border-zinc-900 bg-black overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.table
              key={subTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full text-left font-mono text-[11px]"
            >
              <thead className="bg-zinc-950 text-zinc-500 uppercase">
                <tr>
                  {subTab === "positions" && ["Asset", "Side", "Size", "Entry_Price", "Mark_Price", "Unreal_PnL", "Margin"].map(h => (
                    <th key={h} className="p-4 border-r border-zinc-900 last:border-0 font-black tracking-widest text-[9px]">{h.replace(/_/g, " ")}</th>
                  ))}
                  {subTab === "orders" && ["Asset", "Type", "Side", "Size", "Price", "Status", "Time"].map(h => (
                    <th key={h} className="p-4 border-r border-zinc-900 last:border-0 font-black tracking-widest text-[9px]">{h.replace(/_/g, " ")}</th>
                  ))}
                  {subTab === "history" && ["Asset", "Side", "Fill_Size", "Fill_Price", "Fee", "Realized_PnL", "Date"].map(h => (
                    <th key={h} className="p-4 border-r border-zinc-900 last:border-0 font-black tracking-widest text-[9px]">{h.replace(/_/g, " ")}</th>
                  ))}
                  {subTab === "funding" && ["Asset", "Rate", "Payment", "Balance", "Time"].map(h => (
                    <th key={h} className="p-4 border-r border-zinc-900 last:border-0 font-black tracking-widest text-[9px]">{h.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {/* Positions Data Mapping */}
                {subTab === "positions" && portfolio.positions?.map((p) => (
                  <motion.tr
                    key={p.symbol}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[#00d1ff05] transition-colors group"
                  >
                    <td className="p-4 border-r border-zinc-900 text-white font-bold flex items-center gap-3">
                      <CryptoIcon symbol={p.symbol} />
                      {p.symbol}
                    </td>
                    <td className={`p-4 border-r border-zinc-900 font-black text-[9px] tracking-widest ${p.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                      {p.side}
                    </td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-300">{p.size?.toFixed(4)}</td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-500">${p.entryPrice?.toLocaleString()}</td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-100 font-bold">${p.markPrice?.toLocaleString()}</td>
                    <td className={`p-4 border-r border-zinc-900 font-black ${p.unrealisedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {p.unrealisedPnl?.toFixed(4)}
                    </td>
                    <td className="p-4 text-zinc-400 font-bold">${p.margin?.toFixed(2)}</td>
                  </motion.tr>
                ))}

                {/* Orders Data Mapping */}
                {subTab === "orders" && portfolio.orders?.map((o, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[#00d1ff05] transition-colors"
                  >
                    <td className="p-4 border-r border-zinc-900 text-white font-bold flex items-center gap-3">
                      <CryptoIcon symbol={o.symbol} />
                      {o.symbol}
                    </td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-500 uppercase text-[9px]">{o.type}</td>
                    <td className={`p-4 border-r border-zinc-900 font-black text-[9px] tracking-widest ${o.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                      {o.side}
                    </td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-300">{o.size}</td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-300">${o.price}</td>
                    <td className="p-4 border-r border-zinc-900">
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                        o.status === 'Open' ? 'text-yellow-500 bg-yellow-500/10' : 'text-zinc-500 bg-zinc-500/10'
                      }`}>{o.status}</span>
                    </td>
                    <td className="p-4 text-zinc-600">{new Date(o.timestamp).toLocaleTimeString()}</td>
                  </motion.tr>
                ))}

                {/* History Data Mapping */}
                {subTab === "history" && portfolio.history?.map((h, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[#00d1ff05] transition-colors"
                  >
                    <td className="p-4 border-r border-zinc-900 text-white font-bold flex items-center gap-3">
                      <CryptoIcon symbol={h.symbol} />
                      {h.symbol}
                    </td>
                    <td className={`p-4 border-r border-zinc-900 font-black text-[9px] tracking-widest ${h.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                      {h.side}
                    </td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-300">{h.size}</td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-300">${h.price}</td>
                    <td className="p-4 border-r border-zinc-900 text-red-900">-${h.fee}</td>
                    <td className={`p-4 border-r border-zinc-900 font-black ${h.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${h.pnl}
                    </td>
                    <td className="p-4 text-zinc-600">{new Date(h.timestamp).toLocaleDateString()}</td>
                  </motion.tr>
                ))}

                {/* Funding Data Mapping */}
                {subTab === "funding" && portfolio.funding?.map((f, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[#00d1ff05] transition-colors"
                  >
                    <td className="p-4 border-r border-zinc-900 text-white font-bold">{f.symbol}</td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-400">{f.rate}</td>
                    <td className={`p-4 border-r border-zinc-900 font-black ${f.payment >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {f.payment >= 0 ? '+' : ''}{f.payment}
                    </td>
                    <td className="p-4 border-r border-zinc-900 text-zinc-400">{f.balance}</td>
                    <td className="p-4 text-zinc-600">{new Date(f.timestamp).toLocaleString()}</td>
                  </motion.tr>
                ))}

                {/* Empty State */}
                {(!portfolio[subTab] || portfolio[subTab].length === 0) && (
                  <tr>
                    <td colSpan="7" className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-zinc-800 text-4xl">∅</div>
                        <div className="text-zinc-700 uppercase font-mono tracking-[0.3em] text-[10px]">Zero_Records_Found</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </motion.table>
          </AnimatePresence>
        </div>
      </section>
    </motion.div>
  );
}

function CryptoIcon({ symbol, size = "6" }) {
  const [loaded, setLoaded] = useState(false);
  const src = getIcon(symbol);

  return (
    <div className={`w-${size} h-${size} rounded-full bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center`}>
      {!loaded && <div className={`w-full h-full bg-zinc-800 rounded-full animate-pulse`} />}
      <img
        src={src}
        alt={symbol}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.textContent = symbol[0];
          e.target.parentElement.className += ` bg-zinc-700 text-white flex items-center justify-center font-black rounded-full w-${size} h-${size}`;
        }}
        className={`w-full h-full object-contain ${loaded ? 'block' : 'hidden'}`}
      />
    </div>
  );
}

function StatCard({ label, value, color = "#fff", icon = "◈" }) {
  return (
    <div className="bg-zinc-950 p-6 border border-zinc-900 hover:border-[#00d1ff]/50 hover:shadow-[0_0_20px_rgba(0,209,255,0.1)] transition-all cursor-default group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 text-zinc-900/20 group-hover:text-[#00d1ff11] transition-colors pointer-events-none">
        {icon}
      </div>
      <span className="text-[8px] text-zinc-600 uppercase tracking-[0.3em] font-mono group-hover:text-[#00d1ff] transition-colors block mb-2">
        {label}
      </span>
      <span className="block text-2xl font-black tracking-tighter text-white" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
