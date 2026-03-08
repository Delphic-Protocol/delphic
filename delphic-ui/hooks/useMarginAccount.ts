import { useReadContract } from "wagmi";
import { MarginAccountFactoryABI } from "@/lib/contracts/abis";
import { contracts } from "@/lib/contracts/config";

export function useMarginAccount(address: `0x${string}` | undefined) {
  const { data: marginAccountAddress, isLoading, refetch } = useReadContract({
    address: contracts.marginAccountFactory.address,
    abi: MarginAccountFactoryABI,
    functionName: "getMarginAccount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const hasMarginAccount = marginAccountAddress && marginAccountAddress !== "0x0000000000000000000000000000000000000000";

  return {
    marginAccountAddress: hasMarginAccount ? marginAccountAddress : undefined,
    hasMarginAccount,
    isLoading,
    refetch,
  };
}
