"use client";

import Link from "next/link";
import {
  FolderGit2,
  Upload,
  Calendar,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileEdit,
  Send,
  Package,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";

interface SubmissionItem {
  id: string;
  appName: string;
  version: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  moduleId: string | null;
  moduleSlug: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
    icon: FileEdit,
  },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Send,
  },
  IN_REVIEW: {
    label: "In Review",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    icon: Clock,
  },
  CHANGES_REQUESTED: {
    label: "Changes Requested",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    icon: AlertCircle,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: XCircle,
  },
  DEFAULT: {
    label: "Unknown",
    className: "bg-muted text-muted-foreground",
    icon: Package,
  },
};

export default function SubmissionsPage() {
  const { data: submissions, isLoading } =
    trpc.hub.getMySubmissions.useQuery() as {
      data: SubmissionItem[] | undefined;
      isLoading: boolean;
    };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/hub"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hub
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <FolderGit2 className="h-8 w-8 text-primary" />
              My Submissions
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track the status of your module submissions.
            </p>
          </div>
          <Link
            href="/hub/publish"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            New Submission
          </Link>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG)
          .filter(([key]) => key !== "DEFAULT")
          .map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{config.label}</span>
              </div>
            );
          })}
      </div>

      {/* Submission list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : submissions && submissions.length > 0 ? (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const config = (STATUS_CONFIG[sub.status] || STATUS_CONFIG["DEFAULT"])!;
            const StatusIcon = config.icon;
            const displayDate = sub.submittedAt || sub.createdAt;

            return (
              <div
                key={sub.id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{sub.appName}</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      v{sub.version}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {sub.submittedAt
                        ? `Submitted ${new Date(displayDate).toLocaleDateString()}`
                        : `Created ${new Date(displayDate).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </span>

                  {/* View link if module exists */}
                  {sub.moduleSlug && (
                    <Link
                      href={`/store/${sub.moduleSlug}`}
                      className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <FolderGit2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No submissions yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit your first module to the FORGE Store for review.
          </p>
          <Link
            href="/hub/publish"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Publish Module
          </Link>
        </div>
      )}
    </div>
  );
}
