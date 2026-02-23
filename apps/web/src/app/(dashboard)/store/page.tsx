import { Store, Search, Grid3X3 } from "lucide-react";

export default function StorePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Store className="h-8 w-8 text-primary" />
            FORGE Store
          </h1>
          <p className="mt-1 text-muted-foreground">
            Browse and acquire software modules for your organisation.
          </p>
        </div>
      </div>

      {/* Search bar placeholder */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search modules..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          disabled
        />
      </div>

      {/* Placeholder grid */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <Grid3X3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">Module Marketplace</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Module browsing, search, categories, and reviews coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
