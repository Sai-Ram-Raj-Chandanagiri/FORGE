"use client";

import { Database, AlertCircle } from "lucide-react";

interface CrossModuleResultProps {
  result: {
    success?: boolean;
    data?: unknown;
    sourceCount?: number;
    summary?: Record<string, unknown>;
    errors?: string[];
    error?: string;
  };
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function CrossModuleResult({ result }: CrossModuleResultProps) {
  if (result.error || result.success === false) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>{result.error ?? "Query failed"}</span>
      </div>
    );
  }

  const entries = result.summary
    ? Object.entries(result.summary)
    : result.data && typeof result.data === "object"
      ? Object.entries(result.data as Record<string, unknown>)
      : [];

  return (
    <div className="rounded-lg border bg-muted/30 text-xs">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">
          Cross-module result
          {result.sourceCount != null && ` (${result.sourceCount} source${result.sourceCount !== 1 ? "s" : ""})`}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="px-3 py-2 text-muted-foreground">No data returned.</div>
      ) : (
        <div className="divide-y">
          {entries.map(([label, value]) => (
            <div key={label} className="px-3 py-2">
              <div className="font-mono text-[11px] font-semibold text-muted-foreground">{label}</div>
              <pre className="mt-1 whitespace-pre-wrap break-all text-[11px]">{renderValue(value)}</pre>
            </div>
          ))}
        </div>
      )}
      {result.errors && result.errors.length > 0 && (
        <div className="border-t bg-red-50 px-3 py-2 text-[11px] text-red-700">
          <div className="font-medium">Errors:</div>
          <ul className="list-disc pl-4">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
