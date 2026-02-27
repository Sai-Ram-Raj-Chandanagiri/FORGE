"use client";

import { useState } from "react";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);

  const { data: logsData, isLoading } = trpc.admin.getAuditLogs.useQuery({
    page,
    limit: 30,
  }) as {
    data:
      | {
          logs: AuditEntry[];
          total: number;
          page: number;
          totalPages: number;
        }
      | undefined;
    isLoading: boolean;
  };

  const getActionBadgeClasses = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("create") || lower.includes("add")) {
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    }
    if (lower.includes("delete") || lower.includes("remove")) {
      return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    if (lower.includes("update") || lower.includes("edit")) {
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
    if (lower.includes("suspend") || lower.includes("ban")) {
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }
    if (lower.includes("login") || lower.includes("auth")) {
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    }
    return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackButton fallback="/admin" label="Back" />
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ScrollText className="h-8 w-8 text-primary" />
          Audit Logs
        </h1>
        <p className="mt-1 text-muted-foreground">
          View system activity and audit trail for all administrative actions.
        </p>
      </div>

      {/* Audit Logs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logsData && logsData.logs.length > 0 ? (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_0.75fr_0.75fr_0.75fr_1fr_0.75fr] gap-4 rounded-lg bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Action</span>
            <span>Entity Type</span>
            <span>Entity ID</span>
            <span>User ID</span>
            <span>Timestamp</span>
            <span>IP Address</span>
          </div>

          {/* Log Rows */}
          {logsData.logs.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border bg-card p-4 lg:grid lg:grid-cols-[1fr_0.75fr_0.75fr_0.75fr_1fr_0.75fr] lg:items-center lg:gap-4"
            >
              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getActionBadgeClasses(entry.action)}`}
                >
                  {entry.action}
                </span>
              </div>
              <div className="mt-2 lg:mt-0">
                <span className="text-sm font-medium">{entry.entityType}</span>
              </div>
              <div className="mt-1 lg:mt-0">
                <span className="font-mono text-xs text-muted-foreground">
                  {entry.entityId.length > 12
                    ? `${entry.entityId.slice(0, 12)}...`
                    : entry.entityId}
                </span>
              </div>
              <div className="mt-1 lg:mt-0">
                {entry.userId ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {entry.userId.length > 12
                      ? `${entry.userId.slice(0, 12)}...`
                      : entry.userId}
                  </span>
                ) : (
                  <span className="text-xs italic text-muted-foreground">
                    System
                  </span>
                )}
              </div>
              <div className="mt-1 lg:mt-0">
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(entry.createdAt)}
                </span>
              </div>
              <div className="mt-1 lg:mt-0">
                {entry.ipAddress ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {entry.ipAddress}
                  </span>
                ) : (
                  <span className="text-xs italic text-muted-foreground">
                    N/A
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <ScrollText className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-semibold">No audit logs found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            There are no audit log entries to display yet.
          </p>
        </div>
      )}

      {/* Pagination */}
      {logsData && logsData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing page {logsData.page} of {logsData.totalPages} ({logsData.total} total entries)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background shadow-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-sm font-medium">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(logsData.totalPages, p + 1))}
              disabled={page >= logsData.totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background shadow-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
