"use client";

import { Suspense } from "react";
import { Store, Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { ModuleGrid } from "@/components/store/module-grid";
import { SearchBar } from "@/components/store/search-bar";
import { CategoryNav } from "@/components/store/category-nav";
import { SortSelect } from "@/components/store/sort-select";
import { PricingFilter } from "@/components/store/pricing-filter";
import { Pagination } from "@/components/store/pagination";

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <StoreContent />
    </Suspense>
  );
}

function StoreContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || undefined;
  const categorySlug = searchParams.get("category") || undefined;
  const pricingModel = (searchParams.get("pricing") || undefined) as
    | "FREE"
    | "ONE_TIME"
    | "SUBSCRIPTION_MONTHLY"
    | "SUBSCRIPTION_YEARLY"
    | "USAGE_BASED"
    | undefined;
  const sortBy =
    (searchParams.get("sort") as "relevance" | "newest" | "popular" | "rating" | "name") ||
    "relevance";
  const page = parseInt(searchParams.get("page") || "1", 10);

  type ModuleItem = Parameters<typeof ModuleGrid>[0]["modules"][0];
  type CategoryItem = { id: string; name: string; slug: string; children: unknown[]; _count: { modules: number } };

  const { data: browseData, isLoading: isBrowsing } = trpc.store.browse.useQuery({
    query,
    categorySlug,
    pricingModel,
    sortBy,
    page,
    limit: 12,
  }) as { data: { modules: ModuleItem[]; total: number; page: number; limit: number; totalPages: number } | undefined; isLoading: boolean };

  const { data: categories } = trpc.store.getCategories.useQuery() as {
    data: CategoryItem[] | undefined;
  };
  const { data: featured } = trpc.store.getFeatured.useQuery(undefined, {
    enabled: !query && !categorySlug && !pricingModel && page === 1,
  }) as { data: ModuleItem[] | undefined };

  const showFeatured =
    !query && !categorySlug && !pricingModel && page === 1 && featured && featured.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Store className="h-8 w-8 text-primary" />
          FORGE Store
        </h1>
        <p className="mt-1 text-muted-foreground">
          Discover and acquire modules for your organization.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar — categories */}
        <aside className="w-full shrink-0 lg:w-56">
          <div className="sticky top-4 rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Categories</h2>
            {categories ? (
              <CategoryNav
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  _count: { modules: c._count.modules },
                }))}
              />
            ) : (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Search + filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar />
            </div>
            <div className="flex gap-2">
              <PricingFilter />
              <SortSelect />
            </div>
          </div>

          {/* Featured section */}
          {showFeatured && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Package className="h-5 w-5 text-primary" />
                Featured Modules
              </h2>
              <ModuleGrid modules={featured} />
            </section>
          )}

          {/* Browse results */}
          <section>
            {(query || categorySlug || pricingModel) && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {browseData
                    ? `${browseData.total} module${browseData.total !== 1 ? "s" : ""} found`
                    : "Searching..."}
                </p>
              </div>
            )}

            {isBrowsing ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted" />
                ))}
              </div>
            ) : browseData ? (
              <>
                <ModuleGrid
                  modules={browseData.modules}
                  emptyMessage={
                    query
                      ? `No modules matching "${query}"`
                      : "No modules in this category yet"
                  }
                />
                {browseData.totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={browseData.page}
                      totalPages={browseData.totalPages}
                    />
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
