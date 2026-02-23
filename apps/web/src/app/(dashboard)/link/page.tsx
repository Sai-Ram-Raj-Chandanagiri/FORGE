import { Link2, Activity, Server } from "lucide-react";

export default function LinkPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Link2 className="h-8 w-8 text-primary" />
          FORGE Link
        </h1>
        <p className="mt-1 text-muted-foreground">
          Deploy, monitor, and orchestrate your software modules.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-muted-foreground">Running</span>
          </div>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-muted-foreground">Stopped</span>
          </div>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Total</span>
          </div>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <Server className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">No Deployments Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Docker orchestration, health monitoring, and service composition coming in Phase 3.
        </p>
      </div>
    </div>
  );
}
