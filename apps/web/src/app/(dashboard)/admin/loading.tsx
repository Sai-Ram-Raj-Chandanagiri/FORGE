export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-60 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div className="space-y-2">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
                <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
