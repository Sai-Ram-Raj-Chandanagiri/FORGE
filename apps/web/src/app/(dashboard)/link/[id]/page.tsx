"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Activity,
  Settings2,
  Clock,
  Server,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { LogViewer } from "@/components/link/log-viewer";

interface DeploymentDetail {
  id: string;
  name: string;
  status: string;
  configuration: Record<string, string>;
  containerName: string | null;
  assignedPort: number | null;
  healthEndpoint: string | null;
  autoRestart: boolean;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  module: { id: string; name: string; slug: string; logoUrl: string | null; type: string };
  version: { id: string; version: string; dockerImage: string; configSchema: unknown; minResources: unknown };
  logs: { id: string; level: string; message: string; timestamp: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  RUNNING: { label: "Running", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  STOPPED: { label: "Stopped", color: "text-muted-foreground", bg: "bg-muted" },
  PENDING: { label: "Pending", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
  PROVISIONING: { label: "Provisioning", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  FAILED: { label: "Failed", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  TERMINATED: { label: "Terminated", color: "text-muted-foreground", bg: "bg-muted" },
};

export default function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: deployment, isLoading } = trpc.deployment.getById.useQuery({ id }) as {
    data: DeploymentDetail | undefined;
    isLoading: boolean;
  };

  const utils = trpc.useUtils();
  const startMut = trpc.deployment.start.useMutation({
    onSuccess: () => utils.deployment.getById.invalidate({ id }),
  });
  const stopMut = trpc.deployment.stop.useMutation({
    onSuccess: () => utils.deployment.getById.invalidate({ id }),
  });
  const restartMut = trpc.deployment.restart.useMutation({
    onSuccess: () => utils.deployment.getById.invalidate({ id }),
  });
  const terminateMut = trpc.deployment.terminate.useMutation({
    onSuccess: () => utils.deployment.getById.invalidate({ id }),
  });

  const isPending = startMut.isPending || stopMut.isPending || restartMut.isPending || terminateMut.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Server className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">Deployment not found</h2>
        <Link href="/link" className="mt-4 text-sm text-primary hover:underline">
          Back to FORGE Link
        </Link>
      </div>
    );
  }

  const status = (STATUS_CONFIG[deployment.status] || STATUS_CONFIG["PENDING"])!;

  return (
    <div className="space-y-6">
      <Link
        href="/link"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to FORGE Link
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border bg-muted">
            {deployment.module.logoUrl ? (
              <img
                src={deployment.module.logoUrl}
                alt={deployment.module.name}
                className="h-12 w-12 rounded-lg object-contain"
              />
            ) : (
              <Package className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{deployment.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{deployment.module.name}</span>
              <span className="font-mono">v{deployment.version.version}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {deployment.status === "STOPPED" && (
            <button
              onClick={() => startMut.mutate({ deploymentId: id })}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Start
            </button>
          )}
          {deployment.status === "RUNNING" && (
            <>
              <button
                onClick={() => restartMut.mutate({ deploymentId: id })}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
              <button
                onClick={() => stopMut.mutate({ deploymentId: id })}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium text-yellow-600 shadow-sm hover:bg-yellow-500/10 disabled:opacity-50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </>
          )}
          {deployment.status !== "TERMINATED" && (
            <button
              onClick={() => terminateMut.mutate({ deploymentId: id })}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Terminate
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {deployment.errorMessage && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {deployment.errorMessage}
        </div>
      )}

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Status
          </div>
          <p className={`mt-1 text-lg font-semibold ${status.color}`}>{status.label}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Docker Image
          </div>
          <p className="mt-1 text-sm font-mono truncate">{deployment.version.dockerImage}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Created
          </div>
          <p className="mt-1 text-sm">{new Date(deployment.createdAt).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Server className="h-4 w-4" />
            Auto-Restart
          </div>
          <p className="mt-1 text-sm font-semibold">{deployment.autoRestart ? "Enabled" : "Disabled"}</p>
        </div>
      </div>

      {/* Configuration */}
      {Object.keys(deployment.configuration).length > 0 && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">Configuration</h2>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs space-y-1">
            {Object.entries(deployment.configuration).map(([key, value]) => (
              <div key={key}>
                <span className="text-blue-500">{key}</span>
                <span className="text-muted-foreground">=</span>
                <span className="text-green-500">{String(value)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Logs */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">Logs</h2>
        <LogViewer logs={deployment.logs} />
      </section>
    </div>
  );
}
