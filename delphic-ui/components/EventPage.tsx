"use client";

import { useState } from "react";
import { PolymarketEvent } from "@/lib/polymarket/types";
import { MarketModal } from "./MarketModal";

interface EventPageProps {
  event: PolymarketEvent;
  onBack: () => void;
}

export function EventPage({ event, onBack }: EventPageProps) {
  const [selectedMarket, setSelectedMarket] = useState(event.markets[0]);
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0);

  // Update selected market when index changes
  const handleMarketClick = (market: typeof event.markets[0]) => {
    setSelectedMarket(market);
  };

  const formatVolume = (vol?: number | string) => {
    if (!vol) return "$0";
    const num = typeof vol === "string" ? parseFloat(vol) : vol;
    if (num >= 1000000) return `$${(num / 1000000).toLocaleString()}`;
    if (num >= 1000) return `$${(num / 1000).toLocaleString()}`;
    return `$${num.toLocaleString()}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-white">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#1a1f2e]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <button
                onClick={onBack}
                className="text-zinc-400 hover:text-white transition-colors mt-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                {(event.icon || event.image) && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#2a2a2a] mb-3">
                    <img
                      src={event.icon || event.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
                {event.category && (
                  <div className="text-zinc-400 text-sm mb-1">
                    {event.category} · {event.subcategory || ""}
                  </div>
                )}
                <h1 className="text-3xl font-bold">{event.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
              <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <button className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Event metadata */}
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>{formatVolume(event.volume)} Vol.</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(event.endDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Markets list */}
          <div className="lg:col-span-2">
            <div className="space-y-3 mb-4">
              {event.markets.map((market, idx) => {
                let outcomePrices: string[] = [];

                try {
                  outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
                } catch (e) {}

                const yesPrice = outcomePrices[0] ? parseFloat(outcomePrices[0]) * 100 : 0;
                const noPrice = outcomePrices[1] ? parseFloat(outcomePrices[1]) * 100 : 0;
                const yesCost = outcomePrices[0] ? parseFloat(outcomePrices[0]) : 0;
                const noCost = outcomePrices[1] ? parseFloat(outcomePrices[1]) : 0;

                return (
                  <div
                    key={market.id}
                    onClick={() => handleMarketClick(market)}
                    className={`border rounded-xl px-6 py-4 transition-all cursor-pointer ${
                      selectedMarket?.id === market.id
                        ? "border-blue-500 bg-[#1a1a1a]"
                        : "border-[#2a2a2a] bg-transparent hover:bg-[#1a1a1a]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-6">
                      {/* Left: Flag + Title + Volume */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {market.image && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a2a2a] flex-shrink-0">
                            <img
                              src={market.image}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-base mb-1 truncate">{market.question}</h3>
                          <div className="text-sm text-zinc-400">
                            {formatVolume(market.volume)} Vol. <span className="text-zinc-600">•</span> <span className="text-green-400">Yes {yesPrice.toFixed(1)}¢ · {noPrice.toFixed(1)}¢</span>
                          </div>
                        </div>
                      </div>

                      {/* Center: Percentage */}
                      <div className="text-center flex-shrink-0">
                        <div className="text-3xl font-bold text-white">{yesPrice.toFixed(0)}%</div>
                        <div className="text-xs text-red-400">▼ 1%</div>
                      </div>

                      {/* Right: Buttons */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarketClick(market);
                            setSelectedOutcome(0);
                          }}
                          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          Buy Yes {(yesCost * 100).toFixed(1)}¢
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarketClick(market);
                            setSelectedOutcome(1);
                          }}
                          className="px-6 py-2.5 bg-red-900/50 hover:bg-red-900/70 text-red-300 rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          Buy No {(noCost * 100).toFixed(1)}¢
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View resolved */}
            <button className="text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-2">
              View resolved
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Trading panel - fixed on desktop */}
          <div className="lg:sticky lg:top-24 h-fit">
            {selectedMarket && (
              <MarketModal
                market={selectedMarket}
                eventTitle={event.title}
                eventIcon={event.icon || event.image}
                onClose={() => {}}
                embedded={true}
                initialSelectedOutcome={selectedOutcome}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
