"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc-client";
import { Store, Link2, Package, Users, Activity, Bot, Cpu } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading } = trpc.user.getDashboard.useQuery();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Cpu className="h-8 w-8 text-primary" />
          Welcome back, {session?.user?.name?.split(" ")[0] || "User"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your FORGE workspace.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Purchased Modules"
            value={stats?.purchases ?? 0}
            icon={Store}
            description="From FORGE Store"
          />
          <StatCard
            title="Active Deployments"
            value={stats?.activeDeployments ?? 0}
            icon={Activity}
            description="Currently running"
          />
          <StatCard
            title="Total Deployments"
            value={stats?.deployments ?? 0}
            icon={Link2}
            description="Managed in FORGE Link"
          />
          <StatCard
            title="Published Modules"
            value={stats?.modules ?? 0}
            icon={Package}
            description="On FORGE Store"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="/store"
            className="group flex items-center gap-4 rounded-xl border p-5 transition-shadow hover:shadow-md"
          >
            <div className="rounded-lg bg-primary/10 p-3">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary">Browse Store</h3>
              <p className="text-sm text-muted-foreground">Find modules for your organisation</p>
            </div>
          </a>
          <a
            href="/link"
            className="group flex items-center gap-4 rounded-xl border p-5 transition-shadow hover:shadow-md"
          >
            <div className="rounded-lg bg-primary/10 p-3">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary">Manage Deployments</h3>
              <p className="text-sm text-muted-foreground">Monitor and control your modules</p>
            </div>
          </a>
          <a
            href="/hub"
            className="group flex items-center gap-4 rounded-xl border p-5 transition-shadow hover:shadow-md"
          >
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary">Explore Hub</h3>
              <p className="text-sm text-muted-foreground">Discover developer projects</p>
            </div>
          </a>
          <a
            href="/agents"
            className="group flex items-center gap-4 rounded-xl border p-5 transition-shadow hover:shadow-md"
          >
            <div className="rounded-lg bg-rose-500/10 p-3">
              <Bot className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <h3 className="font-semibold group-hover:text-primary">AI Agents</h3>
              <p className="text-sm text-muted-foreground">Compose platforms with AI agents</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
