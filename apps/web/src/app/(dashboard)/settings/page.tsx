"use client";

import { useSession } from "next-auth/react";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile section */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={session?.user?.name || ""}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <input
                type="text"
                value={session?.user?.username || ""}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <input
                type="text"
                value={session?.user?.role || ""}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm capitalize"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-dashed bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">More Settings</h2>
          <p className="text-sm text-muted-foreground">
            Organization management, billing, connected accounts, and notification preferences
            will be available in later phases.
          </p>
        </div>
      </div>
    </div>
  );
}
