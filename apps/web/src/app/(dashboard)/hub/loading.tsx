export default function HubLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
