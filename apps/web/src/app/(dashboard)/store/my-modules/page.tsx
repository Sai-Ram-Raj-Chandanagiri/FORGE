"use client";

import { Package, Plus, PencilLine, Send, Archive } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

interface ModuleListItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  status: string;
  logoUrl: string | null;
  author: { id: string; name: string | null; username: string; avatarUrl: string | null };
  categories: { category: { name: string; slug: string } }[];
  tags: { tag: { name: string; slug: string } }[];
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: { label: "Pending Review", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  APPROVED: { label: "Approved", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  PUBLISHED: { label: "Published", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  REJECTED: { label: "Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  ARCHIVED: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

export default function MyModulesPage() {
  const { data: modules, isLoading } = trpc.module.getMyModules.useQuery() as {
    data: ModuleListItem[] | undefined;
    isLoading: boolean;
  };
  const utils = trpc.useUtils();

  const publishMutation = trpc.module.publish.useMutation({
    onSuccess: () => utils.module.getMyModules.invalidate(),
  });
  const archiveMutation = trpc.module.archive.useMutation({
    onSuccess: () => utils.module.getMyModules.invalidate(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Package className="h-8 w-8 text-primary" />
            My Published Modules
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage modules you&apos;ve created and published.
          </p>
        </div>
        <Link
          href="/hub/publish"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Module
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : modules && modules.length > 0 ? (
        <div className="space-y-3">
          {modules.map((mod) => {
            const badge = (STATUS_BADGES[mod.status] || STATUS_BADGES["DRAFT"])!;
            return (
              <div
                key={mod.id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
                  {mod.logoUrl ? (
                    <img src={mod.logoUrl} alt={mod.name} className="h-10 w-10 rounded-md object-contain" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{mod.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{mod.shortDescription}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/store/${mod.slug}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <PencilLine className="h-3 w-3" />
                    View
                  </Link>
                  {mod.status === "DRAFT" && (
                    <button
                      onClick={() => publishMutation.mutate({ moduleId: mod.id })}
                      disabled={publishMutation.isPending}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      Submit
                    </button>
                  )}
                  {(mod.status === "PUBLISHED" || mod.status === "APPROVED") && (
                    <button
                      onClick={() => archiveMutation.mutate({ moduleId: mod.id })}
                      disabled={archiveMutation.isPending}
                      className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Archive className="h-3 w-3" />
                      Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No modules yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and publish your first module to the FORGE Store.
          </p>
          <Link
            href="/hub/publish"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Module
          </Link>
        </div>
      )}
    </div>
  );
}
