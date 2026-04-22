import { useState, useEffect, useMemo, useCallback } from "react";
import { useApi } from "../useApi";
import { motion, AnimatePresence } from "framer-motion";
import { useTradeLogger } from "../hooks/useTradeLogger";
import { useAccount } from "wagmi";

const PACIFICA_API = "https://test-api.pacifica.fi/api/v1";
const PACIFICA_BLUE = "#00d1ff";
const LOGO_DEV_API = "https://img.logo.dev/crypto/";
const LOGO_DEV_API_KEY=import.meta.env.VITE_LOGO_DEV_API_KEY;

const getIcon = (sym) =>
  `${LOGO_DEV_API}${sym.toLowerCase()}?token=${LOGO_DEV_API_KEY}`;


const INTERVALS = [
  { v: 60, l: "1 MIN" },
  { v: 300, l: "5 MIN" },
  { v: 900, l: "15 MIN" },
  { v: 3600, l: "1 HOUR" },
];

const RISK_PROFILES = {
  conservative: { desc: "Lower risk, smaller positions", sl: "2%", tp: "4%", conf: "75%" },
  balanced: { desc: "Moderate risk, balanced approach", sl: "3%", tp: "6%", conf: "60%" },
  aggressive: { desc: "Higher risk, larger positions", sl: "5%", tp: "10%", conf: "45%" },
};

