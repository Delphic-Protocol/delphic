"use client";

import { useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useMarginAccount } from "@/hooks/useMarginAccount";
import { MarginAccountFactoryABI } from "@/lib/contracts/abis";
import { contracts } from "@/lib/contracts/config";
import { toast } from "sonner";

export function InitializeMarginAccount() {
  const { address } = useAccount();
  const { hasMarginAccount, isLoading: isCheckingAccount, refetch } = useMarginAccount(address);
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: isConfirmError } = useWaitForTransactionReceipt({
    hash,
  });

  const handleInitialize = () => {
    if (!address) return;

    writeContract({
      address: contracts.marginAccountFactory.address,
      abi: MarginAccountFactoryABI,
      functionName: "initializeMarginAccount",
      args: [address],
    });
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Margin account initialized successfully!", {
        description: "Your account is now ready to use.",
      });
      refetch();
    }
  }, [isSuccess, refetch]);

  useEffect(() => {
    if (writeError) {
      toast.error("Failed to initialize margin account", {
        description: writeError.message,
      });
    }
  }, [writeError]);

  useEffect(() => {
    if (isConfirmError) {
      toast.error("Transaction failed", {
        description: "The transaction was rejected or failed to confirm.",
      });
    }
  }, [isConfirmError]);

  if (isCheckingAccount) {
    return (
      <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
        <p className="text-sm text-zinc-400">Checking account status...</p>
      </div>
    );
  }

  if (hasMarginAccount) {
    return (
      <div className="p-6 bg-[#1a1a1a] rounded-xl border border-green-500/20">
        <h3 className="text-lg font-semibold text-white mb-2">
          Margin Account Active
        </h3>
        <p className="text-sm text-green-400">
          Your margin account has been initialized and is ready to use.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
      <h3 className="text-lg font-semibold text-white mb-2">
        Initialize Margin Account
      </h3>
      <p className="text-sm text-zinc-400 mb-4">
        Create a margin account to start depositing yield tokens and funding your Polymarket positions.
      </p>
      <button
        onClick={handleInitialize}
        disabled={!address || isPending || isConfirming}
        className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#ff1cf7] rounded-xl hover:bg-[#e019db] disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#ff1cf7]/20"
      >
        {isPending || isConfirming ? "Initializing..." : "Initialize Margin Account"}
      </button>
    </div>
  );
}
