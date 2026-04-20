import { useState } from "react";
import { useApi } from "../useApi";
import { useAccount } from "wagmi";

export default function OnboardingPage({ onDone }) {
  const api = useApi();
  const { address: initiaAddress } = useAccount();
  const [pacificaAddress, setPacificaAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const PACIFICA_BLUE = "#00d1ff";

  async function submit() {
    if (!pacificaAddress.trim()) { setError("Pacifica wallet address is required"); return; }
    if (!privateKey.trim()) { setError("Agent private key is required"); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/keys", {
        pacificaAddress: pacificaAddress.trim(),
        pacificaPrivateKey: privateKey.trim(),
        pacificaApiKey: apiKey.trim() || undefined,
        initiaAddress: initiaAddress || undefined,
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-300 font-mono p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full border border-[#1a2b3b] bg-zinc-900/10 p-8 md:p-12 shadow-2xl">
        <h2 className="text-white text-xl font-bold uppercase tracking-tighter mb-4 italic">Initialize_Account</h2>
        <p className="text-xs text-zinc-500 mb-10 leading-relaxed uppercase tracking-tight">
          Your keys are AES-256 encrypted before storage. They never leave the secure environment in plain text.
        </p>

        <div className="space-y-8">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Initia Wallet *</label>
            <input
              type="text"
              className="bg-transparent border border-[#1a2b3b] p-3 text-sm focus:border-[#00d1ff] outline-none transition-colors font-mono"
              placeholder={initiaAddress || "0x..."}
              value={initiaAddress || ""}
              disabled
            />
            <small className="text-[9px] text-zinc-600">Connected Initia address (read-only)</small>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Pacifica Wallet Address *</label>
            <input
              type="text"
              className="bg-transparent border border-[#1a2b3b] p-3 text-sm focus:border-[#00d1ff] outline-none transition-colors font-mono"
              placeholder="Base58 Public Key from Phantom"
              value={pacificaAddress}
              onChange={e => setPacificaAddress(e.target.value)}
            />
            <small className="text-[9px] text-zinc-600">Phantom address used on test-app.pacifica.fi</small>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Agent Private Key *</label>
            <input
              type="password"
              className="bg-transparent border border-[#1a2b3b] p-3 text-sm focus:border-[#00d1ff] outline-none transition-colors font-sans"
              placeholder="Secret from test-app.pacifica.fi/apikey"
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
            />
            <small className="text-[9px] text-zinc-600 italic">Generate at test-app.pacifica.fi/apikey — use the "Secret"</small>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500">Agent API Key (Optional)</label>
            <input
              type="text"
              className="bg-transparent border border-[#1a2b3b] p-3 text-sm focus:border-[#00d1ff] outline-none transition-colors"
              placeholder="API Key from Pacifica"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="mt-8 text-red-500 text-[10px] uppercase font-bold tracking-widest">Error: {error}</div>}

        <button 
          onClick={submit} 
          disabled={loading}
          className="mt-12 w-full text-black py-4 font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50 cursor-pointer"
          style={{ backgroundColor: PACIFICA_BLUE }}
        >
          {loading ? "SAVING_ENCRYPTED_KEYS..." : "SAVE_AND_CONTINUE"}
        </button>
      </div>
    </div>
  );
}