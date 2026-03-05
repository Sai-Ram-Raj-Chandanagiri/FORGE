"use client";

import { Link2, Activity, Server, AlertTriangle, Plus, Package } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { DeploymentCard } from "@/components/link/deployment-card";

interface DeploymentItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  module: { name: string; slug: string; logoUrl: string | null };
  version: { version: string };
}

export default function LinkPage() {
  const { data: stats } = trpc.deployment.getStats.useQuery() as {
    data: { running: number; stopped: number; total: number; failed: number } | undefined;
  };
  const { data: deploymentsData, isLoading } = trpc.deployment.list.useQuery(
    { limit: 20 },
    { refetchInterval: (query) => {
      const deployments = (query.state.data as { deployments: DeploymentItem[] } | undefined)?.deployments;
      const hasProvisioning = deployments?.some((d) => d.status === "PENDING" || d.status === "PROVISIONING");
      return hasProvisioning ? 3000 : false;
    }},
  ) as {
    data: { deployments: DeploymentItem[]; total: number } | undefined;
    isLoading: boolean;
  };

  const utils = trpc.useUtils();

  const startMut = trpc.deployment.start.useMutation({
    onSuccess: () => {
      utils.deployment.list.invalidate();
      utils.deployment.getStats.invalidate();
    },
  });
  const stopMut = trpc.deployment.stop.useMutation({
    onSuccess: () => {
      utils.deployment.list.invalidate();
      utils.deployment.getStats.invalidate();
    },
  });
  const restartMut = trpc.deployment.restart.useMutation({
    onSuccess: () => {
      utils.deployment.list.invalidate();
      utils.deployment.getStats.invalidate();
    },
  });
  const terminateMut = trpc.deployment.terminate.useMutation({
    onSuccess: () => {
      utils.deployment.list.invalidate();
      utils.deployment.getStats.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Link2 className="h-8 w-8 text-primary" />
            FORGE Link
          </h1>
          <p className="mt-1 text-muted-foreground">
            Deploy, monitor, and orchestrate your software modules.
          </p>
        </div>
        <Link
          href="/link/deploy"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Deploy Module
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-muted-foreground">Running</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats?.running ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-muted-foreground">Stopped</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats?.stopped ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-muted-foreground">Failed</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats?.failed ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Total</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{stats?.total ?? 0}</p>
        </div>
      </div>

      {/* Deployment list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : deploymentsData && deploymentsData.deployments.length > 0 ? (
        <div className="space-y-3">
          {deploymentsData.deployments.map((dep) => (
            <DeploymentCard
              key={dep.id}
              deployment={dep}
              isPending={startMut.isPending || stopMut.isPending || restartMut.isPending || terminateMut.isPending}
              onStart={() => startMut.mutate({ deploymentId: dep.id })}
              onStop={() => stopMut.mutate({ deploymentId: dep.id })}
              onRestart={() => restartMut.mutate({ deploymentId: dep.id })}
              onTerminate={() => terminateMut.mutate({ deploymentId: dep.id })}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No Deployments Yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deploy a module from the Store to get started.
          </p>
          <Link
            href="/link/deploy"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Deploy Module
          </Link>
        </div>
      )}
    </div>
  );
}
