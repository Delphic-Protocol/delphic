import {
  EVMClient,
  HTTPClient,
  CronCapability,
  handler,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk";
import { callContract, sendWriteReport } from "./helpers";
import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
} from "viem";
import {
  POSITION_MANAGER_ABI,
  GNOSIS_SAFE_ABI,
  ERC20_ABI,
  FACTORY_ABI,
} from "./abis";
import { type Config, buildClobAuthHeaders } from "./utils";
import {
  POLYGON_CHAIN_SELECTOR,
  ETHEREUM_CHAIN_SELECTOR,
  POSITION_MANAGER,
  SETTLEMENT_MODULE,
  MARGIN_ACCOUNT_FACTORY,
  USDCE,
  CLOB_HOST,
} from "./constants";

// Workflow

const initWorkflow = (config: Config) => {
  const polygonClient = new EVMClient(POLYGON_CHAIN_SELECTOR);
  const ethClient = new EVMClient(ETHEREUM_CHAIN_SELECTOR);
  const httpClient = new HTTPClient();
  const cron = new CronCapability();

  const onCron = (runtime: Runtime<any>, _payload: any): string => {
    runtime.log("orderMonitor: checking order queue...");

    // Read order queue from PositionManager
    const queueCalldata = encodeFunctionData({
      abi: POSITION_MANAGER_ABI,
      functionName: "getOrderQueue",
    });

    const queueDataHex = callContract(
      runtime,
      polygonClient,
      POSITION_MANAGER,
      queueCalldata,
    );

    const [orderQueue] = decodeAbiParameters(
      [{ type: "bytes32[]", name: "queue" }],
      queueDataHex,
    );

    runtime.log(`  Queue length: ${orderQueue.length}`);

    if (orderQueue.length === 0) {
      return JSON.stringify({ checked: 0, settled: 0 });
    }

    const settled: string[] = [];

    for (const orderHash of orderQueue) {
      runtime.log(`  Checking order: ${orderHash}`);

      // Check order status on Polymarket CLOB

      const orderPath = `/data/order/${orderHash}`;
      const response = httpClient
        .sendRequest(runtime as any, {
          url: `${CLOB_HOST}${orderPath}`,
          method: "GET",
          headers: buildClobAuthHeaders(config, "GET", orderPath, ""),
          body: "",
        })
        .result();

      if (response.statusCode !== 200) {
        runtime.log(
          `  Order ${orderHash}: HTTP ${response.statusCode} — skipping`,
        );
        continue;
      }

      const responseBody = new TextDecoder().decode(response.body);
      const order = JSON.parse(responseBody);
      const status: string = (order.status ?? "").toUpperCase();

      runtime.log(`  Status: ${status}`);

      if (status !== "MATCHED") continue;

      // Get positionId

      const positionIdCalldata = encodeFunctionData({
        abi: POSITION_MANAGER_ABI,
        functionName: "getOrderPositionId",
        args: [orderHash],
      });
      const positionIdHex = callContract(
        runtime,
        polygonClient,
        POSITION_MANAGER,
        positionIdCalldata,
      );
      const [positionId] = decodeAbiParameters(
        [{ type: "uint256" }],
        positionIdHex,
      );

      // Safe address = order.maker

      const safeAddress = (order.maker_address ?? order.maker) as `0x${string}`;

      // Owner EOA from Gnosis Safe

      const ownersCalldata = encodeFunctionData({
        abi: GNOSIS_SAFE_ABI,
        functionName: "getOwners",
      });
      const ownersHex = callContract(
        runtime,
        polygonClient,
        safeAddress,
        ownersCalldata,
      );
      const [owners] = decodeAbiParameters([{ type: "address[]" }], ownersHex);
      const ownerEOA = owners[0];
      runtime.log(`  Owner EOA: ${ownerEOA}`);

      // Get MarginAccount from factory on Ethereum

      const marginAccountCalldata = encodeFunctionData({
        abi: FACTORY_ABI,
        functionName: "getMarginAccount",
        args: [ownerEOA],
      });
      const marginAccountHex = callContract(
        runtime,
        ethClient,
        MARGIN_ACCOUNT_FACTORY,
        marginAccountCalldata,
      );
      const [marginAccount] = decodeAbiParameters(
        [{ type: "address" }],
        marginAccountHex,
      );

      // Check Safe USDC.e balance

      const balanceCalldata = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [safeAddress],
      });
      const balanceHex = callContract(
        runtime,
        polygonClient,
        USDCE,
        balanceCalldata,
      );
      const [usdceBalance] = decodeAbiParameters(
        [{ type: "uint256" }],
        balanceHex,
      );
      runtime.log(`  Safe USDC.e balance: ${usdceBalance}`);

      // Build removeOrder payload (needed in both branches below)
      const innerRemove = encodeAbiParameters(
        [{ type: "bytes32" }],
        [orderHash],
      );
      const removeReportHex = encodeAbiParameters(
        [{ type: "uint8" }, { type: "bytes" }],
        [2, innerRemove],
      );

      if (usdceBalance === 0n) {
        // Settlement already ran (USDC.e was swept) — clear the order from queue
        runtime.log(`  Settlement already ran — clearing order from queue`);
        sendWriteReport(
          runtime,
          polygonClient,
          POSITION_MANAGER,
          removeReportHex,
        );
        settled.push(orderHash);
        continue;
      }

      runtime.log(
        `  Settling: positionId=${positionId}, safe=${safeAddress}, marginAccount=${marginAccount}`,
      );

      // writeReport: SettlementModule
      const settlementReportHex = encodeAbiParameters(
        [
          { type: "address", name: "safe" },
          { type: "uint256", name: "positionId" },
          { type: "address", name: "marginAccount" },
        ],
        [safeAddress, positionId, marginAccount],
      );
      sendWriteReport(
        runtime,
        polygonClient,
        SETTLEMENT_MODULE,
        settlementReportHex,
        "1000000",
      );

      // writeReport: PositionManager removeOrder
      sendWriteReport(
        runtime,
        polygonClient,
        POSITION_MANAGER,
        removeReportHex,
      );

      settled.push(orderHash);
      runtime.log(`  Done: ${orderHash}`);
    }

    runtime.log(
      `orderMonitor: checked=${orderQueue.length}, settled=${settled.length}`,
    );

    return JSON.stringify({
      checked: orderQueue.length,
      settled: settled.length,
    });
  };

  return [
    handler(
      cron.trigger({ schedule: "*/1 * * * *" }), // every minute
      onCron,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
