"use client";

import { useState } from "react";
import { useAccount, useSignTypedData, useSwitchChain, useChainId } from "wagmi";
import { createSafeTypedData, POLYMARKET_CHAIN_ID } from "@/lib/polymarket/constants";

interface RegistrationModalProps {
  show: boolean;
  onClose: () => void;
}

export function RegistrationModal({ show, onClose }: RegistrationModalProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChain } = useSwitchChain();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isOnPolygon = chainId === POLYMARKET_CHAIN_ID;

  const handleSwitchNetwork = async () => {
    try {
      setLoading(true);
      setError(null);
      await switchChain({ chainId: POLYMARKET_CHAIN_ID });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch network");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    if (!isOnPolygon) {
      setError("Please switch to Polygon network first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Sign typed data
      const signature = await new Promise<string>((resolve, reject) => {
        signTypedDataAsync(
          {
            domain: createSafeTypedData.domain,
            types: createSafeTypedData.types,
            primaryType: createSafeTypedData.primaryType,
            message: createSafeTypedData.message,
          },
          {
            onSuccess: (data) => resolve(data),
            onError: (error) => reject(error),
          }
        );
      });

      // Step 2: Send signature to API
      const response = await fetch("/api/polymarket/create-safe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address, signature }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create account");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.reload(); // Refresh to fetch new account data
      }, 2000);
    } catch (err) {
      let errorMessage = "Failed to create account";

      if (err instanceof Error) {
        // Check if it's a chain mismatch error
        if (err.message.includes('chainId') || err.message.includes('137') || err.message.includes('"1"')) {
          errorMessage = "Please switch your wallet to Polygon network (Chain ID 137) to create a Polymarket account.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ff1cf7]/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#ff1cf7]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Setup Polymarket Account
          </h3>
          <p className="text-zinc-400 mb-6">
            Create a Polymarket proxy wallet to start trading prediction markets. This will enable you to deposit funds and manage positions.
          </p>

          {!isOnPolygon && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm mb-2">
                ⚠️ You need to be on Polygon network (Chain ID 137) to create a Polymarket account.
              </p>
              <button
                onClick={handleSwitchNetwork}
                disabled={loading}
                className="w-full px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? "Switching..." : "Switch to Polygon"}
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm">Account created successfully!</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading || success}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAccount}
              disabled={loading || success || !isOnPolygon}
              className="flex-1 px-4 py-2 bg-[#ff1cf7] hover:bg-[#e019db] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : success ? "Created!" : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
