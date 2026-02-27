"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Settings, CreditCard, Building2, ChevronRight } from "lucide-react";

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

        {/* Quick links */}
        <div className="space-y-3">
          <Link
            href="/settings/billing"
            className="flex items-center justify-between rounded-xl border bg-card p-5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Billing & Usage</h3>
                <p className="text-xs text-muted-foreground">Manage subscriptions, view usage and purchase history</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/settings/organizations"
            className="flex items-center justify-between rounded-xl border bg-card p-5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Organizations</h3>
                <p className="text-xs text-muted-foreground">Manage your organizations and team members</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
