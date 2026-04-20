import { useAccount, useSignMessage } from "wagmi";
import { useMemo } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useApi() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const signAndRequest = async (message) => {
    try {
      const signature = await signMessageAsync({ message });
      return { signature, address };
    } catch (error) {
      console.error("Failed to sign message:", error);
      throw new Error("Signature required for authentication");
    }
  };

  async function request(method, path, body) {
    const { signature, address } = await signAndRequest(
      `Sign in to PacificaPilot\n\nAddress: ${address}\nNonce: pending`
    );

    // First get the nonce
    const nonceRes = await fetch(`${API}/api/auth/nonce?address=${address}`);
    const { nonce } = await nonceRes.json();

    // Sign with the actual nonce
    const actualSignature = await signMessageAsync({
      message: `Sign in to PacificaPilot\n\nAddress: ${address}\nNonce: ${nonce}`
    });

    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${address}`,
        "x-signature": actualSignature,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  return useMemo(() => ({
    get:    (path)        => request("GET",   path),
    post:   (path, body)  => request("POST",  path, body),
    patch:  (path, body)  => request("PATCH", path, body),
  }), []);
}
