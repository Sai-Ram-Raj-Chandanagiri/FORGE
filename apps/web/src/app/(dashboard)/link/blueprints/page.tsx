"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Globe,
  Trash2,
  Download,
  Package,
  Loader2,
  Plus,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

interface BlueprintModule {
  moduleSlug: string;
  moduleName: string;
  version: string;
}

export default function MyBlueprintsPage() {
  const { data: blueprints, isLoading, refetch } = trpc.blueprint.list.useQuery() as {
    data: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      orgType: string | null;
      tags: string[];
      isPublic: boolean;
      usageCount: number;
      status: string;
      version: string;
      modules: unknown;
      createdAt: string;
      updatedAt: string;
    }[] | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const publishMut = trpc.blueprint.publish.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.blueprint.delete.useMutation({ onSuccess: () => refetch() });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = blueprints || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton fallback="/link" label="Back" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">My Blueprints</h1>
          <p className="text-sm text-muted-foreground">
            Saved platform compositions you can redeploy or share
          </p>
        </div>
        <Link
          href="/agents/chat?agent=composer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New Composition
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Layers className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No blueprints saved yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the <strong>Composer Agent</strong> to build a platform, then save it as a Blueprint.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((bp) => {
            const modules = (bp.modules as BlueprintModule[]) || [];
            return (
              <div key={bp.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{bp.name}</h3>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        v{bp.version}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          bp.status === "published"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : bp.status === "archived"
                              ? "bg-muted text-muted-foreground"
                              : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {bp.status}
                      </span>
                      {bp.isPublic && (
                        <Globe className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>

                    {bp.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{bp.description}</p>
                    )}

                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {modules.length} module{modules.length !== 1 ? "s" : ""}
                      </span>
                      {bp.orgType && (
                        <span>{bp.orgType.replace(/_/g, " ")}</span>
                      )}
                      <span>
                        {bp.usageCount} deploy{bp.usageCount !== 1 ? "s" : ""}
                      </span>
                      <span>
                        Updated {new Date(bp.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Deploy */}
                    <Link
                      href={`/agents/chat?agent=composer&blueprint=${bp.slug}`}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Redeploy
                    </Link>

                    {/* Publish */}
                    {!bp.isPublic && (
                      <button
                        onClick={() => publishMut.mutate({ id: bp.id })}
                        disabled={publishMut.isPending}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        title="Publish to store"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Export */}
                    <a
                      href="/api/export"
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      title="Export as ZIP"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>

                    {/* Delete */}
                    {confirmDelete === bp.id ? (
                      <button
                        onClick={() => {
                          deleteMut.mutate({ id: bp.id });
                          setConfirmDelete(null);
                        }}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(bp.id)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
