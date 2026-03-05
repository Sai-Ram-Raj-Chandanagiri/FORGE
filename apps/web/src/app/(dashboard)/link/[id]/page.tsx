"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Package,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Activity,
  Settings2,
  Clock,
  Server,
  Cpu,
  MemoryStick,
  Network,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
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

interface ContainerStats {
  cpuPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + (sizes[i] ?? "B");
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

  const { data: deployment, isLoading } = trpc.deployment.getById.useQuery(
    { id },
    { refetchInterval: (query) => {
      const status = (query.state.data as DeploymentDetail | undefined)?.status;
      return status === "PENDING" || status === "PROVISIONING" ? 3000 : false;
    }},
  ) as {
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

  const [logTab, setLogTab] = useState<"app" | "container">("app");

  const { data: containerStats } = trpc.deployment.getContainerStats.useQuery(
    { deploymentId: id },
    { enabled: deployment?.status === "RUNNING", refetchInterval: 10000 },
  ) as { data: ContainerStats | null | undefined };

  const { data: containerLogs, refetch: refetchContainerLogs } = trpc.deployment.getContainerLogs.useQuery(
    { deploymentId: id, tail: 100 },
    { enabled: deployment?.status === "RUNNING" || deployment?.status === "STOPPED" },
  ) as { data: { logs: string; available: boolean } | undefined; refetch: () => void };

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
        <BackButton fallback="/link" label="Back" />
      </div>
    );
  }

  const status = (STATUS_CONFIG[deployment.status] || STATUS_CONFIG["PENDING"])!;

  return (
    <div className="space-y-6">
      <BackButton fallback="/link" label="Back" />

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

      {/* Live Container Stats */}
      {deployment.status === "RUNNING" && containerStats && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Container Stats
            <span className="ml-auto text-xs font-normal text-muted-foreground">Auto-refreshes every 10s</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cpu className="h-4 w-4" />
                CPU Usage
              </div>
              <p className="mt-1 text-2xl font-bold">{containerStats.cpuPercent.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MemoryStick className="h-4 w-4" />
                Memory
              </div>
              <p className="mt-1 text-2xl font-bold">{containerStats.memoryUsageMb} MB</p>
              <p className="text-xs text-muted-foreground">
                {containerStats.memoryPercent.toFixed(1)}% of {containerStats.memoryLimitMb} MB
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Network className="h-4 w-4" />
                Network In
              </div>
              <p className="mt-1 text-2xl font-bold">{formatBytes(containerStats.networkRxBytes)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Network className="h-4 w-4" />
                Network Out
              </div>
              <p className="mt-1 text-2xl font-bold">{formatBytes(containerStats.networkTxBytes)}</p>
            </div>
          </div>
        </section>
      )}

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

      {/* Logs with tabs */}
      <section className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <button
              onClick={() => setLogTab("app")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                logTab === "app" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Application Logs
            </button>
            <button
              onClick={() => setLogTab("container")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                logTab === "container" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="mr-1 inline h-3.5 w-3.5" />
              Container Output
            </button>
          </div>
          {logTab === "container" && (
            <button
              onClick={() => refetchContainerLogs()}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          )}
        </div>

        {logTab === "app" ? (
          <LogViewer logs={deployment.logs} />
        ) : (
          <div className="rounded-lg bg-[#1e1e2e] p-4 font-mono text-xs text-green-400 max-h-96 overflow-y-auto whitespace-pre-wrap">
            {containerLogs?.available && containerLogs.logs ? (
              containerLogs.logs
            ) : (
              <span className="text-muted-foreground">
                {deployment.status === "RUNNING"
                  ? "No container output available yet..."
                  : "Container is not running. Start the deployment to see live output."}
              </span>
            )}
          </div>
        )}</section>
    </div>
  );
}
