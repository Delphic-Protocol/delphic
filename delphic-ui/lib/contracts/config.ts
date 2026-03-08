export const contracts = {
  marginAccountFactory: {
    address: (process.env.NEXT_PUBLIC_MARGIN_ACCOUNT_FACTORY_ADDRESS || "0x") as `0x${string}`,
  },
  wstETH: {
    address: (process.env.NEXT_PUBLIC_WSTETH_ADDRESS || "0x") as `0x${string}`,
  },
} as const;

export const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "1");
