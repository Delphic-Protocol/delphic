"use client";

import { PolymarketEvent } from "@/lib/polymarket/types";

interface MultiCandidateTileProps {
  event: PolymarketEvent;
  onClick?: () => void;
}

export function MultiCandidateTile({ event, onClick }: MultiCandidateTileProps) {
  const formatVolume = (vol?: number | string) => {
    if (!vol) return "$0";
    const num = typeof vol === "string" ? parseFloat(vol) : vol;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  // Extract candidate name from question
  const extractCandidate = (question: string): string => {
    // Try to get the main entity from the question
    return question.split("?")[0].trim().slice(0, 30);
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

      {/* Candidate list */}
      <div className="space-y-2 mb-3">
        {event.markets.slice(0, 2).map((market, idx) => {
          let outcomePrices: string[] = [];
          try {
            outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
          } catch (e) {}

          const yesPrice = outcomePrices[0] ? parseFloat(outcomePrices[0]) * 100 : 0;

          return (
            <div key={market.id} className="flex items-center justify-between">
              <span className="text-zinc-300 text-sm truncate flex-1">
                {extractCandidate(market.question || "")}
              </span>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-white font-medium text-sm">{yesPrice.toFixed(0)}%</span>
                <div className="flex gap-1">
                  <button className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30 transition-colors">
                    Yes
                  </button>
                  <button className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 transition-colors">
                    No
                  </button>
                </div>
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
