"use client";

import { Suspense, useState } from "react";
import { ShieldCheck, Inbox } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { ApprovalCard } from "@/components/agents/approval-card";

function ApprovalsContent() {
  const utils = trpc.useUtils();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data, isPending: isLoading } = trpc.agent.listPendingApprovals.useQuery(
    { page: 1, limit: 20 },
  ) as {
    data: { items: Array<{
      id: string;
      actionType: string;
      agentType: string;
      priority: string;
      payload: unknown;
      createdAt: Date;
      scheduledFor: Date | null;
    }>; total: number } | undefined;
    isPending: boolean;
  };

  const approveMutation = trpc.agent.approveAction.useMutation({
    onSuccess: () => {
      void utils.agent.listPendingApprovals.invalidate();
      setApprovingId(null);
    },
    onError: () => setApprovingId(null),
  });

  const rejectMutation = trpc.agent.rejectAction.useMutation({
    onSuccess: () => {
      void utils.agent.listPendingApprovals.invalidate();
      setRejectingId(null);
    },
    onError: () => setRejectingId(null),
  });

  const handleApprove = (id: string) => {
    setApprovingId(id);
    approveMutation.mutate({ actionId: id });
  };

  const handleReject = (id: string, reason?: string) => {
    setRejectingId(id);
    rejectMutation.mutate({ actionId: id, reason });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Pending Approvals
        </h1>
        <p className="mt-1 text-muted-foreground">
          Review and approve or reject queued agent actions.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {data.total} action{data.total !== 1 ? "s" : ""} awaiting approval
          </p>
          {data.items.map((action) => (
            <ApprovalCard
              key={action.id}
              action={{
                ...action,
                createdAt: new Date(action.createdAt).toISOString(),
                scheduledFor: action.scheduledFor
                  ? new Date(action.scheduledFor).toISOString()
                  : null,
              }}
              onApprove={handleApprove}
              onReject={handleReject}
              isApproving={approvingId === action.id && approveMutation.isPending}
              isRejecting={rejectingId === action.id && rejectMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No pending approvals</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Actions requiring approval will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      }
    >
      <ApprovalsContent />
    </Suspense>
  );
}
