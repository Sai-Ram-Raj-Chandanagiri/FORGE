"use client";

import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

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

interface AnomalyAlertListProps {
  anomalies: Anomaly[];
}

export function AnomalyAlertList({ anomalies }: AnomalyAlertListProps) {
  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <h3 className="text-sm font-semibold">No Anomalies Detected</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          All deployments are operating within normal parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-semibold">
          Anomalies ({anomalies.length})
        </h3>
      </div>

      <div className="space-y-3">
        {anomalies.map((anomaly, i) => (
          <div
            key={`${anomaly.deploymentId}-${anomaly.metric}-${i}`}
            className={`rounded-lg border p-3 ${
              anomaly.severity === "CRITICAL"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {anomaly.severity === "CRITICAL" ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  anomaly.severity === "CRITICAL"
                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                }`}
              >
                {anomaly.severity}
              </span>
              <span className="text-xs font-medium">
                {anomaly.deploymentName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{anomaly.metric}</span>:{" "}
              {anomaly.value} (mean: {anomaly.mean}, stddev: {anomaly.stddev})
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Detected: {new Date(anomaly.detectedAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
