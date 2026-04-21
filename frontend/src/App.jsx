import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useApi } from "./useApi";

// Pages
import LandingPage from "./pages/LandingPage";
import DocsPage from "./pages/DocsPage";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { address, isConnected, openConnect } = useInterwovenKit();
  const api = useApi();
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    // Only sync if we have a user and are authenticated
    if (!isConnected || !address) {
      setOnboarded(null);
      return;
    }

    api.post("/api/auth/sync", {
      walletAddress: address || null
    })
      .then(data => setOnboarded(data.onboarded))
      .catch(() => setOnboarded(false));
  }, [isConnected, address, api]);

  if (!isConnected && address === undefined) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-zinc-500 uppercase tracking-widest">
      Initialising_System_Core...
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />

        {/* Login Route: If already connected, go to dashboard */}
        <Route
          path="/login"
          element={isConnected ? <Navigate to="/dashboard" /> : <LoginPage />}
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            !isConnected ? <Navigate to="/login" /> :
            onboarded === null ? (
              <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-zinc-500">SYNCING_STATE...</div>
            ) : !onboarded ? (
              <OnboardingPage onDone={() => setOnboarded(true)} />
            ) : (
              <Dashboard user={{ wallet: { address } }} onLogout={() => {}} />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
