import { http, createConfig } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [mainnet, polygon] as const,
  connectors: [
    injected({ target: "metaMask" }),
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
    }),
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL! || "https://eth.merkle.io/"),
    [polygon.id]: http("https://polygon-rpc.com"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
