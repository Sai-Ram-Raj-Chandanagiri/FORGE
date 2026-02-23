import { Users, FolderGit2, Upload, Package } from "lucide-react";
import Link from "next/link";

export default function HubPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Users className="h-8 w-8 text-primary" />
            FORGE Hub
          </h1>
          <p className="mt-1 text-muted-foreground">
            Collaborate with developers, publish modules, and showcase your work.
          </p>
        </div>
        <Link
          href="/hub/publish"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Publish Module
        </Link>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/hub/publish"
          className="group rounded-xl border bg-card p-6 transition-colors hover:border-primary/20 hover:shadow-sm"
        >
          <Upload className="mb-3 h-8 w-8 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            Publish a Module
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and submit a new module to the FORGE Store.
          </p>
        </Link>
        <Link
          href="/store/my-modules"
          className="group rounded-xl border bg-card p-6 transition-colors hover:border-primary/20 hover:shadow-sm"
        >
          <Package className="mb-3 h-8 w-8 text-primary" />
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            My Modules
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your published modules, versions, and submissions.
          </p>
        </Link>
      </div>

      {/* Placeholder for future Hub features */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <FolderGit2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">Developer Hub</h3>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Projects, collaboration, developer profiles, and submission pipeline coming in Phase 4.
        </p>
      </div>
    </div>
  );
}
