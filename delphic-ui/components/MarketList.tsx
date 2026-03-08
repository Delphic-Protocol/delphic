"use client";

import { useState } from "react";
import { usePolymarketMarkets } from "@/hooks/usePolymarketMarkets";
import { MarketCard } from "./MarketCard";
import { MarketModal } from "./MarketModal";
import { EventPage } from "./EventPage";
import { PolymarketEvent } from "@/lib/polymarket/types";

export function MarketList() {
  const { markets, loading, error, hasMore, loadMore } = usePolymarketMarkets(16);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketEvent | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "event">("list");

  const handleMarketClick = (market: PolymarketEvent) => {
    setSelectedMarket(market);
    // If multiple markets, go to event page; otherwise show modal
    if (market.markets && market.markets.length > 1) {
      setViewMode("event");
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedMarket(null);
  };

  // Show event detail page
  if (viewMode === "event" && selectedMarket) {
    return <EventPage event={selectedMarket} onBack={handleBackToList} />;
  }

  if (loading && markets.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-6">All markets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 h-48 animate-pulse"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-[#2a2a2a] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
                  <div className="h-4 bg-[#2a2a2a] rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="h-8 bg-[#2a2a2a] rounded" />
                <div className="h-8 bg-[#2a2a2a] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[#1a1a1a] rounded-xl border border-red-500/20">
        <p className="text-red-400">Error loading markets: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">All markets</h2>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all">
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <button className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all">
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
          <button className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all">
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Category tabs - matching the screenshot */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium whitespace-nowrap">
          All
        </button>
        {[
          "Trump",
          "Iran",
          "Oscars",
          "Oil",
          "Lebanon",
          "Colombia Election",
          "Tweet Markets",
          "Tariffs",
          "Global Elections",
          "Nepal Election",
          "Midterms",
          "Primaries",
        ].map((category) => (
          <button
            key={category}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-300 text-sm font-medium hover:border-[#3a3a3a] transition-all whitespace-nowrap"
          >
            {category}
          </button>
        ))}
      </div>

      {/* Market grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {markets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            onClick={() => handleMarketClick(market)}
          />
        ))}
      </div>

      {/* Market modal - only for single-market events */}
      {selectedMarket && selectedMarket.markets.length === 1 && (
        <MarketModal
          market={selectedMarket.markets[0]}
          eventTitle={selectedMarket.title}
          eventIcon={selectedMarket.icon || selectedMarket.image}
          onClose={() => setSelectedMarket(null)}
        />
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl hover:border-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {!hasMore && markets.length > 0 && (
        <p className="text-center text-zinc-500 text-sm py-4">
          No more markets to load
        </p>
      )}
    </div>
  );
}
