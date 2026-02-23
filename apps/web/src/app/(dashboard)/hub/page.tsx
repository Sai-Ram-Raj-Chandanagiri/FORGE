import { Users, FolderGit2 } from "lucide-react";

export default function HubPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Users className="h-8 w-8 text-primary" />
          FORGE Hub
        </h1>
        <p className="mt-1 text-muted-foreground">
          Collaborate with developers, publish modules, and showcase your work.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <FolderGit2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">Developer Hub</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Projects, collaboration, and module publishing pipeline coming in Phase 4.
        </p>
      </div>
    </div>
  );
}
