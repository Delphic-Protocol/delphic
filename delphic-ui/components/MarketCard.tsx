"use client";

import { PolymarketEvent } from "@/lib/polymarket/types";
import { getTileType } from "@/lib/polymarket/tileType";
import { BinaryTile } from "./tiles/BinaryTile";
import { DateListTile } from "./tiles/DateListTile";
import { MultiCandidateTile } from "./tiles/MultiCandidateTile";
import { ThresholdTile } from "./tiles/ThresholdTile";
import { SportsTile } from "./tiles/SportsTile";
import { CryptoTile } from "./tiles/CryptoTile";

interface MarketCardProps {
  market: PolymarketEvent;
  onClick?: () => void;
}

export function MarketCard({ market, onClick }: MarketCardProps) {
  const tileType = getTileType(market);

  switch (tileType) {
    case "binary":
      return <BinaryTile event={market} onClick={onClick} />;
    case "date_list":
      return <DateListTile event={market} onClick={onClick} />;
    case "multi_candidate":
      return <MultiCandidateTile event={market} onClick={onClick} />;
    case "threshold":
      return <ThresholdTile event={market} onClick={onClick} />;
    case "sports":
      return <SportsTile event={market} onClick={onClick} />;
    case "crypto":
      return <CryptoTile event={market} onClick={onClick} />;
    default:
      return <BinaryTile event={market} onClick={onClick} />;
  }
}
