export default function LinkLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-44 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-60 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-56 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
