import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InterwovenKitProvider, TESTNET, injectStyles } from "@initia/interwovenkit-react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { initia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { default as App } from "./App";
import "./index.css";

// Inject InterwovenKit styles
injectStyles();

// Create wagmi config for Initia testnet
const config = createConfig({
  chains: [initia],
  transports: {
    [initia.id]: http(),
  },
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <InterwovenKitProvider {...TESTNET}>
          <App />
        </InterwovenKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
