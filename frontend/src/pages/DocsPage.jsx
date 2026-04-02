import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function DocsPage() {
  const blue = "#00d1ff"; // Pacifica Water Blue
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  // Real-time clock for the institutional footer
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-300 font-sans selection:bg-[#00d1ff] selection:text-black flex flex-col">

      <div className="flex flex-col md:flex-row flex-1">
        {/* Surgical Sidebar Navigation */}
        <aside className="w-full md:w-80 border-r border-[#1a2b3b] bg-black p-10 flex flex-col z-20 overflow-y-auto custom-scrollbar">
          <Link to="/" className="text-white font-black tracking-[0.4em] text-sm mb-16 uppercase flex items-center gap-3 group">
            <div className="w-4 h-4 rotate-45 border-2 transition-all group-hover:bg-[#00d1ff]" style={{ borderColor: blue }} />
            ← <span className="group-hover:text-[#00d1ff]">PILOT_HOME</span>
          </Link>

          <nav className="space-y-12 uppercase font-mono text-[11px] tracking-widest">
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">01_Getting_Started</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#overview" className="hover:text-white transition-colors">Overview</a></li>
                <li><a href="#quickstart" className="hover:text-white transition-colors">Quick_Start</a></li>
              </ul>
            </div>
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">02_System_Specs</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#architecture" className="hover:text-white transition-colors">Architecture</a></li>
                <li><a href="#workflow" className="hover:text-white transition-colors">Workflow</a></li>
                <li><a href="#mechanics" className="hover:text-white transition-colors">Trading_Mechanics</a></li>
              </ul>
            </div>
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">03_Deployment</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#prerequisites" className="hover:text-white transition-colors">Prerequisites</a></li>
                <li><a href="#installation" className="hover:text-white transition-colors">Installation</a></li>
                <li><a href="#backend-setup" className="hover:text-white transition-colors">Backend_Config</a></li>
                <li><a href="#frontend-setup" className="hover:text-white transition-colors">Frontend_Config</a></li>
                <li><a href="#agent-setup" className="hover:text-white transition-colors">Agent_Config</a></li>
              </ul>
            </div>
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">04_Pacifica_Setup</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#pacifica-wallet" className="hover:text-white transition-colors">Create_Wallet</a></li>
                <li><a href="#pacifica-keys" className="hover:text-white transition-colors">Generate_Keys</a></li>
                <li><a href="#testnet-faucet" className="hover:text-white transition-colors">Testnet_Faucet</a></li>
              </ul>
            </div>
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">05_API_Keys</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#gemini-key" className="hover:text-white transition-colors">Gemini_AI_Key</a></li>
                <li><a href="#elfa-key" className="hover:text-white transition-colors">Elfa_AI_Key</a></li>
              </ul>
            </div>
            <div>
              <p style={{ color: blue }} className="mb-6 opacity-80 italic font-bold border-b border-zinc-900 pb-2">06_Running</p>
              <ul className="space-y-4 pl-4 border-l border-zinc-800">
                <li><a href="#start-services" className="hover:text-white transition-colors">Start_Services</a></li>
                <li><a href="#onboarding" className="hover:text-white transition-colors">Onboarding</a></li>
                <li><a href="#trading-modes" className="hover:text-white transition-colors">Trading_Modes</a></li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Main Content Terminal */}
        <main className="flex-1 bg-black overflow-y-auto custom-scrollbar border-b border-[#1a2b3b]">
          <div className="max-w-5xl mx-auto p-12 md:p-24 space-y-40">

            {/* 01. Overview */}
            <section id="overview">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">01. Overview</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">What is PacificaPilot?</h3>
                <p className="text-zinc-400 text-lg leading-relaxed uppercase tracking-tighter">
                  PacificaPilot is an autonomous AI trading agent for Pacifica, a perpetual futures DEX on Solana.
                  It integrates:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                     "Real-time market data (RSI, funding, basis)",
                     "Social sentiment (Elfa AI Twitter analysis)",
                     "AI reasoning (Google Gemini 2.5 Flash)",
                     "Automated execution (Ed25519-signed orders)",
                     "Risk management (Trailing stops, limits)"
                   ].map((item, i) => (
                     <div key={i} className="p-5 border border-zinc-900 bg-zinc-950/30 flex gap-4 items-center">
                        <span style={{ color: blue }}>[+]</span>
                        <span className="text-[11px] uppercase font-mono">{item}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div id="quickstart" className="mt-24 space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Quick_Start (5 Minutes)</h3>
                <p className="text-zinc-500 text-sm leading-relaxed uppercase tracking-tight">
                  Follow the detailed deployment guide below for complete setup instructions.
                </p>
              </div>
            </section>

            {/* 02. Architecture */}
            <section id="architecture">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">02. Architecture</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="bg-[#050a12]/40 border border-[#1a2b3b] p-12 rounded-sm relative overflow-hidden group shadow-2xl mb-12">
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${blue}, transparent)` }} />
                <pre className="text-zinc-400 text-sm leading-8 font-mono overflow-x-auto whitespace-pre">
{` [ CLIENT_UI ] <────────── JWT AUTH ──────────> [ EXPRESS_API ]
        │                                             │
   (1) SSE STREAM                                (2) AES-256 STORE
        ▲                                             ▼
  [ LOG_BUFFER ] <───── x-agent-key ───────> [ PYTHON_AGENT ]
                                                │
   (3) INTELLIGENCE                             │ (4) EXECUTION
        ├─ GEMINI 2.5 FLASH                     ├─ Ed25519 SIGNING
        └─ ELFA AI SENTIMENT                    └─ PACIFICA API`}
                </pre>
              </div>
              <div id="workflow" className="space-y-12">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Workflow_Cycle</h3>
                <div className="grid grid-cols-1 gap-6">
                  {[
                    { id: "A", t: "FETCH_CONFIG", d: "Agent polls /api/agent/config every 5 minutes for user parameters." },
                    { id: "B", t: "MARKET_SCAN", d: "Parallel processing of RSI-14 (5m/1h) and basis spread vs Binance." },
                    { id: "C", t: "SENTIMENT_SYNC", d: "Retrieval of Elfa AI engagement scores and trending rankings." },
                    { id: "D", t: "AI_INFERENCE", d: "Gemini 2.5 Flash synthesizes signals into actionable trading logic." },
                    { id: "E", t: "SIGNED_BROADCAST", d: "Ed25519-signed orders sent to Pacifica with trailing risk guardrails." }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-8 p-8 bg-zinc-950/20 border border-zinc-900 group hover:border-[#00d1ff]/50 transition-all cursor-default">
                       <span className="text-zinc-800 text-4xl font-black italic">{step.id}</span>
                       <div>
                          <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-1">{step.t}</h4>
                          <p className="text-zinc-500 text-xs leading-relaxed uppercase">{step.d}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 03. Signal Mechanics */}
            <section id="mechanics">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">03. Mechanics</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="bg-[#050a12]/30 border border-[#1a2b3b] p-10">
                <h3 style={{ color: blue }} className="text-sm font-black uppercase mb-10 tracking-widest italic underline underline-offset-8 decoration-zinc-800">Signal_Interpretation_Invariants</h3>
                <table className="w-full border-collapse text-left font-mono text-[11px] text-zinc-500">
                  <thead>
                    <tr className="border-b border-zinc-800 uppercase">
                      <th className="py-4 pr-4 font-black">Invariant</th>
                      <th className="py-4 pr-4 font-black text-white italic">Bullish_State</th>
                      <th className="py-4 font-black text-white italic">Bearish_State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 uppercase tracking-tighter">
                    <tr><td className="py-6 font-bold">RSI-14 (1H)</td><td className="py-6 text-[#00d1ff]">&lt; 35 (Oversold)</td><td className="py-6 text-red-900">&gt; 65 (Overbought)</td></tr>
                    <tr><td className="py-6 font-bold">Funding_Rate</td><td className="py-6 text-[#00d1ff]">Negative (Shorts Pay)</td><td className="py-6 text-red-900">Positive (Longs Pay)</td></tr>
                    <tr><td className="py-6 font-bold">Basis_Spread</td><td className="py-6 text-[#00d1ff]">Discount (Pac &lt; Bin)</td><td className="py-6 text-red-900">Premium (Pac &gt; Bin)</td></tr>
                    <tr><td className="py-6 font-bold">Sentiment</td><td className="py-6 text-[#00d1ff]">High Engagement (&gt;0.3)</td><td className="py-6 text-zinc-700">Low Engagement</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 04. Deployment Guide */}
            <section id="prerequisites" className="pb-24">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">04. Deployment Guide</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* Prerequisites */}
              <div id="installation" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Prerequisites</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "Python 3.11+", desc: "Required for agent runtime" },
                    { name: "Node.js 18+", desc: "Required for backend/frontend" },
                    { name: "pip", desc: "Python package manager" },
                    { name: "npm/yarn", desc: "Node package manager" },
                  ].map((item, i) => (
                    <div key={i} className="p-5 border border-zinc-900 bg-zinc-950/30">
                      <p className="text-white font-bold uppercase tracking-widest text-xs">{item.name}</p>
                      <p className="text-zinc-600 text-[10px] uppercase mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installation */}
              <div id="installation" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Step 1: Clone & Install Dependencies</h3>
                <pre className="bg-[#050a12] border border-[#1a2b3b] p-8 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`# Clone repository
git clone https://github.com/MayurK-cmd/Pacificia-Trading-Bot.git
cd Pacificia-Trading-Bot

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install agent dependencies
cd ../agent
pip install -r requirements.txt`}
                </pre>
              </div>

              {/* Backend Setup */}
              <div id="backend-setup" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Step 2: Backend Configuration</h3>
                <p className="text-zinc-500 text-sm uppercase tracking-tight">Create <code className="text-[#00d1ff]">backend/.env</code> with the following:</p>
                <pre className="bg-[#050a12] border border-[#1a2b3b] p-8 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/pacifica

# Privy Authentication (https://privy.io)
PRIVY_APP_ID=app_id_from_privy_dashboard
PRIVY_APP_SECRET=secret_from_privy_dashboard

# Encryption (generate random 32 hex chars)
ENCRYPTION_SECRET=32_random_hex_characters_here

# Agent Authentication (generate secure random string)
AGENT_API_SECRET=secure_random_string_for_agent_auth`}
                </pre>
                <div className="p-4 border border-[#1a2b3b] bg-[#050a12]/30">
                  <p className="text-[10px] uppercase tracking-tight text-zinc-500">
                    <span style={{ color: blue }} className="font-bold">Note:</span> Generate <code>AGENT_API_SECRET</code> using: <code className="text-zinc-300">openssl rand -hex 32</code>
                  </p>
                </div>
              </div>

              {/* Frontend Setup */}
              <div id="frontend-setup" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Step 3: Frontend Configuration</h3>
                <p className="text-zinc-500 text-sm uppercase tracking-tight">Create <code className="text-[#00d1ff]">frontend/.env</code> with:</p>
                <pre className="bg-[#050a12] border border-[#1a2b3b] p-8 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`VITE_BACKEND_URL=http://localhost:3001
VITE_PRIVY_APP_ID=app_id_from_privy_dashboard`}
                </pre>
              </div>

              {/* Agent Setup */}
              <div id="agent-setup" className="space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Step 4: Agent Configuration</h3>
                <p className="text-zinc-500 text-sm uppercase tracking-tight">Create <code className="text-[#00d1ff]">agent/.env</code> with:</p>
                <pre className="bg-[#050a12] border border-[#1a2b3b] p-8 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`# Backend Connection
BACKEND_URL=http://localhost:3001
AGENT_API_SECRET=<same_as_backend.env>

# Pacifica Testnet API
PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1
PACIFICA_WS_URL=wss://test-ws.pacifica.fi/ws

# Pacifica Wallet Keys (set after onboarding)
PACIFICA_PRIVATE_KEY=<your_main_wallet_private_key>
PACIFICA_AGENT_PRIVATE_KEY=<agent_wallet_private_key>
PACIFICA_AGENT_API_KEY=<agent_api_key_from_pacifica>

# AI Services
GEMINI_API_KEY=<google_gemini_api_key>
ELFA_API_KEY=<elfa_ai_api_key>

# Trading Mode
DRY_RUN=true`}
                </pre>
              </div>
            </section>

            {/* 05. Pacifica Setup */}
            <section id="pacifica-wallet" className="pb-24">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">05. Pacifica Setup</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* Create Wallet */}
              <div id="pacifica-wallet" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Create Pacifica Wallet</h3>
                <div className="space-y-6">
                  <p className="text-zinc-400 text-sm leading-relaxed uppercase tracking-tight">
                    Pacifica requires a Solana wallet for trading. Follow these steps:
                  </p>
                  <div className="space-y-4">
                    {[
                      { step: "1", text: "Visit test-app.pacifica.fi (Testnet)" },
                      { step: "2", text: "Connect your Phantom wallet" },
                      { step: "3", text: "Complete onboarding flow" },
                      { step: "4", text: "Note your wallet address (starts with AMV...)" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 items-center p-6 bg-zinc-950/20 border border-zinc-900">
                        <span style={{ color: blue }} className="text-2xl font-black">{item.step}</span>
                        <p className="text-zinc-400 text-sm uppercase tracking-tight">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Keys */}
              <div id="pacifica-keys" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Generate Agent Keys</h3>
                <div className="space-y-6">
                  <p className="text-zinc-400 text-sm leading-relaxed uppercase tracking-tight">
                    Pacifica provides agent keys for API access:
                  </p>
                  <div className="space-y-4">
                    {[
                      { step: "1", text: "Visit test-app.pacifica.fi/apikey" },
                      { step: "2", text: "Generate a new agent key pair" },
                      { step: "3", text: "Copy the 'Secret' (private key) - shown only once!" },
                      { step: "4", text: "Copy the 'API Key' (public key) for API calls" },
                      { step: "5", text: "Save both in agent/.env as PACIFICA_AGENT_PRIVATE_KEY and PACIFICA_AGENT_API_KEY" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 items-center p-6 bg-zinc-950/20 border border-zinc-900">
                        <span style={{ color: blue }} className="text-2xl font-black">{item.step}</span>
                        <p className="text-zinc-400 text-sm uppercase tracking-tight">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border border-red-900/50 bg-red-950/10">
                    <p className="text-[10px] uppercase tracking-tight text-red-400">
                      <span className="font-bold">WARNING:</span> Never share your private key. Store it securely. The secret is shown only once!
                    </p>
                  </div>
                </div>
              </div>

              {/* Testnet Faucet */}
              <div id="testnet-faucet" className="space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Fund Testnet Wallet</h3>
                <div className="space-y-6">
                  <p className="text-zinc-400 text-sm leading-relaxed uppercase tracking-tight">
                    To trade on testnet, you need test USDC:
                  </p>
                  <div className="space-y-4">
                    {[
                      { step: "1", text: "Visit test-app.pacifica.fi/faucet (if available)" },
                      { step: "2", text: "Or request test USDC from Pacifica Discord" },
                      { step: "3", text: "Minimum $10 required to place orders" },
                      { step: "4", text: "Recommended: $50+ for testing multiple positions" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 items-center p-6 bg-zinc-950/20 border border-zinc-900">
                        <span style={{ color: blue }} className="text-2xl font-black">{item.step}</span>
                        <p className="text-zinc-400 text-sm uppercase tracking-tight">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 06. API Keys */}
            <section id="gemini-key" className="pb-24">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">06. API Keys</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* Gemini */}
              <div id="gemini-key" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Google Gemini AI Key</h3>
                <div className="space-y-6">
                  <p className="text-zinc-400 text-sm leading-relaxed uppercase tracking-tight">
                    Gemini 2.5 Flash provides AI trading reasoning:
                  </p>
                  <div className="space-y-4">
                    {[
                      { step: "1", text: "Visit https://aistudio.google.com/apikey" },
                      { step: "2", text: "Sign in with Google account" },
                      { step: "3", text: "Click 'Create API Key'" },
                      { step: "4", text: "Copy the key to agent/.env as GEMINI_API_KEY" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 items-center p-6 bg-zinc-950/20 border border-zinc-900">
                        <span style={{ color: blue }} className="text-2xl font-black">{item.step}</span>
                        <p className="text-zinc-400 text-sm uppercase tracking-tight">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Elfa AI */}
              <div id="elfa-key" className="space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Elfa AI Sentiment Key</h3>
                <div className="space-y-6">
                  <p className="text-zinc-400 text-sm leading-relaxed uppercase tracking-tight">
                    Elfa AI provides social sentiment analysis from Twitter/X:
                  </p>
                  <div className="space-y-4">
                    {[
                      { step: "1", text: "Visit https://elfa.ai or contact Elfa team" },
                      { step: "2", text: "Request API access for sentiment data" },
                      { step: "3", text: "Copy the API key to agent/.env as ELFA_API_KEY" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 items-center p-6 bg-zinc-950/20 border border-zinc-900">
                        <span style={{ color: blue }} className="text-2xl font-black">{item.step}</span>
                        <p className="text-zinc-400 text-sm uppercase tracking-tight">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 07. Running the System */}
            <section id="start-services" className="pb-24">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-white text-4xl font-black tracking-tight uppercase italic">07. Running the System</h2>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* Start Services */}
              <div id="start-services" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Start All Services</h3>
                <p className="text-zinc-500 text-sm uppercase tracking-tight">Run each service in a separate terminal:</p>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2"># Terminal 1: Backend API</p>
                    <pre className="bg-[#050a12] border border-[#1a2b3b] p-6 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`cd backend
npm start`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2"># Terminal 2: Frontend UI</p>
                    <pre className="bg-[#050a12] border border-[#1a2b3b] p-6 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`cd frontend
npm run dev`}
                    </pre>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2"># Terminal 3: Trading Agent</p>
                    <pre className="bg-[#050a12] border border-[#1a2b3b] p-6 text-zinc-300 text-sm font-mono leading-7 overflow-x-auto shadow-2xl">
{`cd agent
python main.py`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Onboarding */}
              <div id="onboarding" className="space-y-10 mb-16">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Complete Onboarding</h3>
                <div className="space-y-6">
                  <p className="text-zinc-400 text-sm leading-relaxed uppercase tracking-tight">
                    After starting all services, complete onboarding in the UI:
                  </p>
                  <div className="space-y-4">
                    {[
                      { step: "1", text: "Open frontend (http://localhost:5173)" },
                      { step: "2", text: "Connect wallet via Privy" },
                      { step: "3", text: "Enter your Pacifica wallet address" },
                      { step: "4", text: "Enter your Pacifica Agent private key (Secret)" },
                      { step: "5", text: "Optionally enter Pacifica API Key" },
                      { step: "6", text: "Click SAVE_AND_CONTINUE" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 items-center p-6 bg-zinc-950/20 border border-zinc-900">
                        <span style={{ color: blue }} className="text-2xl font-black">{item.step}</span>
                        <p className="text-zinc-400 text-sm uppercase tracking-tight">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trading Modes */}
              <div id="trading-modes" className="space-y-10">
                <h3 style={{ color: blue }} className="text-xl font-bold uppercase tracking-widest italic">Trading Modes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 border border-[#1a2b3b] bg-[#050a12]/30">
                    <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">DRY_RUN=true (Paper Trading)</h4>
                    <ul className="space-y-2 text-zinc-500 text-[10px] uppercase tracking-tight">
                      <li>✓ Simulates trades without real orders</li>
                      <li>✓ Logs all decisions to console</li>
                      <li>✓ Safe for testing strategy</li>
                      <li>✓ No funds at risk</li>
                    </ul>
                  </div>
                  <div className="p-6 border border-[#1a2b3b] bg-[#050a12]/30">
                    <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-4">DRY_RUN=false (Live Trading)</h4>
                    <ul className="space-y-2 text-zinc-500 text-[10px] uppercase tracking-tight">
                      <li>✓ Places real orders on Pacifica</li>
                      <li>✓ Uses actual wallet funds</li>
                      <li>✓ Full trading cycle active</li>
                      <li>⚠ Real money at risk</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 border border-[#00d1ff]/30 bg-[#00d1ff]/5">
                  <p className="text-[10px] uppercase tracking-tight text-zinc-400">
                    <span style={{ color: blue }} className="font-bold">TIP:</span> Start with DRY_RUN=true to verify your setup, then switch to false for live trading.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* Institutional Landing Footer */}
      <footer className="border-t border-[#1a2b3b] bg-black px-12 py-12 flex flex-col md:flex-row justify-between items-center gap-12 text-[12px] font-mono uppercase tracking-[0.3em] text-zinc-500">
        <div className="flex flex-col md:flex-row gap-12">
          <span className="cursor-default italic text-zinc-700">© 2026_PILOT_CORE</span>
          <a href="https://github.com/MayurK-cmd/Pacificia-Trading-Bot" target="_blank" rel="noreferrer" className="underline underline-offset-8 decoration-zinc-800 hover:text-white transition-colors font-bold">Github_Source</a>
          <button className="hover:text-white transition-colors text-zinc-600">Protocol_Status: {systemTime}</button>
        </div>
        <div className="flex gap-10 items-center">
          <div className="flex items-center gap-4 border border-zinc-900 px-6 py-3 bg-zinc-950/50 rounded-sm">
             <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: blue, boxShadow: `0 0 15px ${blue}` }}
             />
             <span className="text-zinc-300 font-black tracking-[0.1em]">SYSTEM_ENCRYPTION_ACTIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
