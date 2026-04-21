import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { InterwovenKitProvider, TESTNET, injectStyles } from "@initia/interwovenkit-react";
import InterwovenKitStyles from "@initia/interwovenkit-react/styles.js";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { default as App } from "./App";
import "./index.css";

// Create wagmi config - uses mainnet since Initia Wallet uses amino signing
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

const queryClient = new QueryClient();

function Root() {
  useEffect(() => {
    injectStyles(InterwovenKitStyles);
  }, []);

  return (
    <StrictMode>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <InterwovenKitProvider {...TESTNET} defaultChainId="initiation-2">
            <App />
          </InterwovenKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")).render(<Root />);
