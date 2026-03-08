export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  image?: string;
  icon?: string;
  volume?: string;
  liquidity?: string;
  endDate?: string;
  outcomes?: string; // JSON stringified array
  outcomePrices?: string; // JSON stringified array
  clobTokenIds?: string | null; // JSON stringified array of token IDs [YES, NO]
  active?: boolean;
  closed?: boolean;
  acceptingOrders?: boolean;
  slug?: string;
  marketSlug?: string;
  enableOrderBook?: boolean;
  orderPriceMinTickSize?: string;
  orderMinSize?: string;
}

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  resolutionSource?: string;
  startDate?: string;
  creationDate?: string;
  endDate?: string;
  image?: string;
  icon?: string;
  active: boolean;
  closed: boolean;
  archived?: boolean;
  new?: boolean;
  featured?: boolean;
  restricted?: boolean;
  liquidity?: number;
  volume?: number;
  openInterest?: number;
  volume24hr?: number;
  category?: string;
  subcategory?: string;
  markets: PolymarketMarket[];
}

export interface MarketsResponse {
  data: PolymarketMarket[];
  count?: number;
  limit?: number;
  offset?: number;
}
