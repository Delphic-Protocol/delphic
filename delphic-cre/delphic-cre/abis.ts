import { parseAbi } from "viem";

export const POSITION_MANAGER_ABI = parseAbi([
  "function getOrderQueue() view returns (bytes32[])",
  "function getOrderPositionId(bytes32 orderHash) view returns (uint256)",
  "function getPositionOwner(uint256 positionId) view returns (address)",
]);

export const GNOSIS_SAFE_ABI = parseAbi([
  "function getOwners() view returns (address[])",
]);

export const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
]);

export const FACTORY_ABI = parseAbi([
  "function getMarginAccount(address user) view returns (address)",
]);
