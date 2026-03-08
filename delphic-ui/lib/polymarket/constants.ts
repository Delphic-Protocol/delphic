import { zeroAddress } from "viem";

// Polymarket Safe Factory constants
export const SAFE_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_SAFE_FACTORY_ADDRESS || "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b") as `0x${string}`;
export const SAFE_FACTORY_NAME = process.env.NEXT_PUBLIC_SAFE_FACTORY_NAME || "Polymarket Contract Proxy Factory";
export const POLYMARKET_RELAYER_URL = process.env.NEXT_PUBLIC_POLYMARKET_RELAYER_URL || "https://relayer-v2.polymarket.com";
export const POLYMARKET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_POLYMARKET_CHAIN_ID || "137") as 137;

// Typed data for creating a Safe
export const createSafeTypedData = {
  domain: {
    name: SAFE_FACTORY_NAME,
    chainId: POLYMARKET_CHAIN_ID,
    verifyingContract: SAFE_FACTORY_ADDRESS,
  },
  types: {
    CreateProxy: [
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "paymentReceiver", type: "address" },
    ],
  },
  primaryType: "CreateProxy" as const,
  message: {
    paymentToken: zeroAddress,
    payment: 0n,
    paymentReceiver: zeroAddress,
  },
};
