import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useMemo } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useApi() {
  const { initiaAddress } = useInterwovenKit();

  async function request(method, path, body) {
    if (!initiaAddress) {
      throw new Error("Wallet not connected");
    }

    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${initiaAddress}`,
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
