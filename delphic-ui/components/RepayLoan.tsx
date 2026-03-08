"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useMarginAccount } from "@/hooks/useMarginAccount";
import { MarginAccountABI } from "@/lib/contracts/abis";
import { parseUnits } from "viem";

export function RepayLoan() {
  const { address } = useAccount();
  const { marginAccountAddress, hasMarginAccount } = useMarginAccount(address);
  const [repayAmount, setRepayAmount] = useState("");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRepay = () => {
    if (!marginAccountAddress || !repayAmount) return;

    try {
      const repayWei = parseUnits(repayAmount, 6); // USDC has 6 decimals

      writeContract({
        address: marginAccountAddress,
        abi: MarginAccountABI,
        functionName: "repayLoan",
        args: [repayWei],
      });
    } catch (err) {
      console.error("Error preparing transaction:", err);
    }
  };

  if (!hasMarginAccount) {
    return (
      <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
        <p className="text-sm text-zinc-400">
          Initialize a margin account first to repay loans.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
      <h3 className="text-lg font-semibold text-white mb-4">
        Repay Loan
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Repayment Amount (USDC)
          </label>
          <input
            type="number"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            placeholder="0.0"
            step="0.01"
            className="w-full px-4 py-3 border border-[#2a2a2a] rounded-xl bg-[#0a0a0a] text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff1cf7] transition-colors"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Repay your USDC loan to improve your health factor
          </p>
        </div>

        <button
          onClick={handleRepay}
          disabled={!repayAmount || isPending || isConfirming}
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#ff1cf7] rounded-xl hover:bg-[#e019db] disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#ff1cf7]/20"
        >
          {isPending || isConfirming ? "Processing..." : "Repay Loan"}
        </button>

        {isSuccess && (
          <p className="text-sm text-green-400">
            Loan repayment successful!
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400">
            Error: {error.message}
          </p>
        )}
      </div>
    </div>
  );
}
