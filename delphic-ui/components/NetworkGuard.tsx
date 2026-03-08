"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";
import { usePolymarketData } from "@/hooks/usePolymarketData";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { chain, isConnected, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const { userNotFound, loading } = usePolymarketData(address);

  if (!isConnected) {
    return <>{children}</>;
  }

  // If user doesn't have Polymarket account yet, allow any network
  // (they need Polygon to create account, but we don't want to force it)
  if (userNotFound || loading) {
    return <>{children}</>;
  }

  // If user has Polymarket account, enforce Ethereum Mainnet
  const isWrongNetwork = chain?.id !== mainnet.id;

  /**
   * 
   *   if (isWrongNetwork) {
    return (
      <div className="max-w-2xl mx-auto mt-20">
        <div className="p-8 bg-[#1a1a1a] rounded-xl border border-red-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">Wrong Network</h2>
          <p className="text-zinc-400 mb-6">
            This application only works on Ethereum Mainnet. Please switch your network to continue.
          </p>
          <button
            onClick={() => switchChain({ chainId: mainnet.id })}
            className="w-full px-6 py-3 text-sm font-semibold text-white bg-[#ff1cf7] rounded-xl hover:bg-[#e019db] transition-all shadow-lg shadow-[#ff1cf7]/20"
          >
            Switch to Ethereum Mainnet
          </button>
          <p className="text-xs text-zinc-500 mt-4 text-center">
            Current network: {chain?.name || "Unknown"}
          </p>
        </div>
      </div>
    );
  }

   */
  
  return <>{children}</>;
}
