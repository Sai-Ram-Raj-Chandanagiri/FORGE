"use client";

import Link from "next/link";
import { Package, Play, Square, RotateCcw, Trash2, Clock } from "lucide-react";

interface DeploymentCardProps {
  deployment: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    module: { name: string; slug: string; logoUrl: string | null };
    version: { version: string };
  };
  onStart?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onTerminate?: () => void;
  isPending?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  RUNNING: { label: "Running", color: "text-green-600 dark:text-green-400", dot: "bg-green-500" },
  STOPPED: { label: "Stopped", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  PENDING: { label: "Pending", color: "text-yellow-600 dark:text-yellow-400", dot: "bg-yellow-500" },
  PROVISIONING: { label: "Provisioning", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  FAILED: { label: "Failed", color: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  TERMINATED: { label: "Terminated", color: "text-muted-foreground", dot: "bg-muted-foreground/50" },
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DeploymentCard({
  deployment,
  onStart,
  onStop,
  onRestart,
  onTerminate,
  isPending,
}: DeploymentCardProps) {
  const status = (STATUS_CONFIG[deployment.status] || STATUS_CONFIG["PENDING"])!;

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
        {deployment.module.logoUrl ? (
          <img
            src={deployment.module.logoUrl}
            alt={deployment.module.name}
            className="h-8 w-8 rounded-md object-contain"
          />
        ) : (
          <Package className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/link/${deployment.id}`}
            className="font-semibold hover:text-primary truncate"
          >
            {deployment.name}
          </Link>
          <span className="flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full ${status.dot} ${deployment.status === "RUNNING" ? "animate-pulse" : ""}`} />
            <span className={status.color}>{status.label}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{deployment.module.name}</span>
          <span className="font-mono">v{deployment.version.version}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {deployment.startedAt ? timeAgo(deployment.startedAt) : timeAgo(deployment.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {deployment.status === "STOPPED" && onStart && (
          <button
            onClick={onStart}
            disabled={isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-green-600 transition-colors hover:bg-green-500/10 disabled:opacity-50"
            title="Start"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {deployment.status === "RUNNING" && (
          <>
            {onRestart && (
              <button
                onClick={onRestart}
                disabled={isPending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-blue-600 transition-colors hover:bg-blue-500/10 disabled:opacity-50"
                title="Restart"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {onStop && (
              <button
                onClick={onStop}
                disabled={isPending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-yellow-600 transition-colors hover:bg-yellow-500/10 disabled:opacity-50"
                title="Stop"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
        {deployment.status !== "TERMINATED" && onTerminate && (
          <button
            onClick={onTerminate}
            disabled={isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            title="Terminate"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <Link
          href={`/link/${deployment.id}`}
          className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
