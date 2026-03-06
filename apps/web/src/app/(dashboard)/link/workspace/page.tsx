"use client";

import {
  Boxes,
  Power,
  PowerOff,
  ExternalLink,
  ArrowRightLeft,
  Trash2,
  Play,
  Square,
  Loader2,
  Server,
  Globe,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc-client";

interface ConnectedModule {
  deploymentId: string;
  name: string;
  moduleSlug: string;
  moduleName: string;
  logoUrl: string | null;
  status: string;
  assignedPort: number | null;
  proxyPath: string;
  directUrl: string | null;
}

interface BridgeInfo {
  id: string;
  name: string;
  sourceDeploymentId: string;
  targetDeploymentId: string;
  bridgeType: string;
  status: string;
  lastSyncAt: string | null;
  syncCount: number;
  errorMessage: string | null;
}

interface WorkspaceStatus {
  workspace: {
    id: string;
    name: string;
    status: string;
    proxyPort: number | null;
    portalUrl: string | null;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  };
  connectedModules: ConnectedModule[];
  bridges: BridgeInfo[];
}

export default function WorkspacePage() {
  const { data, isLoading, refetch } = trpc.workspace.getStatus.useQuery(undefined, {
    refetchInterval: 5000,
  }) as {
    data: WorkspaceStatus | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const utils = trpc.useUtils();

  const activateMut = trpc.workspace.activate.useMutation({
    onSuccess: () => {
      utils.workspace.getStatus.invalidate();
    },
  });

  const deactivateMut = trpc.workspace.deactivate.useMutation({
    onSuccess: () => {
      utils.workspace.getStatus.invalidate();
    },
  });

  const stopBridgeMut = trpc.workspace.stopBridge.useMutation({
    onSuccess: () => {
      utils.workspace.getStatus.invalidate();
    },
  });

  const startBridgeMut = trpc.workspace.startBridge.useMutation({
    onSuccess: () => {
      utils.workspace.getStatus.invalidate();
    },
  });

  const deleteBridgeMut = trpc.workspace.deleteBridge.useMutation({
    onSuccess: () => {
      utils.workspace.getStatus.invalidate();
    },
  });

  const [showCreateBridge, setShowCreateBridge] = useState(false);

  const workspace = data?.workspace;
  const modules = data?.connectedModules || [];
  const bridges = data?.bridges || [];
  const isActive = workspace?.status === "active";
  const isStarting = workspace?.status === "starting";

  // Find module name by deployment ID (for bridge display)
  const getModuleName = (deploymentId: string) => {
    const mod = modules.find((m) => m.deploymentId === deploymentId);
    return mod?.moduleName || deploymentId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Boxes className="h-8 w-8 text-primary" />
            Workspace
          </h1>
          <p className="mt-1 text-muted-foreground">
            Unified portal for all your deployed modules with data bridges
          </p>
        </div>

        {workspace && (
          <div className="flex items-center gap-3">
            {isActive && workspace.portalUrl && (
              <a
                href={workspace.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Globe className="h-4 w-4" />
                Open Portal
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {isActive ? (
              <button
                onClick={() => deactivateMut.mutate()}
                disabled={deactivateMut.isPending}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deactivateMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PowerOff className="h-4 w-4" />
                )}
                Deactivate
              </button>
            ) : (
              <button
                onClick={() => activateMut.mutate()}
                disabled={activateMut.isPending || isStarting}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {activateMut.isPending || isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {isStarting ? "Starting..." : "Activate Workspace"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {workspace?.status === "error" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Workspace Error</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.errorMessage || "An unknown error occurred"}
          </p>
        </div>
      )}

      {/* Workspace Status Banner */}
      {workspace && !isLoading && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  isActive
                    ? "bg-green-500 shadow-sm shadow-green-500/50"
                    : isStarting
                      ? "animate-pulse bg-yellow-500"
                      : "bg-gray-400"
                }`}
              />
              <div>
                <span className="font-medium">
                  {isActive ? "Active" : isStarting ? "Starting" : "Inactive"}
                </span>
                {isActive && workspace.portalUrl && (
                  <span className="ml-3 text-sm text-muted-foreground">
                    Portal: {workspace.portalUrl}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {modules.filter((m) => m.status === "RUNNING").length} modules running
              {" · "}
              {bridges.filter((b) => b.status === "running").length} bridges active
            </div>
          </div>
        </div>
      )}

      {/* Connected Modules */}
      {!isLoading && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Connected Modules</h2>
          {modules.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <Server className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 font-medium">No Deployed Modules</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Deploy modules from the FORGE Store to see them here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((mod) => (
                <div
                  key={mod.deploymentId}
                  className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {mod.logoUrl ? (
                        <img
                          src={mod.logoUrl}
                          alt={mod.moduleName}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Server className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{mod.moduleName}</h3>
                        <p className="text-xs text-muted-foreground">{mod.name}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        mod.status === "RUNNING"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : mod.status === "STOPPED"
                            ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {mod.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    {isActive && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        <span className="font-mono text-xs">{mod.proxyPath}</span>
                      </div>
                    )}
                    {mod.directUrl && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <a
                          href={mod.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs hover:text-primary"
                        >
                          {mod.directUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Bridges */}
      {!isLoading && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Data Bridges</h2>
            <button
              onClick={() => setShowCreateBridge(!showCreateBridge)}
              disabled={modules.length < 2}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              title={modules.length < 2 ? "Need at least 2 deployed modules" : ""}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Create Bridge
            </button>
          </div>

          {/* Create Bridge Form */}
          {showCreateBridge && (
            <CreateBridgeForm
              modules={modules}
              onClose={() => setShowCreateBridge(false)}
            />
          )}

          {bridges.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <ArrowRightLeft className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 font-medium">No Data Bridges</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create bridges to sync data between modules, or ask the Integration
                Agent to help.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bridges.map((bridge) => (
                <div
                  key={bridge.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        bridge.status === "running"
                          ? "bg-green-500 shadow-sm shadow-green-500/50"
                          : bridge.status === "error"
                            ? "bg-red-500"
                            : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <h3 className="font-medium">{bridge.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getModuleName(bridge.sourceDeploymentId)}
                        {" → "}
                        {getModuleName(bridge.targetDeploymentId)}
                        <span className="ml-2 text-xs">
                          ({bridge.bridgeType})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">
                        {bridge.syncCount} syncs
                      </div>
                      {bridge.lastSyncAt && (
                        <div className="text-xs text-muted-foreground">
                          Last:{" "}
                          {new Date(bridge.lastSyncAt).toLocaleTimeString()}
                        </div>
                      )}
                      {bridge.errorMessage && (
                        <div className="text-xs text-destructive">
                          {bridge.errorMessage}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {bridge.status === "running" ? (
                        <button
                          onClick={() =>
                            stopBridgeMut.mutate({ bridgeId: bridge.id })
                          }
                          disabled={stopBridgeMut.isPending}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title="Stop bridge"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            startBridgeMut.mutate({ bridgeId: bridge.id })
                          }
                          disabled={
                            startBridgeMut.isPending || !isActive
                          }
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                          title="Start bridge"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          deleteBridgeMut.mutate({ bridgeId: bridge.id })
                        }
                        disabled={deleteBridgeMut.isPending}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete bridge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create Bridge Form Component ──

function CreateBridgeForm({
  modules,
  onClose,
}: {
  modules: ConnectedModule[];
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const createBridgeMut = trpc.workspace.createBridge.useMutation({
    onSuccess: () => {
      utils.workspace.getStatus.invalidate();
      onClose();
    },
  });

  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [bridgeType, setBridgeType] = useState<"polling" | "webhook" | "event_stream">("polling");
  const [syncFrequency, setSyncFrequency] = useState(30);
  const [sourceEndpoint, setSourceEndpoint] = useState("/api/data");
  const [targetEndpoint, setTargetEndpoint] = useState("/api/data");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sourceId || !targetId) return;

    createBridgeMut.mutate({
      name,
      sourceDeploymentId: sourceId,
      targetDeploymentId: targetId,
      bridgeType,
      configuration: {
        syncFrequencySeconds: syncFrequency,
        sourceEndpoint,
        targetEndpoint,
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border bg-card p-4 space-y-4"
    >
      <h3 className="font-medium">New Data Bridge</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Bridge Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., CRM → Donor Sync"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Bridge Type</label>
          <select
            value={bridgeType}
            onChange={(e) => setBridgeType(e.target.value as typeof bridgeType)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="polling">Polling</option>
            <option value="webhook">Webhook</option>
            <option value="event_stream">Event Stream</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Source Module</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select source...</option>
            {modules.map((m) => (
              <option key={m.deploymentId} value={m.deploymentId}>
                {m.moduleName} ({m.name})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Target Module</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Select target...</option>
            {modules
              .filter((m) => m.deploymentId !== sourceId)
              .map((m) => (
                <option key={m.deploymentId} value={m.deploymentId}>
                  {m.moduleName} ({m.name})
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Sync Interval (seconds)
          </label>
          <input
            type="number"
            value={syncFrequency}
            onChange={(e) => setSyncFrequency(Number(e.target.value))}
            min={5}
            max={3600}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Source Endpoint
          </label>
          <input
            type="text"
            value={sourceEndpoint}
            onChange={(e) => setSourceEndpoint(e.target.value)}
            placeholder="/api/data"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Target Endpoint
          </label>
          <input
            type="text"
            value={targetEndpoint}
            onChange={(e) => setTargetEndpoint(e.target.value)}
            placeholder="/api/data"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={createBridgeMut.isPending || !name || !sourceId || !targetId}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {createBridgeMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Create Bridge"
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        {createBridgeMut.isError && (
          <span className="text-sm text-destructive">
            {createBridgeMut.error.message}
          </span>
        )}
      </div>
    </form>
  );
}
