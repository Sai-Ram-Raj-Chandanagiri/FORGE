export default function AgentsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-52 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-1.5">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
