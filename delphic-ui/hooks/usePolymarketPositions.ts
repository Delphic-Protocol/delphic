"use client";

import { useState, useEffect } from "react";

interface Position {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon: string;
  eventId: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate: string;
  negativeRisk: boolean;
}

export function usePolymarketPositions(proxyWallet?: string) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proxyWallet) {
      setPositions([]);
      return;
    }

    const fetchPositions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://data-api.polymarket.com/positions?sizeThreshold=1&limit=100&sortBy=TOKENS&sortDirection=DESC&user=${proxyWallet}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch positions: ${response.statusText}`);
        }

        const data = await response.json();
        setPositions(data);
      } catch (err) {
        console.error("Error fetching positions:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch positions");
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [proxyWallet]);

  return { positions, loading, error };
}
