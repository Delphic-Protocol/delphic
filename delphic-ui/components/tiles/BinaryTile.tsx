"use client";

import { PolymarketEvent } from "@/lib/polymarket/types";

interface BinaryTileProps {
  event: PolymarketEvent;
  onClick?: () => void;
}

export function BinaryTile({ event, onClick }: BinaryTileProps) {
  const market = event.markets[0];

  // Parse outcomes and prices
  let outcomes: string[] = [];
  let outcomePrices: string[] = [];

  try {
    outcomes = market?.outcomes ? JSON.parse(market.outcomes) : [];
    outcomePrices = market?.outcomePrices ? JSON.parse(market.outcomePrices) : [];
  } catch (e) {
    console.error("Error parsing market data:", e);
  }

  const formatVolume = (vol?: number | string) => {
    if (!vol) return "$0";
    const num = typeof vol === "string" ? parseFloat(vol) : vol;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const yesPrice = outcomePrices[0] ? parseFloat(outcomePrices[0]) * 100 : 0;
  const noPrice = outcomePrices[1] ? parseFloat(outcomePrices[1]) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-all cursor-pointer"
    >
      {/* Header with icon and title */}
      <div className="flex items-start gap-3 mb-4">
        {(event.icon || event.image) && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-[#2a2a2a]">
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
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm leading-tight line-clamp-2">
            {event.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-zinc-400 text-xs">
              {yesPrice.toFixed(0)}%
            </span>
            <span className="text-zinc-500 text-xs">chance</span>
          </div>
        </div>
      </div>

      {/* Yes/No buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button className="px-4 py-3 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 transition-colors">
          Yes
        </button>
        <button className="px-4 py-3 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 transition-colors">
          No
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>{formatVolume(event.volume)} Vol.</span>
          {event.volume24hr && (
            <>
              <span className="text-zinc-600">•</span>
              <span>Monthly</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button className="hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
