import {
  EVMClient,
  type Runtime,
  bytesToHex,
  hexToBase64,
  prepareReportRequest,
} from "@chainlink/cre-sdk";

export function callContract(
  runtime: Runtime<any>,
  evmClient: EVMClient,
  to: string,
  calldata: `0x${string}`
): `0x${string}` {
  const reply = evmClient
    .callContract(runtime as any, {
      call: {
        to: hexToBase64(to),
        data: hexToBase64(calldata),
      },
    })
    .result();
  return bytesToHex(reply.data);
}

export function sendWriteReport(
  runtime: Runtime<any>,
  evmClient: EVMClient,
  receiver: string,
  reportHex: `0x${string}`,
  gasLimit?: string
) {
  const report = runtime.report(prepareReportRequest(reportHex)).result();
  evmClient
    .writeReport(runtime as any, {
      receiver,
      report,
      ...(gasLimit ? { gasConfig: { gasLimit } } : {}),
    })
    .result();
}
