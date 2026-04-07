"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

interface ApprovalCardProps {
  action: {
    id: string;
    actionType: string;
    agentType: string;
    priority: string;
    payload: unknown;
    createdAt: string;
    scheduledFor?: string | null;
  };
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL:
    "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  NORMAL:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400",
};

export function ApprovalCard({
  action,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: ApprovalCardProps) {
  const [showPayload, setShowPayload] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const priorityStyle =
    (PRIORITY_STYLES[action.priority] || PRIORITY_STYLES["NORMAL"])!;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{action.actionType}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
              {action.agentType}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityStyle}`}
            >
              {action.priority}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(action.createdAt).toLocaleString()}
            </span>
            {action.scheduledFor && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Scheduled: {new Date(action.scheduledFor).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Payload toggle */}
      <button
        onClick={() => setShowPayload(!showPayload)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPayload ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {showPayload ? "Hide" : "Show"} payload
      </button>
      {showPayload && (
        <pre className="rounded-lg bg-muted p-3 text-xs overflow-auto max-h-40">
          {JSON.stringify(action.payload, null, 2)}
        </pre>
      )}

      {/* Reject reason input */}
      {showRejectInput && (
        <div className="space-y-2">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onReject(action.id, rejectReason || undefined);
                setShowRejectInput(false);
                setRejectReason("");
              }}
              disabled={isRejecting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isRejecting ? "Rejecting..." : "Confirm Reject"}
            </button>
            <button
              onClick={() => {
                setShowRejectInput(false);
                setRejectReason("");
              }}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showRejectInput && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(action.id)}
            disabled={isApproving || isRejecting}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {isApproving ? "Approving..." : "Approve"}
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isApproving || isRejecting}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
