export default function StoreLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="flex items-center justify-between">
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
