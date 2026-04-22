import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTradeLogger } from "../hooks/useTradeLogger";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PACIFICA_BLUE = "#00d1ff";

export default function LogsTab() {
  const { recentDecisions } = useTradeLogger();
  const [logs, setLogs] = useState([]);
  const [contractLogs, setContractLogs] = useState([]);
  const logRef = useRef(null);
  const autoScrollRef = useRef(true);
  const [filterText, setFilterText] = useState("");
  const [showContractLogs, setShowContractLogs] = useState(false);

  // Generate logs from contract decisions
  useEffect(() => {
    if (recentDecisions && recentDecisions.length > 0) {
      const generatedLogs = recentDecisions.map(d => ({
        line: `[CONTRACT] ${d.action} ${d.symbol} @ $${(Number(d.price) / 1e6).toFixed(2)} | Conf: ${d.confidence}% | RSI: ${Number(d.rsi5m) / 100}/${Number(d.rsi1h) / 100} | ${d.dryRun ? "DRY RUN" : "LIVE"}`,
        ts: new Date(Number(d.timestamp) * 1000).toISOString(),
      }));
      setContractLogs(generatedLogs);
    }
  }, [recentDecisions]);

  useEffect(() => {
    // Initial fetch of historical logs
    fetch(`${API}/api/logs?limit=500`)
      .then(r => r.json())
      .then(entries => setLogs(entries.map(e => ({ line: e.line, ts: e.timestamp }))))
      .catch(() => {});

    // Establish SSE stream for real-time Bloomberg-style output
    const es = new EventSource(`${API}/api/logs/stream`);
    es.onmessage = (e) => {
      try {
        const { line, timestamp } = JSON.parse(e.data);
        setLogs(prev => {
          const next = [...prev, { line, ts: timestamp }];
          return next.length > 1000 ? next.slice(-500) : next;
        });
      } catch (err) {
        console.error("Log Stream Error:", err);
      }
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  /**
   * Terminal Highlighter - Bloomberg Terminal style syntax highlighting
   */
  const highlightLine = (text) => {
    if (!text) return null;

    let highlighted = text;

    // Highlight Assets (e.g., [WIF], [BTC]) in Water Blue
    highlighted = highlighted.replace(/\[([A-Z0-9]+)\]/g, `<span style="color: ${PACIFICA_BLUE}; font-weight: 900;">[$1]</span>`);

    // Highlight Decisions with icons
    highlighted = highlighted.replace(/\bLONG\b/g, `<span style="color: #22c55e; font-weight: 900;">▲ LONG</span>`);
    highlighted = highlighted.replace(/\bSHORT\b/g, `<span style="color: #ef4444; font-weight: 900;">▼ SHORT</span>`);
    highlighted = highlighted.replace(/\bHOLD\b/g, `<span style="color: #6b7280; font-weight: 900;">─ HOLD</span>`);

    // Highlight Prices
    highlighted = highlighted.replace(/(\$[\d,]+\.?\d*)/g, `<span style="color: #ffffff; font-weight: 700;">$1</span>`);

    // Highlight Percentages
    highlighted = highlighted.replace(/([+-]?\d+\.?\d*%)/g, `<span style="color: #fbbf24; font-weight: 600;">$1</span>`);

    // Highlight Confidence
    highlighted = highlighted.replace(/(conf \d+%)/gi, `<span style="color: ${PACIFICA_BLUE}; font-style: italic; font-weight: 700;">$1</span>`);

    // Highlight RSI
    highlighted = highlighted.replace(/(RSI \d+m: \d+\.?\d*)/gi, `<span style="color: #f472b6; font-weight: 600;">$1</span>`);

    // Highlight Funding
    highlighted = highlighted.replace(/(Funding: ?[+-]?\d+\.?\d*)/gi, `<span style="color: #a78bfa; font-weight: 600;">$1</span>`);

    // Highlight Errors
    highlighted = highlighted.replace(/(ERROR|FAILED|Error|failed)/g, `<span style="color: #ef4444; font-weight: 900; background: rgba(239,68,68,0.1); padding: 0 4px;">$1</span>`);

    // Highlight Success
    highlighted = highlighted.replace(/(SUCCESS|OK|completed|Success)/g, `<span style="color: #22c55e; font-weight: 700;">$1</span>`);

    return <div dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  // Filter logs based on search text
  const logsToDisplay = showContractLogs ? contractLogs : logs;
  const filteredLogs = filterText
    ? logsToDisplay.filter(log => log.line.toLowerCase().includes(filterText.toLowerCase()))
    : logsToDisplay;

  return (
    <div className="space-y-4 h-[calc(100vh-250px)] flex flex-col">
      {/* Terminal Header */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00d1ff11] border border-[#00d1ff33] rounded-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-[9px] text-[#00d1ff] font-black uppercase tracking-[0.2em]">LIVE_STREAM</span>
          </div>
          <button
            onClick={() => setShowContractLogs(!showContractLogs)}
            className={`cursor-pointer px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border ${
              showContractLogs
                ? "border-[#00d1ff] text-[#00d1ff] bg-[#00d1ff11]"
                : "border-zinc-800 text-zinc-600 hover:border-zinc-600"
            }`}
          >
            {showContractLogs ? "Contract Logs" : "Agent Logs"}
          </button>
          <span className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
            Buffer: <span className="text-zinc-400">{filteredLogs.length}</span> / {showContractLogs ? contractLogs.length : logs.length}
          </span>
          {filterText && (
            <span className="text-[9px] text-[#00d1ff] font-mono uppercase">
              Filtered by: "{filterText}"
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="FILTER_LOGS..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="bg-zinc-950 border border-zinc-900 px-4 py-1.5 text-[9px] font-mono text-white placeholder-zinc-700 focus:border-[#00d1ff] outline-none uppercase tracking-widest w-48 cursor-text"
          />
          <button
            onClick={() => { autoScrollRef.current = true; if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }}
            className="cursor-pointer px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#00d1ff] border border-zinc-900 hover:border-[#00d1ff] transition-all bg-zinc-950"
          >
            Bottom
          </button>
          <button
            onClick={() => setLogs([])}
            className="cursor-pointer px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-900 hover:text-red-500 border border-red-900/30 hover:border-red-500/50 transition-all bg-zinc-950"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={logRef}
        onScroll={() => {
          if (!logRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = logRef.current;
          autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
        }}
        className="flex-1 overflow-y-auto font-mono text-[10px] bg-black border border-zinc-900 shadow-2xl custom-scrollbar"
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: "1.6" }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[10px] text-[#00d1ff] uppercase tracking-[0.5em] font-black"
            >
              {filterText ? "NO_MATCHING_LOGS" : "WAITING_FOR_DATA"}
            </motion.div>
          </div>
        ) : (
          <div className="p-4">
            {filteredLogs.map((log, i) => (
              <div key={i} className="flex gap-4 group hover:bg-[#00d1ff03] py-0.5 px-2 -mx-2 rounded-sm">
                {/* Line Number */}
                <span className="text-zinc-800 select-none font-mono text-[9px] pt-0.5 w-12 flex-shrink-0 text-right">
                  {(i + 1).toString().padStart(5, '0')}
                </span>

                {/* Timestamp */}
                <span className="text-zinc-700 select-none font-mono text-[8px] pt-0.5 w-20 flex-shrink-0">
                  {log.ts ? new Date(log.ts).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
                </span>

                {/* Log Content */}
                <div className="text-zinc-400 flex-1 group-hover:text-zinc-200 transition-colors border-l border-zinc-900/50 pl-4 group-hover:border-[#00d1ff]/50">
                  {highlightLine(log.line)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Terminal Status Footer */}
      <div className="flex justify-between items-center text-[8px] font-mono text-zinc-700 uppercase tracking-widest pt-2 border-t border-zinc-900">
        <div className="flex gap-6">
          <span>Encoding: UTF-8</span>
          <span>Source: Pacifica_Agent_Python</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_6px_#22c55e]" />
            Stream: Active
          </span>
          <span className="text-zinc-600">
            Auto-scroll: {autoScrollRef.current ? "ON" : "OFF"}
          </span>
        </div>
      </div>
    </div>
  );
}
