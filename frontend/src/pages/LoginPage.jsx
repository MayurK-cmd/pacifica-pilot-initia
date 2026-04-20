import { useInterwovenKit } from "@initia/interwovenkit-react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const { openConnect, address } = useInterwovenKit();
  const PACIFICA_BLUE = "#00d1ff";

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-50 font-mono flex flex-col items-center justify-center p-8">
      <div className="max-w-sm w-full border border-[#1a2b3b] bg-zinc-900/20 p-10 shadow-2xl">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-4 h-4 rotate-45 border-2" style={{ borderColor: PACIFICA_BLUE }} />
          <span className="font-bold tracking-[0.3em] text-sm uppercase">PACIFICA_PILOT</span>
        </div>

        <h2 className="text-center text-xs uppercase tracking-[0.2em] text-zinc-500 mb-10 italic">
          // Authentication_Required
        </h2>

        <button
          onClick={() => openConnect()}
          className="w-full text-black py-4 font-bold uppercase tracking-widest text-xs transition-all active:scale-[0.98] mb-6 cursor-pointer hover:opacity-90 shadow-[0_0_25px_rgba(0,209,255,0.3)]"
          style={{ backgroundColor: PACIFICA_BLUE }}
        >
          {address ? "Wallet_Connected" : "Connect_Wallet"}
        </button>

        <p className="text-[10px] text-zinc-600 text-center leading-relaxed mb-8 uppercase tracking-tighter">
          Secure access via Initia InterwovenKit. By connecting, you agree to autonomous agent execution protocols.
        </p>

        <div className="border-t border-[#1a2b3b] pt-6 text-center">
          <Link to="/" className="text-[10px] text-zinc-500 hover:text-[#00d1ff] transition-colors uppercase tracking-widest underline underline-offset-4">
            ← Return_to_Landing
          </Link>
        </div>
      </div>

      <div className="mt-8 text-[9px] text-zinc-800 uppercase tracking-[0.5em]">
        System_Secured_AES-256
      </div>
    </div>
  );
}
