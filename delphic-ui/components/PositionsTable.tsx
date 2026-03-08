"use client";

import { useState } from "react";

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

interface PositionsTableProps {
  positions: Position[];
  loading: boolean;
  error: string | null;
}

export function PositionsTable({ positions, loading, error }: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter positions based on tab and search
  const filteredPositions = positions.filter((position) => {
    const matchesSearch = position.title.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = position.size > 0;

    if (activeTab === "active") {
      return isActive && matchesSearch;
    } else {
      return !isActive && matchesSearch;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-400">Loading positions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
        <p className="text-red-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
              activeTab === "active"
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-400"
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab("closed")}
            className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
              activeTab === "closed"
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-400"
            }`}
          >
            Activity
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "active"
                ? "bg-white text-black"
                : "bg-[#2a2a2a] text-zinc-400 hover:bg-[#3a3a3a]"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("closed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "closed"
                ? "bg-white text-black"
                : "bg-[#2a2a2a] text-zinc-400 hover:bg-[#3a3a3a]"
            }`}
          >
            Closed
          </button>
        </div>

        <div className="flex-1 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2">
          <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search positions"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none"
          />
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-zinc-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          </svg>
          Value
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#2a2a2a]">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Market ◇
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                AVG ◇
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Current
              </th>
              <th className="text-right px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Value ◇
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPositions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-zinc-400">
                  No {activeTab} positions found
                </td>
              </tr>
            ) : (
              filteredPositions.map((position) => (
                <tr key={position.asset} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a2a2a] flex-shrink-0">
                        {position.icon && (
                          <img
                            src={position.icon}
                            alt={position.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium mb-1">{position.title}</p>
                        <p className="text-sm text-green-400">
                          {position.outcome} {position.curPrice.toFixed(1)}¢{" "}
                          <span className="text-zinc-500">{position.size.toFixed(1)} shares</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-white">{(position.avgPrice * 100).toFixed(1)}¢</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-white">{(position.curPrice * 100).toFixed(1)}¢</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div>
                      <p className="text-white font-medium mb-1">${position.currentValue.toFixed(2)}</p>
                      <p className={`text-sm ${position.cashPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {position.cashPnl >= 0 ? "+" : ""}${position.cashPnl.toFixed(2)} ({position.percentPnl >= 0 ? "+" : ""}{position.percentPnl.toFixed(2)}%)
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
                      <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
