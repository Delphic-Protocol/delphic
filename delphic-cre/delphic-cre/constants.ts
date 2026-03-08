import { EVMClient } from "@chainlink/cre-sdk";

// Chain selectors

export const POLYGON_CHAIN_SELECTOR =
  EVMClient.SUPPORTED_CHAIN_SELECTORS["polygon-mainnet"];
export const ETHEREUM_CHAIN_SELECTOR =
  EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-mainnet"];

// Contract addresses — Polygon mainnet

export const POSITION_MANAGER = "0xcD3B779C8d8FBfb41520E63643EB100559032db1";
export const SETTLEMENT_MODULE = "0x8bCaDC965257562F26117F4cd4a1F6F3d0479f75";
// USDC.e on Polygon
export const USDCE = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// Contract addresses — Ethereum mainnet

export const MARGIN_ACCOUNT_FACTORY =
  "0x56838A1f32d9C5eEd4c8F1ee79a16F41D3D32D2f";

// Event signatures

// keccak256("OpenPositionRequested(address,uint256,bytes)")
export const OPEN_EVENT_SIG =
  "0x0dd20556a9f08dad29e443252155f73530f946e3a46dd0469b32abeb73aa0312";
// keccak256("ClosePositionRequested(address,uint256,bytes)")
export const CLOSE_EVENT_SIG =
  "0x43d2970f3a9d5ae74bd6625fdb6fca248c1cba7a7ce6d58f99ac2fb0889fdfc4";

// CLOB

export const CLOB_HOST = "https://clob.polymarket.com";
export const CLOB_ORDER_PATH = "/order";
