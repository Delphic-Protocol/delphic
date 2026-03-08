import { Address, getCreate2Address, keccak256, encodeAbiParameters, Hex, zeroAddress } from "viem";
import { SAFE_FACTORY_ADDRESS, POLYMARKET_RELAYER_URL } from "./constants";

const SAFE_INIT_CODE_HASH = "0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf" as const;

export interface CreateSafeResult {
  transactionID: string;
  transactionHash: string;
  safeAddress: Address;
}

export class PolymarketService {
  private relayerUrl: string;
  private safeFactory: Address;
  private builderKey: string;
  private builderSecret: string;
  private builderPassphrase: string;

  constructor(
    relayerUrl: string = POLYMARKET_RELAYER_URL,
    safeFactory: Address = SAFE_FACTORY_ADDRESS,
    builderKey: string = process.env.NEXT_PUBLIC_POLY_BUILDER_API_KEY || "",
    builderSecret: string = process.env.NEXT_PUBLIC_POLY_BUILDER_SECRET || "",
    builderPassphrase: string = process.env.NEXT_PUBLIC_POLY_BUILDER_PASSPHRASE || ""
  ) {
    this.relayerUrl = relayerUrl;
    this.safeFactory = safeFactory;
    this.builderKey = builderKey;
    this.builderSecret = builderSecret;
    this.builderPassphrase = builderPassphrase;
  }

  /**
   * Derive the Safe address for a user's wallet using CREATE2
   * @param address - The user's EOA address
   * @returns The derived Safe address
   */
  deriveSafe(address: Address): Address {
    return getCreate2Address({
      bytecodeHash: SAFE_INIT_CODE_HASH as Hex,
      from: this.safeFactory as Hex,
      salt: keccak256(encodeAbiParameters([{ name: 'address', type: 'address' }], [address as Hex])),
    });
  }

  /**
   * Check if a Safe is already deployed
   * @param safeAddress - The Safe address to check
   * @returns True if the Safe is deployed, false otherwise
   */
  async isSafeDeployed(safeAddress: Address): Promise<boolean> {
    const deployedResp = await fetch(
      `${this.relayerUrl}/deployed?address=${safeAddress}`
    );

    if (!deployedResp.ok) {
      throw new Error(`Failed to check Safe deployment status: ${deployedResp.status}`);
    }

    const deployedData = (await deployedResp.json()) as { deployed: boolean };

    return deployedData.deployed;
  }

  /**
   * Create a new Safe for a user
   * @param userWallet - The user's EOA address
   * @param signature - The EIP-712 signature from the user
   * @returns CreateSafeResult with transaction details
   */
  async createSafe(userWallet: Address, signature: string): Promise<CreateSafeResult> {
    // Derive the Safe address
    const safeAddress = this.deriveSafe(userWallet);

    // Submit signature to relayer (Polymarket pays the gas)
    const body = JSON.stringify({
      from: userWallet,
      to: this.safeFactory,
      proxyWallet: safeAddress,
      data: "0x",
      signature,
      signatureParams: {
        paymentToken: zeroAddress,
        payment: "0",
        paymentReceiver: zeroAddress,
      },
      type: "SAFE-CREATE",
    });

    const headers = this.buildBuilderHeaders("POST", "/submit", body);

    const submitResp = await fetch(`${this.relayerUrl}/submit`, {
      method: "POST",
      headers,
      body,
    });

    if (!submitResp.ok) {
      const text = await submitResp.text();
      throw new Error(`Relayer error ${submitResp.status}: ${text}`);
    }

    const submitData = (await submitResp.json()) as {
      transactionID: string;
      state: string;
    };

    // Poll until confirmed
    for (let i = 0; i < 20; i++) {
      await this.sleep(3000);

      const txResp = await fetch(
        `${this.relayerUrl}/transaction?id=${submitData.transactionID}`
      );

      const txns = (await txResp.json()) as Array<{
        state: string;
        transactionHash: string;
      }>;

      if (txns.length > 0) {
        const txn = txns[0];

        if (txn.state === "STATE_CONFIRMED" || txn.state === "STATE_SUCCESS") {
          return {
            transactionID: submitData.transactionID,
            transactionHash: txn.transactionHash,
            safeAddress,
          };
        }

        if (txn.state === "STATE_FAILED") {
          throw new Error("Deployment failed on-chain");
        }
      }

      if (i === 19) {
        throw new Error("Polling timed out");
      }
    }

    throw new Error("Unexpected error during Safe creation");
  }

  /**
   * Build authentication headers for Polymarket Builder API
   */
  private buildBuilderHeaders(method: string, path: string, body: string): HeadersInit {
    const ts = Math.floor(Date.now() / 1000);
    const message = `${ts}${method}${path}${body}`;

    // Create HMAC signature
    const crypto = require('crypto');
    const base64Secret = Buffer.from(this.builderSecret, 'base64');
    const sig = crypto
      .createHmac('sha256', base64Secret)
      .update(message)
      .digest('base64');

    // Convert to URL-safe base64
    const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

    return {
      "Content-Type": "application/json",
      "NEXT_PUBLIC_POLY_BUILDER_API_KEY": this.builderKey,
      "POLY_BUILDER_SIGNATURE": sigUrlSafe,
      "POLY_BUILDER_TIMESTAMP": `${ts}`,
      "NEXT_PUBLIC_POLY_BUILDER_PASSPHRASE": this.builderPassphrase,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const polymarketService = new PolymarketService();
