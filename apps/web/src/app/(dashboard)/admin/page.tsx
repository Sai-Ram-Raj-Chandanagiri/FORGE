"use client";

import Link from "next/link";
import {
  Shield,
  Users,
  Package,
  BarChart3,
  ClipboardCheck,
  Server,
  Building2,
  ScrollText,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import type { SystemMetrics, ReviewQueueData } from "@/types/admin";

export default function AdminPage() {
  const { data: metrics } = trpc.admin.getSystemMetrics.useQuery() as {
    data: SystemMetrics | undefined;
  };

  const { data: reviewQueue } = trpc.admin.getReviewQueue.useQuery({
    page: 1,
    limit: 5,
  }) as { data: ReviewQueueData | undefined };

  const utils = trpc.useUtils();

  const reviewMutation = trpc.admin.reviewModule.useMutation({
    onSuccess: () => {
      utils.admin.getReviewQueue.invalidate();
      utils.admin.getSystemMetrics.invalidate();
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Shield className="h-8 w-8 text-primary" />
          Admin Panel
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage modules, users, deployments, and system settings.
        </p>
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Package className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics.publishedModules}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {metrics.totalModules}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Published / Total Modules
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Server className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics.runningDeployments}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {metrics.totalDeployments}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Running / Total Deployments
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Building2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics.totalOrganizations}
                </p>
                <p className="text-xs text-muted-foreground">Organizations</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/users"
          className="group rounded-xl border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/20"
        >
          <Users className="mb-2 h-6 w-6 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            User Management
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            View, search, and manage user accounts.
          </p>
        </Link>
        <Link
          href="/admin/audit"
          className="group rounded-xl border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/20"
        >
          <ScrollText className="mb-2 h-6 w-6 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            Audit Logs
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            View system activity and audit trail.
          </p>
        </Link>
        <Link
          href="/admin"
          className="group rounded-xl border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/20"
        >
          <BarChart3 className="mb-2 h-6 w-6 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            System Health
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor platform health and performance.
          </p>
        </Link>
      </div>

      {/* Module Review Queue */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Module Review Queue
        </h2>
        {reviewQueue && reviewQueue.modules.length > 0 ? (
          <div className="space-y-3">
            {reviewQueue.modules.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{mod.name}</h3>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {mod.shortDescription}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {mod.author.name || mod.author.username} &middot;{" "}
                    {new Date(mod.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        moduleId: mod.id,
                        action: "approve",
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        moduleId: mod.id,
                        action: "reject",
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-destructive px-3 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {reviewQueue.total > 5 && (
              <p className="text-center text-sm text-muted-foreground">
                {reviewQueue.total - 5} more modules pending review
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
            <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500/50" />
            <h3 className="font-semibold">All caught up!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No modules pending review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
