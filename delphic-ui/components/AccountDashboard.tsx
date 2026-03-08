"use client";

import { useAccount } from "wagmi";
import { useMarginAccount } from "@/hooks/useMarginAccount";
import { usePolymarketData } from "@/hooks/usePolymarketData";
import { usePolymarketPositions } from "@/hooks/usePolymarketPositions";
import { useAavePosition } from "@/hooks/useAavePosition";
import { useState } from "react";
import { PositionsTable } from "./PositionsTable";
import { DepositAndBridge } from "./DepositAndBridge";
import { RepayLoan } from "./RepayLoan";

export function AccountDashboard() {
  const { address } = useAccount();
  const { hasMarginAccount, marginAccountAddress } = useMarginAccount(address);
  const [activeTab, setActiveTab] = useState<"overview" | "positions">("overview");

  // Fetch Polymarket data
  const polymarketData = usePolymarketData(address);
  const positionsData = usePolymarketPositions(polymarketData.proxyWallet || undefined);

  // Fetch Aave position data using proxy wallet
  const aavePosition = useAavePosition(marginAccountAddress as `0x${string}` | undefined);

  if (!hasMarginAccount) {
    return null;
  }

  const collateral = aavePosition.wstETHBalance;
  const borrowed = aavePosition.usdcDebt;
  const healthFactor = aavePosition.healthFactor;

  const getHealthColor = (health: string) => {
    const healthNum = parseFloat(health);
    if (healthNum >= 2) return "text-green-400";
    if (healthNum >= 1.5) return "text-yellow-400";
    return "text-red-400";
  };

  const getHealthBgColor = (health: string) => {
    const healthNum = parseFloat(health);
    if (healthNum >= 2) return "bg-[#1a1a1a] border-green-500/20";
    if (healthNum >= 1.5) return "bg-[#1a1a1a] border-yellow-500/20";
    return "bg-[#1a1a1a] border-red-500/20";
  };

  return (
    <div className="space-y-4">

      <h2 className="text-2xl font-bold text-white">
        Account Dashboard
      </h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[#2a2a2a]">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "text-white border-b-2 border-[#ff1cf7]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("positions")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "positions"
              ? "text-white border-b-2 border-[#ff1cf7]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Polymarket Positions
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
              <p className="text-sm text-zinc-400 mb-1">
                Collateral (wstETH)
              </p>
              <p className="text-2xl font-bold text-white">
                {parseFloat(collateral).toFixed(4)}
              </p>
            </div>

            <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
              <p className="text-sm text-zinc-400 mb-1">
                Borrowed (USDC)
              </p>
              <p className="text-2xl font-bold text-white">
                {parseFloat(borrowed).toFixed(2)}
              </p>
            </div>

            <div className={`p-6 rounded-xl border ${getHealthBgColor(healthFactor)}`}>
              <p className="text-sm text-zinc-400 mb-1">
                Health Factor
              </p>
              <p className={`text-2xl font-bold ${getHealthColor(healthFactor)}`}>
                {healthFactor}
              </p>
              <p className="text-xs mt-2 text-zinc-400">
                {parseFloat(healthFactor) < 1.5 && "⚠️ Low health - consider repaying"}
                {parseFloat(healthFactor) >= 1.5 && parseFloat(healthFactor) < 2 && "Moderate health"}
                {parseFloat(healthFactor) >= 2 && "✓ Healthy position"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DepositAndBridge />
            <RepayLoan />
          </div>
        </>
      )}

      {activeTab === "positions" && (
        <PositionsTable
          positions={positionsData.positions}
          loading={positionsData.loading}
          error={positionsData.error}
        />
      )}
    </div>
  );
}