export default function ConfigTab() {
  const api = useApi();
  const { address } = useAccount();
  const { totalDecisions, owner, recentDecisions, loadingDecisions, checkAuthorizedAgent } = useTradeLogger();
  const [cfg, setCfg] = useState(null);
  const [allSymbols, setAllSymbols] = useState([]);
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthorizedAgent, setIsAuthorizedAgent] = useState(false);
  const PAGE_SIZE = 60;

  useEffect(() => {
    if (address) {
      checkAuthorizedAgent(address).then(setIsAuthorizedAgent).catch(() => setIsAuthorizedAgent(false));
    }
  }, [address]);

  useEffect(() => {
    api.get("/api/config").then(setCfg).catch(() => {});

    // Comprehensive crypto list A-Z (top 500+ by market cap)
    const allCryptos = [
      // A
      "AAVE","ADA","ALGO","ATOM","AVAX","AR","ARB","APT","APE","ANKR","AXS","AUDIO","ALPHA","ACH","AGLD","ADX","AKRO","ALCX","ALEPH","ALICE","ALPACA","ALPHA","AMP","ANML","AOAO","API3","APT","ARB","ARDR","ARK","ARNX","AST","ASTR","ATA","ATM","ATOM","AUCTION","AUDIO","AUD","AXL","AXS","AZRO",
      // B
      "BAL","BAND","BAT","BCH","BLUR","BNB","BONK","BTC","BTT","BAKE","BAR","BAT","BCHA","BICO","BIFI","BLZ","BNT","BOND","BORA","BRD","BSW","BTS","BTT","BUSD","BXN",
      // C
      "C98","CAKE","CELO","CELR","CFX","CHAT","CHZ","CKB","CLV","COMP","COTI","CRO","CRV","CTSI","CTK","CVC","CVX",
      // D
      "DAI","DAR","DASH","DATA","CRV","DCR","DFI","DGB","DIA","DIVI","DOGE","DOT","DUSK","DYDX","DENT","DREP","DODO","DOGE","DOT",
      // E
      "EGLD","ELF","ENS","ETC","ETH","EUR","ENJ","ERN","ESP","ETN","EWT","EXRD",
      // F
      "FET","FIL","FIO","FIRO","FIS","FLM","FLOW","FORTH","FRONT","FTM","FTT","FXS","FIDA","FARM",
      // G
      "GALA","GLM","GLMR","GMT","GNO","GRT","GTC","GF","GNS","GODS","GAL","GAS","GLCH","GMX",
      // H
      "HBAR","HIFI","HIVE","HNT","HOT","HASH","HARD","HUNT","HIGH","HIFI","HIVE",
      // I
      "ICP","ICX","ILV","INJ","IOST","IOTX","IRIS","ISLM","IXT","IOTX","IONX",
      // J
      "JASMY","JST","JUP","JUV","JAM","JOE","JUV",
      // K
      "KAVA","KCS","KDA","KEEP","KLAY","KNC","KSM","KAR","KAVA","KEY","KLV","KMD","KNCL",
      // L
      "LDO","LINK","LIT","LRC","LSK","LTC","LUNA","LUNC","LPT","LOOKS","LOKA","LQTY","LAZIO","LEVER","LINA","LOKA","LPT",
      // M
      "MANA","MATIC","MINA","MKR","METIS","MIR","MBOX","MC","MDT","MAGIC","MANA","MASK","MATIC","MBL","MC","MCO","MFT","MINA","MIR","MITH","MKR","MLN","MMA","MNT","MOVR","MTL","MULTI","MBOX","MAGIC",
      // N
      "NANO","NAS","NAV","NCT","NEAR","NEO","NEX","NFT","NKN","NMR","NPXS","NRG","NU","NULS","NXS","NYM","NANO","NEAR","NEO","NKN",
      // O
      "OCEAN","ONT","ONE","OOKI","OP","ORN","OXT","OKB","OMG","OM","ONT","OCEAN","OP","OPT","ORBS","ORN","OSMO","OXT",
      // P
      "PAXG","PENDLE","PERP","PHB","PLA","POLS","POLY","POND","PORTO","POWR","PROM","PROS","PSG","PUNDIX","PYTH","PAX","PAXG","PERP","PHX","PI","PNT","POLS","POLY","POND","PORTO","POWR","PROM","PROS","PSG","PUNDIX","PYTH","PNT",
      // Q
      "QI","QKC","QLC","QNT","QSP","QTUM","QNT","QKC",
      // R
      "RAD","RARE","RAY","REEF","REN","REP","REQ","RIF","RLC","ROSE","RPL","RSR","RUNE","RVN","RYOSHI","RARE","RAY","REEF","REN","REQ","RIF","RLC","ROSE","RPL","RSR","RUNE","RVN",
      // S
      "SAND","SCRT","SFP","SHIB","SNX","SOL","SPS","SSV","STG","STORJ","STMX","STRAX","STX","SUI","SUSHI","SXP","SYS","SAFEMOON","SALT","SAN","SC","SCRT","SDN","SEEK","SENSE","SFP","SHIB","SHR","SHIB","SHPING","SIAL","SKL","SLP","SLRS","SMART","SNC","SNGLS","SNM","SNX","SOL","SOCKS","SOL","SPS","SRM","SSV","STG","STAK","STORJ","STMX","STRAT","STRAX","STX","SUN","SUPER","SUSHI","SUTER","SWAP","SWARMS","SWEAT","SWRV","SXP","SYS","SYN",
      // T
      "T","TBTC","TCT","TFUEL","THETA","TKO","TLM","TNTR","TOMO","TORN","TRAC","TRB","TRIBE","TRIG","TRU","TRX","TWT","TAO","TARA","T",
      // U
      "UBQ","UMA","UNCX","UNFI","UNI","UOS","UTK","USDC","USDT","USTC","UTK","UNFI","UMA","UBQ",
      // V
      "VEE","VELO","VERI","VET","VGX","VIDT","VIKKY","VINU","VISR","VLX","VRA","VSYS","VITE","VTX","VRA","VTHO","VET","VGX","VIB","VITE","VLX","VRA","VSYS","VTHO",
      // W
      "WAVES","WAXP","WBTC","WCFG","WEC","WEMIX","WING","WINGS","WOO","WRX","WTC","WAX","WAVES","WBTC","WOO","WRX",
      // X
      "XEC","XEM","XLM","XMR","XRP","XSN","XTZ","XVG","XYO","XEC","XEM","XLM","XMR","XRP","XSN","XTZ","XVG","XYO",
      // Y
      "YFI","YGG","YFII","YAM","YFII","YFI","YGG",
      // Z
      "ZEC","ZEN","ZIL","ZKS","ZRX","ZAP","ZB","ZCO","ZIL","ZKS","ZRX","ZEC","ZEN"
    ];

    fetch(`${PACIFICA_API}/info/prices`)
      .then(r => r.json())
      .then(raw => {
        const pacificaSyms = (raw?.data || []).map(i => i.symbol).filter(Boolean);
        // Merge Pacifica symbols with comprehensive list, remove duplicates
        const merged = [...new Set([...pacificaSyms, ...allCryptos])].sort();
        setAllSymbols(merged);
      })
      .catch(() => {
        setAllSymbols(allCryptos);
      });
  }, []);

  const update = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const toggleSym = (sym) => {
    const cur = cfg.symbols;
    if (cur.includes(sym)) {
      if (cur.length === 1) return;
      update("symbols", cur.filter(s => s !== sym));
    } else {
      if (cur.length >= 10) return;
      update("symbols", [...cur, sym]);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/api/config", cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error("Config Sync Error:", e);
    } finally {
      setSaving(false);
    }
  };

  const filteredSymbols = useMemo(() => {
    if (searchTerm) {
      return allSymbols.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return allSymbols;
  }, [allSymbols, searchTerm]);

  const totalPages = Math.ceil(filteredSymbols.length / PAGE_SIZE);
  const visibleSymbols = filteredSymbols.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectedCount = cfg?.symbols?.length || 0;

  if (!cfg) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-10 h-10 border-2 border-[#1a2b3b] border-t-[#00d1ff] rounded-full"
      />
      <div className="font-mono text-zinc-500 animate-pulse uppercase tracking-[0.3em] text-xs">
        Synchronizing_Protocol_Invariants...
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl space-y-20 pb-32">

      {/* Contract Status Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.5em] italic">// OnChain_Contract_Status</h3>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Contract Address */}
          <div className="p-5 border border-[#1a2b3b] bg-zinc-950/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#00d1ff] text-lg">◈</span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Contract Address</span>
            </div>
            <p className="text-[10px] font-mono text-white truncate">0x04F5...17720dc</p>
            <a
              href="https://hashkeychain-testnet.explorer.alt.technology/address/0x04F5F16f301Caf4C822Fd087aeD8dE43c17720dc"
              target="_blank"
              rel="noreferrer"
              className="text-[8px] text-[#00d1ff] underline underline-offset-4 mt-2 inline-block hover:text-white transition-colors"
            >
              View on Explorer →
            </a>
          </div>

          {/* Owner */}
          <div className="p-5 border border-[#1a2b3b] bg-zinc-950/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#00d1ff] text-lg">◈</span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Contract Owner</span>
            </div>
            <p className="text-[10px] font-mono text-white truncate">
              {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "Loading..."}
            </p>
          </div>

          {/* Total Decisions */}
          <div className="p-5 border border-[#1a2b3b] bg-zinc-950/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#00d1ff] text-lg">◈</span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Total Decisions</span>
            </div>
            <p className="text-2xl font-black text-white font-mono">
              {loadingDecisions ? "..." : totalDecisions}
            </p>
          </div>

          {/* Agent Status */}
          <div className="p-5 border border-[#1a2b3b] bg-zinc-950/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#00d1ff] text-lg">◈</span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Agent Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAuthorizedAgent ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-zinc-600'}`} />
              <p className="text-[10px] font-mono text-white uppercase">
                {isAuthorizedAgent ? "Authorized" : "Not Authorized"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Decisions Summary */}
        {!loadingDecisions && recentDecisions && recentDecisions.length > 0 && (
          <div className="p-5 border border-[#1a2b3b] bg-zinc-950/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[#00d1ff] text-lg">◈</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Latest Decision</span>
              </div>
              <span className="text-[8px] text-zinc-600 uppercase tracking-widest">
                {new Date(Number(recentDecisions[0]?.timestamp) * 1000).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-[9px] font-mono uppercase tracking-widest">
              <div>
                <span className="text-zinc-600 block mb-1">Symbol</span>
                <span className="text-white">{recentDecisions[0]?.symbol}</span>
              </div>
              <div>
                <span className="text-zinc-600 block mb-1">Action</span>
                <span className={recentDecisions[0]?.action === "LONG" ? "text-green-500" : recentDecisions[0]?.action === "SHORT" ? "text-red-500" : "text-zinc-400"}>
                  {recentDecisions[0]?.action}
                </span>
              </div>
              <div>
                <span className="text-zinc-600 block mb-1">Price</span>
                <span className="text-white">${(Number(recentDecisions[0]?.price) / 1e6).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-zinc-600 block mb-1">Confidence</span>
                <span className="text-white">{recentDecisions[0]?.confidence}%</span>
              </div>
              <div>
                <span className="text-zinc-600 block mb-1">RSI 5m/1h</span>
                <span className="text-white">{Number(recentDecisions[0]?.rsi5m) / 100}/{Number(recentDecisions[0]?.rsi1h) / 100}</span>
              </div>
              <div>
                <span className="text-zinc-600 block mb-1">Mode</span>
                <span className={recentDecisions[0]?.dryRun ? "text-yellow-500" : "text-green-500"}>
                  {recentDecisions[0]?.dryRun ? "DRY RUN" : "LIVE"}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 1. Technical Disclaimer */}
      <div className="border border-yellow-900/50 bg-yellow-900/5 p-6 font-mono relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-600" />
        <div className="flex items-center gap-4 text-yellow-500 mb-3 uppercase text-[9px] font-black tracking-widest">
          <span className="animate-pulse text-lg">⚠</span> Safety_Protocol_Notice
        </div>
        <p className="text-zinc-300 text-[10px] leading-relaxed uppercase tracking-tight">
          ATTENTION: Add only crypto assets you currently own or have collateralized on Pacifica.
          Adding random assets may trigger unintended liquidations during high volatility.
        </p>
      </div>

      {/* 2. System Status Toggles */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.5em] italic">// System_Status_Array</h3>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MasterToggle
            label="Autonomous_Core"
            desc="Enable AI trading decisions"
            active={cfg.enabled}
            onToggle={() => update("enabled", !cfg.enabled)}
            icon="◈"
          />
          <MasterToggle
            label="Simulation_Mode"
            desc="Paper trading (no real orders)"
            active={cfg.dryRun}
            onToggle={() => update("dryRun", !cfg.dryRun)}
            icon="◈"
            activeColor="#f59e0b"
          />
          <MasterToggle
            label="Hot_Swap_Binance"
            desc="Fallback to Binance data"
            active={cfg.useBinanceFallback}
            onToggle={() => update("useBinanceFallback", !cfg.useBinanceFallback)}
            icon="◈"
          />
        </div>
      </section>

      {/* 3. Market Matrix */}
      <section className="space-y-6">
        <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
          <div>
            <h3 className="text-zinc-400 text-[10px] font-mono uppercase tracking-[0.5em] italic">// Available_DEX_Markets</h3>
            <p className="text-zinc-600 text-[9px] uppercase mt-1 tracking-widest">Select assets to monitor & trade</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white font-bold font-mono uppercase tracking-[0.2em]">
              Selected: <span style={{ color: PACIFICA_BLUE }}>{selectedCount}</span> / 10
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="SEARCH_ASSETS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 px-4 py-3 text-[10px] font-mono text-white placeholder-zinc-700 focus:border-[#00d1ff] outline-none uppercase tracking-widest cursor-text"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 text-[9px] font-mono uppercase">
            {visibleSymbols.length} assets
          </div>
        </div>

        {/* Symbol Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {visibleSymbols.map(s => {
            const isActive = cfg.symbols.includes(s);
            return (
              <SymbolButton
                key={s}
                symbol={s}
                isActive={isActive}
                onClick={() => toggleSym(s)}
              />
            );
          })}
        </div>

        {/* Pagination */}
        {!searchTerm && totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="cursor-pointer text-[9px] font-mono text-zinc-400 hover:text-[#00d1ff] disabled:text-zinc-700 disabled:cursor-not-allowed border border-zinc-800 hover:border-[#00d1ff] px-8 py-3 uppercase tracking-[0.3em] transition-all bg-zinc-950"
            >
              ← PREV
            </button>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="cursor-pointer text-[9px] font-mono text-zinc-400 hover:text-[#00d1ff] disabled:text-zinc-700 disabled:cursor-not-allowed border border-zinc-800 hover:border-[#00d1ff] px-8 py-3 uppercase tracking-[0.3em] transition-all bg-zinc-950"
            >
              NEXT →
            </button>
          </div>
        )}
      </section>

      {/* 4. Interval & Risk Strategy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Loop Interval */}
        <div className="space-y-6">
          <div>
            <h4 className="text-[9px] text-zinc-500 uppercase tracking-[0.5em] font-mono italic mb-4">// Loop_Interval_Protocol</h4>
            <p className="text-zinc-600 text-[9px] uppercase tracking-widest">How often to analyze markets</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {INTERVALS.map(opt => (
              <button
                key={opt.v}
                onClick={() => update("loopIntervalSeconds", opt.v)}
                className={`cursor-pointer py-4 text-[9px] font-black border transition-all ${
                  cfg.loopIntervalSeconds === opt.v
                    ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-600 bg-zinc-950"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Profile */}
        <div className="space-y-6">
          <div>
            <h4 className="text-[9px] text-zinc-500 uppercase tracking-[0.5em] font-mono italic mb-4">// Logic_Risk_Profile</h4>
            <p className="text-zinc-600 text-[9px] uppercase tracking-widest">Pre-set trading parameters</p>
          </div>
          <div className="space-y-3">
            {Object.entries(RISK_PROFILES).map(([key, data]) => (
              <button
                key={key}
                onClick={() => {
                  update("riskLevel", key);
                  // Optionally auto-apply preset values
                }}
                className={`cursor-pointer w-full p-4 border text-left transition-all flex justify-between items-center ${
                  cfg.riskLevel === key
                    ? "border-[#00d1ff] bg-[#00d1ff11]"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                }`}
              >
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    cfg.riskLevel === key ? "text-[#00d1ff]" : "text-zinc-400"
                  }`}>
                    {key}
                  </span>
                  <p className="text-zinc-600 text-[8px] uppercase mt-1 tracking-widest">{data.desc}</p>
                </div>
                <div className="text-right text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                  <div>SL: {data.sl}</div>
                  <div>TP: {data.tp}</div>
                  <div>Conf: {data.conf}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Execution & Exit Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 border-y border-zinc-800 py-20 bg-zinc-900/5">
        <div className="space-y-16 p-8">
          <div>
            <h4 className="text-[9px] text-zinc-400 uppercase tracking-[0.5em] font-mono italic mb-2">Exposure_Thresholds</h4>
            <p className="text-zinc-600 text-[8px] uppercase tracking-widest">Position sizing limits</p>
          </div>
          <ArchitectSlider
            label="Max_Unit_Exposure"
            value={`$${cfg.maxPositionUsdc}`}
            min={5} max={500} step={5}
            v={cfg.maxPositionUsdc}
            onChange={val => update("maxPositionUsdc", val)}
          />
          <ArchitectSlider
            label="Intelligence_Confidence"
            value={`${Math.round(cfg.minConfidence * 100)}%`}
            min={50} max={95} step={5}
            v={cfg.minConfidence * 100}
            onChange={val => update("minConfidence", val / 100)}
          />
        </div>

        <div className="space-y-16 p-8 border-l border-zinc-800">
          <div>
            <h4 className="text-[9px] text-zinc-400 uppercase tracking-[0.5em] font-mono italic mb-2">Risk_Mitigation</h4>
            <p className="text-zinc-600 text-[8px] uppercase tracking-widest">Auto-exit thresholds</p>
          </div>
          <ArchitectSlider
            label="Stop_Loss_(Peak-to-Low)"
            value={`${cfg.stopLossPct}%`}
            min={0.5} max={10} step={0.5}
            v={cfg.stopLossPct}
            onChange={val => update("stopLossPct", val)}
          />
          <ArchitectSlider
            label="Take_Profit_(Peak-to-High)"
            value={`${cfg.takeProfitPct}%`}
            min={1} max={20} step={1}
            v={cfg.takeProfitPct}
            onChange={val => update("takeProfitPct", val)}
          />
        </div>
      </div>

      {/* 6. Deployment Button */}
      <motion.button
        onClick={save}
        disabled={saving}
        whileHover={{ scale: saving ? 1 : 1.01 }}
        whileTap={{ scale: saving ? 1 : 0.99 }}
        className={`cursor-pointer w-full py-8 font-black uppercase tracking-[1em] text-[10px] transition-all border active:scale-[0.98] relative overflow-hidden ${
          saved
            ? "bg-green-500 text-black border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)]"
            : "bg-white text-black border-white hover:bg-[#00d1ff] hover:border-[#00d1ff] hover:shadow-[0_0_30px_rgba(0,209,255,0.4)]"
        }`}
      >
        {saving && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        {saving ? "SYNCING_PROTOCOL..." : saved ? "✓ CONFIG_DEPLOYED" : "COMMIT_SYSTEM_CHANGES"}
      </motion.button>
    </motion.div>
  );
}

function MasterToggle({ label, desc, active, onToggle, icon = "◈", activeColor = "#00d1ff" }) {
  return (
    <button
      onClick={onToggle}
      className={`cursor-pointer p-6 border flex flex-col gap-6 transition-all group relative overflow-hidden ${
        active
          ? 'bg-zinc-900 border-[#00d1ff] shadow-[0_0_20px_rgba(0,209,255,0.15)]'
          : 'bg-black border-zinc-900 hover:border-[#00d1ff]'
      }`}
    >
      {/* Icon */}
      <div className={`text-3xl absolute top-4 right-4 transition-opacity ${active ? 'opacity-100' : 'opacity-20'}`} style={{ color: active ? activeColor : '#fff' }}>
        {icon}
      </div>

      {/* Label */}
      <span className={`text-[9px] font-black uppercase tracking-[0.3em] font-mono text-left w-full ${
        active ? 'text-[#00d1ff]' : 'text-zinc-500 group-hover:text-[#00d1ff]'
      }`}>
        {label}
      </span>

      {/* Description */}
      <span className="text-[8px] text-zinc-600 uppercase tracking-widest text-left">
        {desc}
      </span>

      {/* Toggle Track */}
      <div className={`w-full h-8 border flex items-center px-1 transition-colors relative ${
        active ? 'border-[#00d1ff] bg-[#00d1ff11]' : 'border-zinc-800 bg-zinc-950'
      }`}>
        <motion.div
          animate={{ x: active ? '280%' : '0%' }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`w-6 h-6 shadow-lg relative z-10 ${
            active ? 'bg-[#00d1ff]' : 'bg-zinc-700'
          }`}
        />
      </div>
    </button>
  );
}

function SymbolButton({ symbol, isActive, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = getIcon(symbol);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`cursor-pointer flex items-center gap-3 px-4 py-3 text-[10px] font-black border transition-all relative overflow-hidden ${
        isActive
          ? "bg-[#00d1ff] text-black border-[#00d1ff] shadow-[0_0_25px_rgba(0,209,255,0.3)]"
          : "border-zinc-800 text-zinc-400 hover:border-[#00d1ff] hover:text-[#00d1ff] bg-zinc-900/10"
      }`}
    >
      <div className={`w-6 h-6 rounded-full border flex items-center justify-center p-1 ${isActive ? 'border-black' : 'border-zinc-800'}`}>
        {!loaded && !error && <div className="w-full h-full bg-zinc-800 rounded-full animate-pulse" />}
        {error ? (
          <span className="text-white font-black text-[8px]">{symbol[0]}</span>
        ) : (
          <img
            src={src}
            alt={symbol}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLoaded(true);
              setError(true);
            }}
            className={`w-full h-full object-contain ${isActive ? 'invert' : ''} ${loaded && !error ? 'block' : 'hidden'}`}
          />
        )}
      </div>
      <span className="tracking-widest uppercase flex-1">{symbol}</span>
      {isActive && (
        <motion.div
          layoutId={`active-${symbol}`}
          className="absolute inset-0 bg-gradient-to-br from-[#00d1ff44] to-transparent pointer-events-none"
        />
      )}
    </motion.button>
  );
}

function ArchitectSlider({ label, value, min, max, step, v, onChange }) {
  const percentage = ((v - min) / (max - min)) * 100;

  return (
    <div className="space-y-4">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] items-center">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-black italic px-3 py-1 bg-zinc-900 border border-zinc-800" style={{ borderBottomColor: '#00d1ff' }}>
          {value}
        </span>
      </div>
      <div className="relative h-2">
        {/* Track */}
        <div className="absolute inset-0 bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
          {/* Fill */}
          <div
            className="h-full bg-gradient-to-r from-[#00d1ff] to-[#00d1ff88]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={e => onChange(+e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-crosshair"
        />
        {/* Custom Thumb Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#00d1ff] rounded-full shadow-[0_0_10px_#00d1ff] pointer-events-none transition-all"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[8px] font-mono text-zinc-700 uppercase tracking-widest">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
