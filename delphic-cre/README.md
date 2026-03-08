# Delphic — Chainlink CRE Workflows

Chainlink CRE workflows for the Polymarket Delphic positions

---

## Overview

| Workflow      | File               | Trigger                                | What it does                                                                           |
| ------------- | ------------------ | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `open-cre`    | `main.ts`          | `OpenPositionRequested` log (Polygon)  | Submits BUY order to Polymarket CLOB + records orderHash on-chain                      |
| `close-cre`   | `closePosition.ts` | `ClosePositionRequested` log (Polygon) | Submits SELL order to Polymarket CLOB + records orderHash on-chain                     |
| `monitor-cre` | `orderMonitor.ts`  | Cron                                   | Polls order queue; on MATCHED, triggers SettlementModule (CCIP sweep back to Ethereum) |

---

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure credentials

Copy the example config and fill in your Polymarket CLOB credentials:

```bash
cp config.json.example config.json
```

```json
{
  "clobApiKey": "<from polymarket.com/settings?tab=api>",
  "clobSecret": "<from polymarket.com/settings?tab=api>",
  "clobPassphrase": "<from polymarket.com/settings?tab=api>",
  "operatorAddress": "<your Safe address on Polygon>"
}
```

### 3. Configure CRE project RPC URLs

Copy the example project file and add your RPC URLs:

```bash
cp ../project.yaml.example ../project.yaml
```

---

## Running workflows

All `cre workflow simulate` commands must be run from the **project root** (`delphic-cre/`), not the workflow directory.

Add `--broadcast` to make actions real (on-chain writeReport txs). Without it, nothing executes on-chain.

### open-cre

Triggered by an `OpenPositionRequested` log. Requires the tx hash from `npm run open-position` in the demo.

```bash
cre workflow simulate ./delphic-cre \
  --target open-cre \
  --broadcast
```

### close-cre

Triggered by a `ClosePositionRequested` log. Requires the tx hash from `npm run close-position` in the demo.

```bash
cre workflow simulate ./delphic-cre \
  --target close-cre \
  --broadcast
```

### monitor-cre

Cron-based, no tx hash needed. Reads the on-chain order queue and settles any MATCHED orders.

```bash
cre workflow simulate ./delphic-cre \
  --target monitor-cre \
  --broadcast
```

---

## Key addresses

| Contract             | Chain    | Address                                      |
| -------------------- | -------- | -------------------------------------------- |
| PositionManager      | Polygon  | `0xcD3B779C8d8FBfb41520E63643EB100559032db1` |
| SettlementModule     | Polygon  | `0x8bCaDC965257562F26117F4cd4a1F6F3d0479f75` |
| CRE Forwarder        | Polygon  | `0xf458d621885e29a5003ea9bbba5280d54e19b1ce` |
| MarginAccountFactory | Ethereum | `0x8049b0fb2239F5FbF21D27999eDD8C2b06cb9905` |
