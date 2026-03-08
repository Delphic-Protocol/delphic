"use client";

import { PolymarketEvent } from "@/lib/polymarket/types";

interface SportsTileProps {
  event: PolymarketEvent;
  onClick?: () => void;
}

export function SportsTile({ event, onClick }: SportsTileProps) {
  const market = event.markets[0];

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

  // Get team colors based on index
  const getTeamColor = (idx: number) => {
    const colors = [
      "bg-orange-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-red-500",
    ];
    return colors[idx % colors.length];
  };

  const getTeamTextColor = (idx: number) => {
    const colors = [
      "text-orange-400",
      "text-blue-400",
      "text-purple-400",
      "text-red-400",
    ];
    return colors[idx % colors.length];
  };

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-all cursor-pointer"
    >
      {/* Teams list */}
      <div className="space-y-2 mb-4">
        {outcomes.slice(0, 2).map((outcome, idx) => {
          const price = outcomePrices[idx] ? parseFloat(outcomePrices[idx]) * 100 : 0;
          const teamColor = getTeamColor(idx);
          const textColor = getTeamTextColor(idx);

          return (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 ${teamColor} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
                  {outcome.slice(0, 3).toUpperCase()}
                </div>
                <span className="text-white text-sm font-medium">{outcome}</span>
              </div>
              <span className="text-white font-bold text-lg">{price.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>

      {/* Team buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {outcomes.slice(0, 2).map((outcome, idx) => {
          const textColor = getTeamTextColor(idx);
          const bgColor = idx === 0 ? "bg-orange-500/20 hover:bg-orange-500/30" : "bg-blue-500/20 hover:bg-blue-500/30";

          return (
            <button
              key={idx}
              className={`px-3 py-2 ${bgColor} ${textColor} rounded-lg font-bold transition-colors text-sm`}
            >
              {outcome}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          {event.live && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-bold">
                {event.period || "Q4"} - {event.elapsed || "04:43"}
              </span>
            </>
          )}
          <span>{formatVolume(event.volume)} Vol.</span>
          <span>NBA</span>
        </div>
        <button className="hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
