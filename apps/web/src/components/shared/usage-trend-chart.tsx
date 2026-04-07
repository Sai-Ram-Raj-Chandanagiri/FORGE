"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface UsageTrend {
  date: string;
  cpuHours: number;
  memoryGbHours: number;
  networkGb: number;
  estimatedCost: number;
}

interface UsageTrendChartProps {
  trends: UsageTrend[];
  trendDirection: "up" | "down" | "stable";
  percentChange: number;
}

export function UsageTrendChart({
  trends,
  trendDirection,
  percentChange,
}: UsageTrendChartProps) {
  if (trends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
        <p className="text-sm text-muted-foreground">
          No usage data available yet.
        </p>
      </div>
    );
  }

  const maxCost = Math.max(...trends.map((t) => t.estimatedCost), 0.001);

  const TrendIcon =
    trendDirection === "up"
      ? TrendingUp
      : trendDirection === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    trendDirection === "up"
      ? "text-red-500"
      : trendDirection === "down"
        ? "text-emerald-500"
        : "text-muted-foreground";

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Usage Trends</h3>
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {percentChange > 0 ? "+" : ""}
          {percentChange}%
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="flex items-end gap-1 h-32">
        {trends.map((trend) => (
          <div
            key={trend.date}
            className="flex-1 group relative"
          >
            <div
              className="bg-primary/70 rounded-t transition-all hover:bg-primary w-full"
              style={{
                height: `${Math.max((trend.estimatedCost / maxCost) * 100, 2)}%`,
              }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="rounded bg-foreground px-2 py-1 text-[9px] text-background whitespace-nowrap">
                {trend.date}: ${trend.estimatedCost.toFixed(4)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">
          {trends[0]?.date}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {trends[trends.length - 1]?.date}
        </span>
      </div>

      {/* Summary table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="pb-1 text-left text-muted-foreground font-medium">
                Date
              </th>
              <th className="pb-1 text-right text-muted-foreground font-medium">
                CPU (hrs)
              </th>
              <th className="pb-1 text-right text-muted-foreground font-medium">
                Memory (GB-hrs)
              </th>
              <th className="pb-1 text-right text-muted-foreground font-medium">
                Network (GB)
              </th>
              <th className="pb-1 text-right text-muted-foreground font-medium">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {trends.slice(-7).map((t) => (
              <tr key={t.date} className="border-b last:border-0">
                <td className="py-1">{t.date}</td>
                <td className="py-1 text-right">{t.cpuHours}</td>
                <td className="py-1 text-right">{t.memoryGbHours}</td>
                <td className="py-1 text-right">{t.networkGb}</td>
                <td className="py-1 text-right font-mono">
                  ${t.estimatedCost.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
