"use client";

import { TrendingUp } from "lucide-react";

interface CostForecast {
  month: string;
  projected: number;
  lowerBound: number;
  upperBound: number;
}

interface CostForecastChartProps {
  forecasts: CostForecast[];
  insufficient?: boolean;
}

export function CostForecastChart({
  forecasts,
  insufficient,
}: CostForecastChartProps) {
  if (insufficient || forecasts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">Cost Forecast</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Not enough data for forecasting. At least 14 days of usage data is
          needed.
        </p>
      </div>
    );
  }

  const maxCost = Math.max(...forecasts.map((f) => f.upperBound), 1);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Cost Forecast</h3>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-4 h-28 mb-4">
        {forecasts.map((forecast) => (
          <div
            key={forecast.month}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <span className="text-[9px] text-muted-foreground font-mono">
              ${forecast.projected.toFixed(2)}
            </span>
            <div className="w-full relative">
              {/* Upper bound background */}
              <div
                className="absolute bottom-0 w-full bg-primary/10 rounded-t"
                style={{
                  height: `${(forecast.upperBound / maxCost) * 80}px`,
                }}
              />
              {/* Projected bar */}
              <div
                className="relative w-full bg-primary/60 rounded-t"
                style={{
                  height: `${(forecast.projected / maxCost) * 80}px`,
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">
              {forecast.month}
            </span>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="pb-1 text-left text-muted-foreground font-medium">
              Month
            </th>
            <th className="pb-1 text-right text-muted-foreground font-medium">
              Projected
            </th>
            <th className="pb-1 text-right text-muted-foreground font-medium">
              Range
            </th>
          </tr>
        </thead>
        <tbody>
          {forecasts.map((f) => (
            <tr key={f.month} className="border-b last:border-0">
              <td className="py-1">{f.month}</td>
              <td className="py-1 text-right font-mono">
                ${f.projected.toFixed(2)}
              </td>
              <td className="py-1 text-right text-muted-foreground">
                ${f.lowerBound.toFixed(2)} – ${f.upperBound.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
