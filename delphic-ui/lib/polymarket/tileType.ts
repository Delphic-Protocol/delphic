import { PolymarketEvent } from "./types";

export type TileType =
  | "binary"
  | "date_list"
  | "multi_candidate"
  | "threshold"
  | "sports"
  | "crypto";

/**
 * Determines which tile type should be used to render an event
 */
export function getTileType(event: PolymarketEvent): TileType {
  // Rule 1: Sports category
  if (event.category === "sports" || event.category?.toLowerCase() === "sports") {
    return "sports";
  }

  // Rule 2: Crypto short-interval markets
  if (isCryptoMarket(event)) {
    return "crypto";
  }

  // Rule 3: Single market = binary
  if (event.markets.length === 1) {
    return "binary";
  }

  // For multiple markets, analyze their structure
  const marketTitles = event.markets.map((m) => m.question || "");
  const firstMarket = event.markets[0];

  // Rule 4: Date-based markets
  if (hasDatePattern(marketTitles)) {
    return "date_list";
  }

  // Rule 6: Threshold/price level markets
  if (hasThresholdPattern(marketTitles)) {
    return "threshold";
  }

  // Rule 5: Multi-candidate (default for multiple markets)
  return "multi_candidate";
}

/**
 * Check if this is a crypto short-interval market
 */
function isCryptoMarket(event: PolymarketEvent): boolean {
  const cryptoAssets = ["BTC", "ETH", "Bitcoin", "Ethereum"];
  const shortIntervals = ["5 minute", "5-minute", "minute", "hour"];

  const title = event.title.toLowerCase();
  const hasCrypto = cryptoAssets.some((asset) =>
    title.includes(asset.toLowerCase())
  );

  if (!hasCrypto) return false;

  const hasShortInterval = shortIntervals.some((interval) =>
    title.includes(interval.toLowerCase())
  );

  // Also check for "Up or Down" pattern common in crypto markets
  const hasUpDown =
    title.includes("up") &&
    (title.includes("down") || title.includes("or down"));

  return hasShortInterval || hasUpDown;
}

/**
 * Check if markets represent dates or deadlines
 */
function hasDatePattern(titles: string[]): boolean {
  // Look for date patterns like:
  // - "March 7", "March 14"
  // - "by June 30"
  // - "Q1", "Q2", etc.
  const datePatterns = [
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/i,
    /\bq[1-4]\b/i,
    /\d{4}-\d{2}-\d{2}/,
    /\bby\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
  ];

  return titles.some((title) =>
    datePatterns.some((pattern) => pattern.test(title))
  );
}

/**
 * Check if markets represent numeric thresholds or price levels
 */
function hasThresholdPattern(titles: string[]): boolean {
  // Look for patterns like:
  // - "$120", "$110"
  // - "↑ $120", "above $120"
  // - Price levels with comparison symbols
  const thresholdPatterns = [
    /[↑↓]\s*\$\d+/,
    /\$\d+/,
    /(above|below|over|under)\s+\$?\d+/i,
    /\d+\s*(dollars|usd)/i,
  ];

  // Check if at least 2 markets have threshold patterns
  const matchCount = titles.filter((title) =>
    thresholdPatterns.some((pattern) => pattern.test(title))
  ).length;

  return matchCount >= 2;
}
