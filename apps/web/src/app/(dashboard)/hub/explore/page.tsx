"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Star,
  MessageSquare,
  Tag,
  SlidersHorizontal,
  FolderGit2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stars: number;
  status: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  tags: { tag: { name: string; slug: string } }[];
  _count: { comments: number; collaborators: number };
}

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Alphabetical" },
] as const;

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border bg-muted"
              />
            ))}
          </div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || undefined;
  const tagsParam = searchParams.get("tags") || undefined;
  const sortBy =
    (searchParams.get("sort") as "popular" | "newest" | "name") || "popular";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const selectedTags = tagsParam ? tagsParam.split(",") : [];

  const [searchInput, setSearchInput] = useState(query || "");

  const { data: projectsData, isLoading } = trpc.hub.listProjects.useQuery({
    query,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    sortBy,
    page,
    limit: 12,
  }) as {
    data:
      | { projects: ProjectItem[]; total: number; page: number; totalPages: number }
      | undefined;
    isLoading: boolean;
  };

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Reset page when filters change (unless page itself is being set)
    if (!("page" in updates)) {
      params.delete("page");
    }
    router.push(`/hub/explore?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ q: searchInput || undefined });
  }

  function toggleTag(tagSlug: string) {
    const newTags = selectedTags.includes(tagSlug)
      ? selectedTags.filter((t) => t !== tagSlug)
      : [...selectedTags, tagSlug];
    updateParams({
      tags: newTags.length > 0 ? newTags.join(",") : undefined,
    });
  }

  function clearTag(tagSlug: string) {
    const newTags = selectedTags.filter((t) => t !== tagSlug);
    updateParams({
      tags: newTags.length > 0 ? newTags.join(",") : undefined,
    });
  }

  // Collect unique tags from the results for suggestion chips
  const availableTags: { name: string; slug: string }[] = [];
  const seenSlugs = new Set<string>();
  if (projectsData) {
    for (const project of projectsData.projects) {
      for (const pt of project.tags) {
        if (!seenSlugs.has(pt.tag.slug)) {
          seenSlugs.add(pt.tag.slug);
          availableTags.push(pt.tag);
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackButton fallback="/hub" label="Back" />
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <FolderGit2 className="h-8 w-8 text-primary" />
          Explore Projects
        </h1>
        <p className="mt-1 text-muted-foreground">
          Discover community projects, contribute, and collaborate.
        </p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search projects by name or description..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active tag filters */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          {selectedTags.map((slug) => (
            <button
              key={slug}
              onClick={() => clearTag(slug)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <Tag className="h-3 w-3" />
              {slug}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={() => updateParams({ tags: undefined })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Tag suggestions */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag.slug}
              onClick={() => toggleTag(tag.slug)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.includes(tag.slug)
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <Tag className="mr-1 inline h-3 w-3" />
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {projectsData && (query || selectedTags.length > 0) && (
        <p className="text-sm text-muted-foreground">
          {projectsData.total} project{projectsData.total !== 1 ? "s" : ""}{" "}
          found
        </p>
      )}

      {/* Project Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : projectsData && projectsData.projects.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsData.projects.map((project) => (
              <Link
                key={project.id}
                href={`/hub/projects/${project.slug}`}
                className="group rounded-xl border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/20"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                    {project.name}
                  </h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {project.description || "No description"}
                </p>

                {/* Tags */}
                {project.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((pt) => (
                      <span
                        key={pt.tag.slug}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {pt.tag.name}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta row */}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {project.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {project._count.comments}
                  </span>
                  <span className="ml-auto truncate">
                    by {project.author.name || project.author.username}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {projectsData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() =>
                  updateParams({ page: String(page - 1) })
                }
                disabled={page <= 1}
                className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {projectsData.page} of {projectsData.totalPages}
              </span>
              <button
                onClick={() =>
                  updateParams({ page: String(page + 1) })
                }
                disabled={page >= projectsData.totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <FolderGit2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No projects found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {query
              ? `No projects matching "${query}". Try a different search term.`
              : selectedTags.length > 0
                ? "No projects match the selected tags. Try removing some filters."
                : "No projects have been published yet. Be the first to create one!"}
          </p>
          {(query || selectedTags.length > 0) && (
            <button
              onClick={() => {
                setSearchInput("");
                router.push("/hub/explore");
              }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
