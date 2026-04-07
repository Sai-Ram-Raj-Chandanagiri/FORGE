"use client";

import { Zap, DollarSign, Activity, AlertTriangle } from "lucide-react";

interface UsageAnalyticsChartsProps {
  data: {
    totalTokens: number;
    totalCost: number;
    totalActions: number;
    actionsByType: Record<string, number>;
    errorRate: number;
    dailyUsage: Array<{
      date: string;
      tokens: number;
      cost: number;
      actions: number;
    }>;
  };
}

export function UsageAnalyticsCharts({ data }: UsageAnalyticsChartsProps) {
  const maxActions = Math.max(
    ...Object.values(data.actionsByType),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Zap className="h-5 w-5 text-blue-500" />}
          bgColor="bg-blue-500/10"
          label="Total Tokens"
          value={data.totalTokens.toLocaleString()}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          bgColor="bg-emerald-500/10"
          label="Total Cost"
          value={`$${data.totalCost.toFixed(6)}`}
        />
        <StatCard
          icon={<Activity className="h-5 w-5 text-purple-500" />}
          bgColor="bg-purple-500/10"
          label="Total Actions"
          value={data.totalActions.toLocaleString()}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          bgColor="bg-amber-500/10"
          label="Error Rate"
          value={`${data.errorRate}%`}
        />
      </div>

      {/* Actions by Type */}
      {Object.keys(data.actionsByType).length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Actions by Type</h3>
          <div className="space-y-2">
            {Object.entries(data.actionsByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-32 truncate">
                    {type}
                  </span>
                  <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{
                        width: `${(count / maxActions) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Daily Usage Table */}
      {data.dailyUsage.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <h3 className="text-sm font-semibold p-5 pb-3">Daily Usage</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b bg-muted/50">
                  <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">
                    Tokens
                  </th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">
                    Cost
                  </th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dailyUsage.map((day) => (
                  <tr key={day.date} className="border-b last:border-0">
                    <td className="px-5 py-2 text-xs">{day.date}</td>
                    <td className="px-5 py-2 text-xs text-right">
                      {day.tokens.toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-xs text-right font-mono">
                      ${day.cost.toFixed(6)}
                    </td>
                    <td className="px-5 py-2 text-xs text-right">
                      {day.actions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  bgColor,
  label,
  value,
}: {
  icon: React.ReactNode;
  bgColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${bgColor}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
