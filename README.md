# Delphic

Delphic is a leveraged prediction market protocol that lets users trade on [Polymarket](https://polymarket.com) using borrowed capital. Users deposit collateral on Ethereum, borrow USDC via Aave, and the funds are automatically bridged to Polygon to buy prediction market shares — all powered by Chainlink CCIP and Chainlink CRE.

## How It Works

```
[User: Ethereum]                    [Polymarket: Polygon]
  Deposit wstETH
       │
  MarginAccount ──CCIP──► PositionManager ──► Gnosis Safe
  (borrows USDC)           (swaps→USDC.e)      (holds shares)
       │                                            │
       │         [Chainlink CRE monitors]           │
       │                                     Order matched
       │                                            │
  MarginAccount ◄──CCIP── SettlementModule ◄── USDC.e swept
  (repays Aave)            (swaps→USDC)
```

1. **Deposit & Borrow**: User deposits collateral (e.g. wstETH) on Ethereum. The protocol supplies it to Aave as collateral and borrows USDC, which is bridged cross-chain via CCIP to Polygon. The funds arrive in the user's Gnosis Safe as USDC.e, ready for trading.
2. **Open Position**: User selects a market in the UI and opens a leveraged position. A BUY order is signed and submitted on-chain. CRE picks up the event and relays the order to the Polymarket CLOB.
3. **Close Position**: User closes their position from the UI. A SELL order is signed and submitted on-chain. CRE relays the SELL to the CLOB.
4. **Settle**: CRE's cron monitor detects the matched order, sweeps USDC.e from the Safe, swaps it to USDC, and bridges it back to Ethereum via CCIP. The Aave loan is automatically repaid and remaining profit stays in the MarginAccount for the user to withdraw.

---

## Chainlink Components

### 1. Chainlink CCIP (Cross-Chain Interoperability Protocol)

Used to move USDC trustlessly between Ethereum mainnet and Polygon in both directions.

| Contract                                                             | Chain    | Direction   | What it does                                                       |
| -------------------------------------------------------------------- | -------- | ----------- | ------------------------------------------------------------------ |
| [`MarginAccount.sol`](delphic-contracts/src/MarginAccount.sol)       | Ethereum | **Send**    | Bridges borrowed USDC → Polygon `PositionManager`                  |
| [`PositionManager.sol`](delphic-contracts/src/PositionManager.sol)   | Polygon  | **Receive** | Accepts USDC from Ethereum, swaps to USDC.e, forwards to user Safe |
| [`SettlementModule.sol`](delphic-contracts/src/SettlementModule.sol) | Polygon  | **Send**    | Bridges settled USDC → Ethereum `MarginAccount`                    |
| [`MarginAccount.sol`](delphic-contracts/src/MarginAccount.sol)       | Ethereum | **Receive** | Accepts USDC from Polygon, repays Aave loan                        |

Each receiving contract executes its own logic upon receiving the CCIP message: `PositionManager` swaps and routes funds to the correct Safe, while `MarginAccount` uses the incoming amount to repay the outstanding Aave loan.

### 2. Chainlink CRE (Compute Runtime Engine)

Three off-chain CRE workflows automate the order relay and settlement lifecycle:

| Workflow          | File                                                           | Trigger                            | What it does                                                                                                                                                                                      |
| ----------------- | -------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delphic-open`    | [`main.ts`](delphic-cre/delphic-cre/main.ts)                   | `OpenPositionRequested` log event  | Decodes pre-signed BUY order + CLOB credentials from the event, relays the order to Polymarket CLOB                                                                                               |
| `delphic-close`   | [`closePosition.ts`](delphic-cre/delphic-cre/closePosition.ts) | `ClosePositionRequested` log event | Decodes pre-signed SELL order + CLOB credentials from the event, relays the SELL to Polymarket CLOB, writes the order hash back to `PositionManager` to add it to the settlement queue            |
| `delphic-monitor` | [`orderMonitor.ts`](delphic-cre/delphic-cre/orderMonitor.ts)   | Cron every 1 minute                | Reads the order queue from `PositionManager`, checks each order's USDC.e balance, triggers `SettlementModule` via `writeReport` to settle filled positions, then removes the order from the queue |

CRE communicates back to on-chain contracts via `writeReport`, which calls `onReport()` on both [`PositionManager.sol`](delphic-contracts/src/PositionManager.sol) (to record/remove orders) and [`SettlementModule.sol`](delphic-contracts/src/SettlementModule.sol) (to trigger settlement).

---

## Repository Structure

- **[`delphic-contracts/`](delphic-contracts/)** — Smart contracts. Contains the on-chain logic for collateral management, CCIP bridging, CRE report handling, and settlement.
- **[`delphic-cre/`](delphic-cre/)** — Chainlink CRE workflows. Three workflows handling order relay and automated settlement.
- **[`delphic-ui/`](delphic-ui/)** — Next.js frontend for depositing collateral, opening/closing positions, and managing loans.

## Deployed Contracts

### Polygon

| Contract         | Address                                      |
| ---------------- | -------------------------------------------- |
| PositionManager  | `0xcD3B779C8d8FBfb41520E63643EB100559032db1` |
| SettlementModule | `0x8bCaDC965257562F26117F4cd4a1F6F3d0479f75` |
| CRE Forwarder    | `0xf458d621885e29a5003ea9bbba5280d54e19b1ce` |

### Ethereum

| Contract             | Address                                      |
| -------------------- | -------------------------------------------- |
| MarginAccountFactory | `0x56838A1f32d9C5eEd4c8F1ee79a16F41D3D32D2f` |
