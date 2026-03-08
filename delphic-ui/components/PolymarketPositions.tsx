"use client";

interface PolymarketPositionsProps {
  history: Array<{
    id: string;
    timestamp: string;
    type: "trade" | "deposit" | "withdraw";
    market?: {
      question: string;
    };
    outcome?: string;
    size?: number;
    value: number;
  }>;
  loading: boolean;
  error: string | null;
}

const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}mo ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export function PolymarketPositions({
  history,
  loading,
  error,
}: PolymarketPositionsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-400">Loading positions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
        <p className="text-red-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* History Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#2a2a2a]">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">
                Activity
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">
                Market
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase">
                Value
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-zinc-400">
                  No activity found
                </td>
              </tr>
            ) : (
              history.map((event) => (
                <tr key={event.id} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/30">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {event.type === "trade" && (
                        <>
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="text-green-400 text-sm">+</span>
                          </div>
                          <span className="text-white font-medium">Bought</span>
                        </>
                      )}
                      {event.type === "deposit" && (
                        <>
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-400 text-sm">$</span>
                          </div>
                          <span className="text-white font-medium">Deposited</span>
                        </>
                      )}
                      {event.type === "withdraw" && (
                        <>
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-400 text-sm">$</span>
                          </div>
                          <span className="text-white font-medium">Withdrew</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-white">
                        {event.market?.question || "Funds"}
                      </p>
                      {event.outcome && (
                        <p className="text-xs text-green-400">
                          {event.outcome} {event.size && `${event.size} shares`}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={event.type === "deposit" ? "text-green-400" : "text-red-400"}>
                      {event.type === "deposit" ? "+" : "-"}${Math.abs(event.value).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-zinc-400 text-sm">
                    {formatTimeAgo(event.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {history.length === 0 && (
        <div className="text-center py-12 px-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
          <p className="text-zinc-400 mb-4">No positions or activity found</p>
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-[#ff1cf7] hover:bg-[#e019db] text-white rounded-lg transition-colors"
          >
            Browse Markets
          </a>
        </div>
      )}
    </div>
  );
}
