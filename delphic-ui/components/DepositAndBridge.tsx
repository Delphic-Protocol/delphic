"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useMarginAccount } from "@/hooks/useMarginAccount";
import { usePolymarketData } from "@/hooks/usePolymarketData";
import { MarginAccountABI } from "@/lib/contracts/abis";
import { contracts } from "@/lib/contracts/config";
import { parseUnits, formatUnits, parseEther } from "viem";

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function DepositAndBridge() {
  const { address } = useAccount();
  const { marginAccountAddress, hasMarginAccount } = useMarginAccount(address);
  const { proxyWallet } = usePolymarketData(address);
  const [depositAmount, setDepositAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");

  // Separate hooks for approve and deposit transactions
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending
  } = useWriteContract();

  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    error
  } = useWriteContract();

  const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isDepositConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Fetch wstETH balance
  const { data: wstETHBalance } = useReadContract({
    address: contracts.wstETH.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const formattedBalance = wstETHBalance ? formatUnits(wstETHBalance, 18) : "0";

  const handleApprove = () => {
    if (!marginAccountAddress || !depositAmount) return;

    try {
      const depositWei = parseUnits(depositAmount, 18);

      writeApprove({
        address: contracts.wstETH.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [marginAccountAddress, depositWei],
      });
    } catch (err) {
      console.error("Error approving:", err);
    }
  };

  const handleDeposit = () => {
    if (!marginAccountAddress || !depositAmount || !borrowAmount || !proxyWallet) return;

    try {
      const depositWei = parseUnits(depositAmount, 18);
      const borrowWei = parseUnits(borrowAmount, 6); // USDC has 6 decimals

      writeDeposit({
        address: marginAccountAddress,
        abi: MarginAccountABI,
        functionName: "depositBorrowAndBridge",
        args: [contracts.wstETH.address, depositWei, borrowWei, proxyWallet as `0x${string}`],
        value: "300000000000000"
      });
    } catch (err) {
      console.error("Error preparing transaction:", err);
    }
  };

  if (!hasMarginAccount) {
    return (
      <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
        <p className="text-sm text-zinc-400">
          Initialize a margin account first to deposit funds.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
      <h3 className="text-lg font-semibold text-white mb-4">
        Deposit to Polymarket
      </h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-zinc-300">
              Deposit Amount (wstETH)
            </label>
            <span className="text-xs text-zinc-400">
              Balance: {parseFloat(formattedBalance).toFixed(4)} wstETH
            </span>
          </div>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.0"
            step="0.01"
            className="w-full px-4 py-3 border border-[#2a2a2a] rounded-xl bg-[#0a0a0a] text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff1cf7] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Borrow Amount (USDC)
          </label>
          <input
            type="number"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="0.0"
            step="0.01"
            className="w-full px-4 py-3 border border-[#2a2a2a] rounded-xl bg-[#0a0a0a] text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff1cf7] transition-colors"
          />
          <p className="mt-1 text-xs text-zinc-500">
            This USDC will be borrowed against your collateral and bridged to Polymarket
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleApprove}
            disabled={!depositAmount || isApprovePending || isApproveConfirming}
            className="px-4 py-3 text-sm font-semibold text-white bg-zinc-700 rounded-xl hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed transition-all"
          >
            {isApprovePending || isApproveConfirming ? "Approving..." : "1. Approve"}
          </button>
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || !borrowAmount || !proxyWallet || isDepositPending || isDepositConfirming}
            className="px-4 py-3 text-sm font-semibold text-white bg-[#ff1cf7] rounded-xl hover:bg-[#e019db] disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#ff1cf7]/20"
          >
            {isDepositPending || isDepositConfirming ? "Processing..." : "2. Deposit & Bridge"}
          </button>
        </div>

        {isSuccess && (
          <p className="text-sm text-green-400">
            Successfully deposited and bridged to Polymarket!
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


