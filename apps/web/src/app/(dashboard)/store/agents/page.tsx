"use client";

import { Suspense, useState } from "react";
import { Bot, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { AgentModuleCard } from "@/components/store/agent-module-card";

export default function AgentStorePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <AgentStoreContent />
    </Suspense>
  );
}

function AgentStoreContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.store.listAgentModules.useQuery({
    query: query || undefined,
    page,
    limit: 12,
  });

  const utils = trpc.useUtils();

  const installMutation = trpc.store.installAgent.useMutation({
    onSuccess: () => {
      utils.store.listAgentModules.invalidate();
      utils.store.getInstalledAgents.invalidate();
    },
  });

  const totalPages = data ? Math.ceil(data.total / 12) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/store" className="hover:text-foreground transition-colors">
              Store
            </Link>
            <span>/</span>
            <span>Agents</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agent Marketplace</h1>
              <p className="text-sm text-muted-foreground">
                Browse and install community-built AI agents
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/store"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search agents..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-lg border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : !data || data.modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Bot className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-lg font-medium text-muted-foreground">No agents found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {query ? "Try a different search term" : "Be the first to publish an agent"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.total} agent{data.total !== 1 ? "s" : ""} available
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.modules.map((mod) => (
              <AgentModuleCard
                key={mod.id}
                module={mod}
                onInstall={(moduleId) => installMutation.mutate({ moduleId })}
                isInstalling={installMutation.isPending}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
