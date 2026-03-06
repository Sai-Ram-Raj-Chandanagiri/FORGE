"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Users,
  Crown,
  Loader2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  _count: { members: number };
  members: { role: string; user: { id: string; name: string | null; username: string; email: string } }[];
}

export default function OrganizationsPage() {
  const utils = trpc.useUtils();

  const { data: orgs, isLoading } = trpc.organization.getMyOrganizations.useQuery() as {
    data: OrgItem[] | undefined;
    isLoading: boolean;
  };

  const createMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      utils.organization.getMyOrganizations.invalidate();
      setShowCreate(false);
      setNewOrgName("");
      setNewOrgDesc("");
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    createMutation.mutate({
      name: newOrgName.trim(),
      description: newOrgDesc.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackButton fallback="/settings" label="Back" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <Building2 className="h-8 w-8 text-primary" />
              Organizations
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your organizations and team members.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Organization
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border bg-card p-6 space-y-4"
        >
          <h3 className="font-semibold">Create Organization</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="My Organization"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              value={newOrgDesc}
              onChange={(e) => setNewOrgDesc(e.target.value)}
              placeholder="What does this organization do?"
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!newOrgName.trim() || createMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Organization List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : orgs && orgs.length > 0 ? (
        <div className="space-y-4">
          {orgs.map((org) => (
            <div key={org.id} className="rounded-xl border bg-card">
              <button
                onClick={() =>
                  setExpandedOrg(expandedOrg === org.id ? null : org.id)
                }
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{org.name}</h3>
                  {org.description && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {org.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {org._count.members} member{org._count.members !== 1 ? "s" : ""}
                </div>
              </button>

              {/* Expanded Members */}
              {expandedOrg === org.id && (
                <div className="border-t px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Members
                    </h4>
                    <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <UserPlus className="h-3 w-3" />
                      Invite Member
                    </button>
                  </div>
                  <div className="space-y-2">
                    {org.members.map((member) => (
                      <div
                        key={member.user.id}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {(member.user.name || member.user.username)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {member.user.name || member.user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            member.role === "OWNER"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {member.role === "OWNER" && (
                            <Crown className="h-2.5 w-2.5" />
                          )}
                          {member.role}
                        </span>
                        {member.role !== "OWNER" && (
                          <button className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No organizations</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an organization to collaborate with your team.
          </p>
        </div>
      )}
    </div>
  );
}
