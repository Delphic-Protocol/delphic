"use client";

import { PolymarketEvent } from "@/lib/polymarket/types";

interface CryptoTileProps {
  event: PolymarketEvent;
  onClick?: () => void;
}

export function CryptoTile({ event, onClick }: CryptoTileProps) {
  const market = event.markets[0];

  let outcomes: string[] = [];
  let outcomePrices: string[] = [];

  try {
    outcomes = market?.outcomes ? JSON.parse(market.outcomes) : ["Up", "Down"];
    outcomePrices = market?.outcomePrices ? JSON.parse(market.outcomePrices) : [];
  } catch (e) {
    console.error("Error parsing market data:", e);
  }

  const upPrice = outcomePrices[0] ? parseFloat(outcomePrices[0]) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#3a3a3a] transition-all cursor-pointer relative overflow-hidden"
    >
      {/* Bitcoin icon */}
      <div className="absolute top-4 left-4 w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z"/>
        </svg>
      </div>

      {/* Header */}
      <div className="pl-16 mb-2">
        <h3 className="text-white font-bold text-base">{event.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-green-400 text-lg font-bold">{upPrice.toFixed(0)}%</span>
          <span className="text-zinc-500 text-sm">Up</span>
        </div>
      </div>

      {/* Up/Down buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button className="px-4 py-3 bg-green-500/20 text-green-400 rounded-lg font-bold hover:bg-green-500/30 transition-colors">
          Up
        </button>
        <button className="px-4 py-3 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 transition-colors">
          Down
        </button>
      </div>

      {/* Live indicator */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-red-400 font-bold">LIVE</span>
        </div>
        <button className="text-zinc-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
