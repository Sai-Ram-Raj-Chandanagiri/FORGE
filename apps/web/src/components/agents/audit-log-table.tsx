"use client";

import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditEntry {
  id: string;
  agentType: string;
  action: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number | null;
  success: boolean;
  createdAt: string;
}

interface AuditLogTableProps {
  entries: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function AuditLogTable({
  entries,
  total,
  page,
  limit,
  onPageChange,
}: AuditLogTableProps) {
  const totalPages = Math.ceil(total / limit);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
        <p className="text-sm text-muted-foreground">No audit entries found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Time
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Agent
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Action
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Tokens
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Cost
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Duration
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {entry.agentType}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {entry.action}
                </td>
                <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">
                  <span className="text-foreground">
                    {entry.inputTokens.toLocaleString()}
                  </span>{" "}
                  /{" "}
                  <span className="text-foreground">
                    {entry.outputTokens.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-right font-mono">
                  ${entry.estimatedCost.toFixed(6)}
                </td>
                <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">
                  {entry.durationMs != null ? `${entry.durationMs}ms` : "—"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {entry.success ? (
                    <CheckCircle className="inline h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="inline h-4 w-4 text-red-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
