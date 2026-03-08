import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";

// ─── Base64 polyfills (CRE runtime lacks atob/btoa globals) ──────────────────

export function atob(b64: string): string {
  const T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "", buf = 0, bits = 0;
  for (const ch of b64.replace(/=+$/, "")) {
    const v = T.indexOf(ch);
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out += String.fromCharCode((buf >> bits) & 0xff); }
  }
  return out;
}

export function btoa(bin: string): string {
  const T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bin.length; i += 3) {
    const a = bin.charCodeAt(i), b = bin.charCodeAt(i + 1) || 0, c = bin.charCodeAt(i + 2) || 0;
    const t = (a << 16) | (b << 8) | c;
    out += T[(t >> 18) & 63] + T[(t >> 12) & 63];
    out += i + 1 < bin.length ? T[(t >> 6) & 63] : "=";
    out += i + 2 < bin.length ? T[t & 63] : "=";
  }
  return out;
}

// ─── Config (empty — CRE reads this from config.json) ────────────────────────

export type Config = Record<string, never>;

// ─── CLOB Auth ───────────────────────────────────────────────────────────────

export type ClobCreds = {
  clobApiKey: string;
  clobSecret: string; // base64url-encoded
  clobPassphrase: string;
  operatorAddress: string; // EOA that matches the API key
};

export function buildClobAuthHeaders(
  creds: ClobCreds,
  method: string,
  path: string,
  body: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${timestamp}${method}${path}${body}`;

  const secretStdB64 = creds.clobSecret.replace(/-/g, "+").replace(/_/g, "/");
  const secretBytes = Uint8Array.from(atob(secretStdB64), (c) => c.charCodeAt(0));
  const sigBytes = hmac(sha256, secretBytes, new TextEncoder().encode(message));
  const signature = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return {
    "Content-Type": "application/json",
    POLY_ADDRESS: creds.operatorAddress,
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: timestamp,
    POLY_API_KEY: creds.clobApiKey,
    POLY_PASSPHRASE: creds.clobPassphrase,
  };
}
