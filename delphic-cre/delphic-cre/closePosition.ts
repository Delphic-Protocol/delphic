import {
  EVMClient,
  HTTPClient,
  type EVMLog,
  handler,
  Runner,
  type Runtime,
  bytesToHex,
  hexToBase64,
  prepareReportRequest,
} from "@chainlink/cre-sdk";
import { decodeAbiParameters, encodeAbiParameters } from "viem";
import {
  type Config,
  type ClobCreds,
  buildClobAuthHeaders,
  btoa,
} from "./utils";
import {
  POLYGON_CHAIN_SELECTOR,
  POSITION_MANAGER,
  CLOSE_EVENT_SIG,
  CLOB_HOST,
  CLOB_ORDER_PATH,
} from "./constants";

const initWorkflow = (config: Config) => {
  const evmClient = new EVMClient(POLYGON_CHAIN_SELECTOR);

  const onClosePositionRequested = (
    runtime: Runtime<Config>,
    log: EVMLog,
  ): string => {
    // topics[1] = indexed onBehalfOf (address), topics[2] = indexed positionId (uint256)
    const positionIdHex = bytesToHex(log.topics[2]);
    const positionId = BigInt(positionIdHex);

    // Decode the outer bytes wrapper from event data
    const dataHex = bytesToHex(log.data);
    const [paramsBytes] = decodeAbiParameters(
      [{ name: "params", type: "bytes" }],
      dataHex,
    );

    // abi.encode(string orderJson, string clobKey, string clobSecret, string clobPassphrase)
    const [orderJson, clobKey, clobSecret, clobPassphrase] =
      decodeAbiParameters(
        [
          { name: "orderJson", type: "string" },
          { name: "clobKey", type: "string" },
          { name: "clobSecret", type: "string" },
          { name: "clobPassphrase", type: "string" },
        ],
        paramsBytes as `0x${string}`,
      );

    runtime.log(`ClosePositionRequested detected`);
    runtime.log(`  positionId: ${positionId}`);

    // Parse the pre-signed order
    const rawOrder = JSON.parse(orderJson as string);
    runtime.log(`  maker:       ${rawOrder.maker}`);
    runtime.log(`  signer:      ${rawOrder.signer}`);
    runtime.log(`  makerAmount: ${rawOrder.makerAmount}`);

    const wrappedPayload = JSON.stringify({
      deferExec: false,
      order: {
        salt: parseInt(rawOrder.salt, 10),
        maker: rawOrder.maker,
        signer: rawOrder.signer,
        taker: rawOrder.taker,
        tokenId: rawOrder.tokenId,
        makerAmount: rawOrder.makerAmount,
        takerAmount: rawOrder.takerAmount,
        side: rawOrder.side === 0 ? "BUY" : "SELL",
        expiration: rawOrder.expiration,
        nonce: rawOrder.nonce,
        feeRateBps: rawOrder.feeRateBps,
        signatureType: rawOrder.signatureType,
        signature: rawOrder.signature,
      },
      owner: clobKey,
      orderType: "FOK",
    });

    // Use the user's own CLOB credentials
    const userCreds: ClobCreds = {
      clobApiKey: clobKey as string,
      clobSecret: clobSecret as string,
      clobPassphrase: clobPassphrase as string,
      operatorAddress: rawOrder.signer,
    };

    const httpClient = new HTTPClient();
    const headers = buildClobAuthHeaders(
      userCreds,
      "POST",
      CLOB_ORDER_PATH,
      wrappedPayload,
    );

    const bodyBase64 = btoa(wrappedPayload);

    const response = httpClient
      .sendRequest(runtime as any, {
        url: `${CLOB_HOST}${CLOB_ORDER_PATH}`,
        method: "POST",
        headers,
        body: bodyBase64,
      })
      .result();

    const responseBody = new TextDecoder().decode(response.body);
    runtime.log(`  CLOB response (${response.statusCode}): ${responseBody}`);

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(
        `CLOB order submission failed: ${response.statusCode} ${responseBody}`,
      );
    }

    const parsed = JSON.parse(responseBody);
    const orderHash: string = parsed.orderID ?? parsed.orderHash ?? "";

    runtime.log(`  Order submitted. orderHash: ${orderHash}`);

    const orderHashHex = (
      orderHash.startsWith("0x") ? orderHash : `0x${orderHash}`
    ) as `0x${string}`;

    const innerData = encodeAbiParameters(
      [
        {
          name: "orders",
          type: "tuple[]",
          components: [
            { name: "orderHash", type: "bytes32" },
            { name: "positionId", type: "uint256" },
          ],
        },
      ],
      [[{ orderHash: orderHashHex, positionId }]],
    );

    const reportHex = encodeAbiParameters(
      [
        { name: "action", type: "uint8" },
        { name: "data", type: "bytes" },
      ],
      [1, innerData],
    );

    const report = runtime.report(prepareReportRequest(reportHex)).result();
    evmClient
      .writeReport(runtime as any, {
        receiver: POSITION_MANAGER,
        report,
      })
      .result();

    runtime.log(
      `writeReport sent: action=1, orderHash=${orderHashHex}, positionId=${positionId}`,
    );

    return JSON.stringify({
      positionId: positionId.toString(),
      orderHash,
    });
  };

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(POSITION_MANAGER)],
        topics: [{ values: [hexToBase64(CLOSE_EVENT_SIG)] }],
      }),
      onClosePositionRequested,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
