"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Package,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

const ORG_TYPES = [
  { value: "", label: "All" },
  { value: "ngo", label: "NGO" },
  { value: "startup", label: "Startup" },
  { value: "small_business", label: "Small Business" },
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
];

interface BlueprintModule {
  moduleSlug: string;
  moduleName: string;
  version: string;
}

export default function BrowseBlueprintsPage() {
  const [query, setQuery] = useState("");
  const [orgType, setOrgType] = useState("");

  const { data, isLoading } = trpc.blueprint.browse.useQuery(
    { query: query || undefined, orgType: orgType || undefined, limit: 20 },
  ) as {
    data: {
      items: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        orgType: string | null;
        tags: string[];
        usageCount: number;
        modules: unknown;
        version: string;
        author: { name: string | null; username: string; avatarUrl: string | null };
      }[];
      nextCursor?: string;
    } | undefined;
    isLoading: boolean;
  };

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton fallback="/store" label="Store" />
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Layers className="h-7 w-7 text-primary" />
            Blueprint Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">
            Pre-configured platform compositions — deploy a full platform in one click
          </p>
        </div>
        <Link
          href="/link/blueprints"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          My Blueprints
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blueprints..."
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {ORG_TYPES.map((ot) => (
            <button
              key={ot.value}
              onClick={() => setOrgType(ot.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                orgType === ot.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {ot.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Layers className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No blueprints found.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search or use the <strong>Composer Agent</strong> to build a custom platform.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((bp) => {
            const modules = (bp.modules as BlueprintModule[]) || [];
            return (
              <div key={bp.id} className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{bp.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      by {bp.author.name || bp.author.username} &middot; v{bp.version}
                    </p>
                  </div>
                  {bp.orgType && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {bp.orgType.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {bp.description && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{bp.description}</p>
                )}

                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {modules.length} module{modules.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {bp.usageCount} deploy{bp.usageCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {bp.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {bp.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <Link
                  href={`/agents/chat?agent=composer&blueprint=${bp.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Deploy <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
