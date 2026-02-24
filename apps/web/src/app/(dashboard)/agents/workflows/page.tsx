"use client";

import Link from "next/link";
import {
  Workflow,
  Zap,
  Trash2,
  ArrowLeft,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  triggerEvent: string;
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const utils = trpc.useUtils();

  const { data: workflows, isLoading } = trpc.agent.listWorkflows.useQuery() as {
    data: WorkflowItem[] | undefined;
    isLoading: boolean;
  };

  const toggleWorkflow = trpc.agent.toggleWorkflow.useMutation({
    onSuccess: () => {
      utils.agent.listWorkflows.invalidate();
    },
  });

  const deleteWorkflow = trpc.agent.deleteWorkflow.useMutation({
    onSuccess: () => {
      utils.agent.listWorkflows.invalidate();
    },
  });

  function handleToggle(id: string, currentStatus: boolean) {
    toggleWorkflow.mutate({ id, isActive: !currentStatus });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete the workflow "${name}"?`)) {
      return;
    }
    deleteWorkflow.mutate({ id });
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/agents"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Link>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Workflow className="h-8 w-8 text-emerald-500" />
            Workflow Manager
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your cross-module automations and workflow rules.
          </p>
        </div>
        <Link
          href="/agents/chat?agent=workflow"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border bg-card p-5"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-8 w-20 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!workflows || workflows.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Workflow className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">No workflows yet</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create your first automation by chatting with the Workflow Agent. Describe what you
            want to automate in natural language.
          </p>
          <Link
            href="/agents/chat?agent=workflow"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </Link>
        </div>
      )}

      {/* Workflow List */}
      {!isLoading && workflows && workflows.length > 0 && (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="rounded-xl border bg-card p-5 transition-all hover:shadow-sm"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`rounded-lg p-2.5 ${
                    wf.isActive
                      ? "bg-emerald-500/10"
                      : "bg-muted"
                  }`}
                >
                  <Zap
                    className={`h-5 w-5 ${
                      wf.isActive
                        ? "text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{wf.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        wf.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {wf.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {wf.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {wf.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Trigger: {wf.triggerEvent}
                    </span>
                    <span>
                      Last triggered: {formatDate(wf.lastTriggered)}
                    </span>
                    <span>Created: {formatDate(wf.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(wf.id, wf.isActive)}
                    disabled={toggleWorkflow.isPending}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                      wf.isActive
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    }`}
                    title={wf.isActive ? "Disable workflow" : "Enable workflow"}
                  >
                    {wf.isActive ? (
                      <>
                        <PowerOff className="h-3.5 w-3.5" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="h-3.5 w-3.5" />
                        Enable
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id, wf.name)}
                    disabled={deleteWorkflow.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    title="Delete workflow"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
