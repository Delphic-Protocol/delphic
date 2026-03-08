"use client";

import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";

const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const WSTETH_ATOKEN = "0x0B925eD163218f6662a35e0f0371Ac234f9E9371";
const USDC_DEBT_TOKEN = "0x72E95b8931767C79bA4EeE721354d6E99a61D004";

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const AAVE_POOL_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserAccountData",
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useAavePosition(marginAccount?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: WSTETH_ATOKEN,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: marginAccount ? [marginAccount] : undefined,
        chainId: 1, // Ethereum mainnet
      },
      {
        address: USDC_DEBT_TOKEN,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: marginAccount ? [marginAccount] : undefined,
        chainId: 1,
      },
      {
        address: AAVE_POOL,
        abi: AAVE_POOL_ABI,
        functionName: "getUserAccountData",
        args: marginAccount ? [marginAccount] : undefined,
        chainId: 1,
      },
    ],
    query: {
      enabled: !!marginAccount,
    },
  });

  const wstETHBalance = data?.[0]?.result
    ? formatUnits(data[0].result, 18)
    : "0";

  const usdcDebt = data?.[1]?.result
    ? formatUnits(data[1].result, 6)
    : "0";

  const healthFactor = data?.[2]?.result
    ? (Number(data[2].result[5]) / 1e18).toFixed(2)
    : "0";

  return {
    wstETHBalance,
    usdcDebt,
    healthFactor,
    isLoading,
    error,
    refetch,
  };
}
