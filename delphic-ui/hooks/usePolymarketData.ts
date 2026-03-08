import { useState, useEffect } from "react";

// Types for Polymarket API responses
export interface PolymarketPosition {
  id: string;
  market: {
    question: string;
    image?: string;
  };
  outcome: string;
  size: number;
  value: number;
  pnl?: number;
}

export interface PolymarketEvent {
  id: string;
  timestamp: string;
  type: "trade" | "deposit" | "withdraw";
  market?: {
    question: string;
  };
  outcome?: string;
  size?: number;
  value: number;
}

interface UsePolymarketDataReturn {
  proxyWallet: string | null;
  positions: PolymarketPosition[];
  history: PolymarketEvent[];
  loading: boolean;
  error: string | null;
  userNotFound: boolean;
}

export function usePolymarketData(
  userAddress: `0x${string}` | undefined
): UsePolymarketDataReturn {
  const [proxyWallet, setProxyWallet] = useState<string | null>(null);
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [history, setHistory] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userNotFound, setUserNotFound] = useState(false);

  // Fetch proxy wallet on mount
  useEffect(() => {
    async function fetchProxyWallet() {
      if (!userAddress) return;

      try {
        const response = await fetch(
          `/api/polymarket/users?address=${userAddress}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch proxy wallet");
        }

        const data = await response.json();

        // Check if user exists
        if (!data.user) {
          setUserNotFound(true);
          setLoading(false);
          return;
        }

        setProxyWallet(data.user.proxyWallet);
      } catch (err) {
        console.error("Error fetching proxy wallet:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch proxy wallet");
        setLoading(false);
      }
    }

    fetchProxyWallet();
  }, [userAddress]);

  // Fetch positions when proxy wallet is available
  useEffect(() => {
    async function fetchPositions() {
      if (!proxyWallet) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/polymarket/positions?user=${proxyWallet}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch positions");
        }

        const data = await response.json();
        setPositions(data);

        // Also fetch history/events
        const historyResponse = await fetch(
          `/api/polymarket/events?user=${proxyWallet}`
        );

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setHistory(historyData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch positions");
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, [proxyWallet]);

  return {
    proxyWallet,
    positions,
    history,
    loading,
    error,
    userNotFound,
  };
}
