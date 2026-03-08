"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { WalletConnect } from "@/components/WalletConnect";
import { InitializeMarginAccount } from "@/components/InitializeMarginAccount";
import { AccountDashboard } from "@/components/AccountDashboard";
import { DepositAndBridge } from "@/components/DepositAndBridge";
import { RepayLoan } from "@/components/RepayLoan";
import { NetworkGuard } from "@/components/NetworkGuard";
import { RegistrationModal } from "@/components/RegistrationModal";
import { MarketList } from "@/components/MarketList";
import { useMarginAccount } from "@/hooks/useMarginAccount";
import { usePolymarketData } from "@/hooks/usePolymarketData";

type TabType = "markets" | "account";

export function HomePage() {
  const { address, isConnected } = useAccount();
  const { hasMarginAccount } = useMarginAccount(address);
  const polymarketData = usePolymarketData(address);
  const [activeTab, setActiveTab] = useState<TabType>("markets");

  // Show registration modal when user is not found on Polymarket
  const showRegistrationModal = polymarketData.userNotFound;

  return (
    <div className="min-h-screen bg-[#1a1f2e] relative overflow-hidden">

      <header className="border-b border-[#2a2a2a] bg-[#0a0a0a]/80 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-white">
                Delphic
              </h1>
              {isConnected && (
                <nav className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("markets")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "markets"
                        ? "bg-blue-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    Markets
                  </button>
                  <button
                    onClick={() => setActiveTab("account")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "account"
                        ? "bg-blue-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-[#1a1a1a]"
                    }`}
                  >
                    Account
                  </button>
                </nav>
              )}
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <NetworkGuard>
          {!isConnected ? (
            <div className="text-center py-20">
              <h2 className="text-5xl font-bold text-white mb-4">
                Fund Polymarket with yield tokens
              </h2>
              <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
                Deposit yield-generating tokens like wstETH to borrow USDC and fund your Polymarket account
              </p>
              <div className="mt-8">
                <WalletConnect />
              </div>
            </div>
          ) : showRegistrationModal && !polymarketData.loading ? (
            <RegistrationModal
              show={showRegistrationModal}
              onClose={() => {
                // Reload to re-check after modal close
                window.location.reload();
              }}
            />
          ) : (
            <div className="space-y-8">
              {activeTab === "markets" ? (
                <MarketList />
              ) : (
                <>
                  {!hasMarginAccount ? (
                    <div className="max-w-2xl mx-auto">
                      <InitializeMarginAccount />
                    </div>
                  ) : (
                    <AccountDashboard />
                  )}
                </>
              )}
            </div>
          )}
        </NetworkGuard>
      </main>
    </div>
  );
}

export default HomePage;
