"use client";

import { useState } from "react";
import {
  Users,
  Shield,
  Search,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";
import type { UserItem } from "@/types/admin";
import { isAdmin } from "@/lib/role-utils";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: usersData, isLoading } = trpc.admin.listUsers.useQuery({
    page,
    limit: 20,
    query: searchQuery || undefined,
    role: (roleFilter || undefined) as "ADMIN" | "ORG_ADMIN" | "DEVELOPER" | "USER" | undefined,
    status: (statusFilter || undefined) as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | undefined,
  }) as {
    data:
      | {
          users: UserItem[];
          total: number;
          page: number;
          totalPages: number;
        }
      | undefined;
    isLoading: boolean;
  };

  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.admin.updateUserStatus.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
    },
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "ORG_ADMIN":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "DEVELOPER":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "SUSPENDED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "PENDING_VERIFICATION":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackButton fallback="/admin" label="Back" />
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Users className="h-8 w-8 text-primary" />
          User Management
        </h1>
        <p className="mt-1 text-muted-foreground">
          View, search, and manage user accounts across the platform.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilter(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="ORG_ADMIN">Org Admin</option>
          <option value="DEVELOPER">Developer</option>
          <option value="USER">User</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending</option>
        </select>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : usersData && usersData.users.length > 0 ? (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_0.75fr_0.6fr_0.6fr_0.6fr] gap-4 rounded-lg bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>Name</span>
            <span>Email</span>
            <span>Username</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* User Rows */}
          {usersData.users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border bg-card p-4 sm:grid sm:grid-cols-[1fr_1fr_0.75fr_0.6fr_0.6fr_0.6fr] sm:items-center sm:gap-4"
            >
              <div className="font-medium">
                {user.name || (
                  <span className="text-muted-foreground italic">No name</span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground sm:mt-0">
                {user.email}
              </div>
              <div className="mt-1 text-sm text-muted-foreground sm:mt-0">
                @{user.username}
              </div>
              <div className="mt-2 sm:mt-0">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getRoleBadgeClasses(user.role)}`}
                >
                  {isAdmin(user.role) && (
                    <Shield className="h-3 w-3" />
                  )}
                  {user.role}
                </span>
              </div>
              <div className="mt-1 sm:mt-0">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusBadgeClasses(user.status)}`}
                >
                  {user.status}
                </span>
              </div>
              <div className="mt-3 flex justify-end sm:mt-0">
                {user.status === "SUSPENDED" ? (
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        userId: user.id,
                        status: "ACTIVE",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                    Activate
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        userId: user.id,
                        status: "SUSPENDED",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive px-3 text-xs font-medium text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserX className="h-3.5 w-3.5" />
                    )}
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-semibold">No users found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery || roleFilter || statusFilter
              ? "Try adjusting your search or filters."
              : "No users have been registered yet."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {usersData && usersData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing page {usersData.page} of {usersData.totalPages} ({usersData.total} total users)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background shadow-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-sm font-medium">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(usersData.totalPages, p + 1))}
              disabled={page >= usersData.totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background shadow-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
