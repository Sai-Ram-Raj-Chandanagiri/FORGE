"use client";

import { Suspense, useState } from "react";
import { Brain, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { UsageTrendChart } from "@/components/shared/usage-trend-chart";
import { AnomalyAlertList } from "@/components/shared/anomaly-alert-list";
import { CostForecastChart } from "@/components/shared/cost-forecast-chart";
import { RecommendationCards } from "@/components/shared/recommendation-cards";

interface UsageTrend {
  date: string;
  cpuHours: number;
  memoryGbHours: number;
  networkGb: number;
  estimatedCost: number;
}

interface Anomaly {
  deploymentId: string;
  deploymentName: string;
  metric: string;
  value: number;
  mean: number;
  stddev: number;
  severity: "WARNING" | "CRITICAL";
  detectedAt: string;
}

interface CostForecast {
  month: string;
  projected: number;
  lowerBound: number;
  upperBound: number;
}

interface ModuleRecommendation {
  moduleId: string;
  name: string;
  slug: string;
  shortDescription: string;
  pricingModel: string;
  averageRating: number;
  downloadCount: number;
  score: number;
}

interface DashboardData {
  trends?: {
    trends: UsageTrend[];
    trendDirection: "up" | "down" | "stable";
    percentChange: number;
  };
  anomalies?: Anomaly[];
  forecast?: {
    forecasts: CostForecast[];
    insufficient?: boolean;
  };
  recommendations?: ModuleRecommendation[];
  errors: string[];
}

function InsightsContent() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");

  const { data: dashboard, isPending } = trpc.insights.getDashboard.useQuery() as {
    data: DashboardData | undefined;
    isPending: boolean;
  };

  const { data: trendsData } = trpc.insights.getUsageTrends.useQuery({
    period,
  }) as {
    data:
      | {
          trends: UsageTrend[];
          trendDirection: "up" | "down" | "stable";
          percentChange: number;
        }
      | undefined;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Brain className="h-8 w-8 text-primary" />
          Predictive Insights
        </h1>
        <p className="mt-1 text-muted-foreground">
          AI-powered analytics, anomaly detection, and cost forecasting.
        </p>
      </div>

      {isPending ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Error banner */}
          {dashboard?.errors && dashboard.errors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Some insights could not be loaded:{" "}
                  {dashboard.errors.join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Usage Trends with period selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Usage Trends</h2>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {(["7d", "30d", "90d"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      period === p
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "7d"
                      ? "7 Days"
                      : p === "30d"
                        ? "30 Days"
                        : "90 Days"}
                  </button>
                ))}
              </div>
            </div>

            <UsageTrendChart
              trends={trendsData?.trends ?? dashboard?.trends?.trends ?? []}
              trendDirection={
                trendsData?.trendDirection ??
                dashboard?.trends?.trendDirection ??
                "stable"
              }
              percentChange={
                trendsData?.percentChange ??
                dashboard?.trends?.percentChange ??
                0
              }
            />
          </div>

          {/* Anomalies + Forecast grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AnomalyAlertList anomalies={dashboard?.anomalies ?? []} />
            <CostForecastChart
              forecasts={dashboard?.forecast?.forecasts ?? []}
              insufficient={dashboard?.forecast?.insufficient}
            />
          </div>

          {/* Recommendations */}
          <RecommendationCards
            recommendations={dashboard?.recommendations ?? []}
          />
        </>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      }
    >
      <InsightsContent />
    </Suspense>
  );
}
