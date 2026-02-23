import { Shield } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Shield className="h-8 w-8 text-primary" />
          Admin Panel
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage modules, users, deployments, and system settings.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">Admin Dashboard</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Module review queue, user management, and audit logs coming in Phase 6.
        </p>
      </div>
    </div>
  );
}
