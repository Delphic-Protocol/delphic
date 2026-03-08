"use client";

import { PolymarketEvent } from "@/lib/polymarket/types";

interface DateListTileProps {
  event: PolymarketEvent;
  onClick?: () => void;
}

export function DateListTile({ event, onClick }: DateListTileProps) {
  const formatVolume = (vol?: number | string) => {
    if (!vol) return "$0";
    const num = typeof vol === "string" ? parseFloat(vol) : vol;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  // Extract date from market question
  const extractDate = (question: string): string => {
    const dateMatch = question.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i);
    if (dateMatch) {
      const parts = dateMatch[0].split(" ");
      return `${parts[0].slice(0, 3)} ${parts[1]}`;
    }
    return question.slice(0, 15);
  };

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-all cursor-pointer"
    >
      {/* Header */}
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
        <h3 className="text-white font-medium text-sm leading-tight line-clamp-2 flex-1">
          {event.title}
        </h3>
      </div>

      {/* Date list items */}
      <div className="space-y-2 mb-3">
        {event.markets.slice(0, 2).map((market, idx) => {
          let outcomePrices: string[] = [];
          try {
            outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
          } catch (e) {}

          const yesPrice = outcomePrices[0] ? parseFloat(outcomePrices[0]) * 100 : 0;

          return (
            <div key={market.id} className="flex items-center justify-between">
              <span className="text-zinc-300 text-sm">{extractDate(market.question || "")}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{yesPrice.toFixed(0)}%</span>
                <button className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30 transition-colors">
                  Yes
                </button>
                <button className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 transition-colors">
                  No
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-[#2a2a2a]">
        <span>{formatVolume(event.volume)} Vol.</span>
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
