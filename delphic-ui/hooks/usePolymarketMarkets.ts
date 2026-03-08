"use client";

import { useState, useEffect } from "react";
import { PolymarketEvent } from "@/lib/polymarket/types";

interface UsePolymarketMarketsResult {
  markets: PolymarketEvent[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function usePolymarketMarkets(
  initialLimit: number = 16
): UsePolymarketMarketsResult {
  const [markets, setMarkets] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchMarkets = async (currentOffset: number, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/polymarket/events?limit=${initialLimit}&offset=${currentOffset}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();

      if (append) {
        setMarkets((prev) => [...prev, ...data]);
      } else {
        setMarkets(data);
      }

      // If we received fewer events than requested, we've reached the end
      setHasMore(data.length === initialLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const newOffset = offset + initialLimit;
      setOffset(newOffset);
      fetchMarkets(newOffset, true);
    }
  };

  const refresh = () => {
    setOffset(0);
    setHasMore(true);
    fetchMarkets(0, false);
  };

  useEffect(() => {
    fetchMarkets(0, false);
  }, []);

  return {
    markets,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
