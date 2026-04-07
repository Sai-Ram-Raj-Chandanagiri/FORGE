"use client";

import { useState } from "react";
import { X, Shield, Plus } from "lucide-react";

interface GuardrailRules {
  allowedActions?: string[];
  blockedActions?: string[];
  maxActionsPerHour?: number;
  requireApprovalFor?: string[];
}

interface GuardrailEditorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    agentType?: string;
    rules: GuardrailRules;
    isActive?: boolean;
  }) => void;
  defaultValues?: {
    agentType?: string | null;
    rules?: unknown;
    isActive?: boolean;
  };
  isPending?: boolean;
}

const AGENT_TYPES = ["setup", "workflow", "monitor", "integration", "composer"];

export function GuardrailEditor({
  open,
  onClose,
  onSubmit,
  defaultValues,
  isPending,
}: GuardrailEditorProps) {
  const existingRules = (defaultValues?.rules as GuardrailRules) || {};

  const [agentType, setAgentType] = useState(defaultValues?.agentType ?? "");
  const [blockedActions, setBlockedActions] = useState(
    existingRules.blockedActions?.join(", ") ?? "",
  );
  const [allowedActions, setAllowedActions] = useState(
    existingRules.allowedActions?.join(", ") ?? "",
  );
  const [maxActionsPerHour, setMaxActionsPerHour] = useState(
    existingRules.maxActionsPerHour?.toString() ?? "",
  );
  const [requireApprovalFor, setRequireApprovalFor] = useState(
    existingRules.requireApprovalFor?.join(", ") ?? "",
  );
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

  if (!open) return null;

  const parseCommaSeparated = (val: string): string[] | undefined => {
    const items = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rules: GuardrailRules = {};
    const blocked = parseCommaSeparated(blockedActions);
    if (blocked) rules.blockedActions = blocked;
    const allowed = parseCommaSeparated(allowedActions);
    if (allowed) rules.allowedActions = allowed;
    if (maxActionsPerHour.trim()) {
      const n = parseInt(maxActionsPerHour, 10);
      if (!isNaN(n) && n > 0) rules.maxActionsPerHour = n;
    }
    const approval = parseCommaSeparated(requireApprovalFor);
    if (approval) rules.requireApprovalFor = approval;

    onSubmit({
      agentType: agentType || undefined,
      rules,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            {defaultValues ? "Edit Guardrail" : "Add Guardrail"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Agent Type
            </label>
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Global (all agents)</option>
              {AGENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Blocked Actions
            </label>
            <input
              value={blockedActions}
              onChange={(e) => setBlockedActions(e.target.value)}
              placeholder="deploy_module, delete_bridge"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Comma-separated action types that will be blocked entirely
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Allowed Actions{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              value={allowedActions}
              onChange={(e) => setAllowedActions(e.target.value)}
              placeholder="search_modules, get_module_details"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              If set, only these actions are allowed. Leave empty to allow all
              (except blocked).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Max Actions Per Hour
            </label>
            <input
              value={maxActionsPerHour}
              onChange={(e) => setMaxActionsPerHour(e.target.value)}
              type="number"
              min={1}
              max={1000}
              placeholder="100"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Require Approval For
            </label>
            <input
              value={requireApprovalFor}
              onChange={(e) => setRequireApprovalFor(e.target.value)}
              placeholder="deploy_module, stop_deployment, send_notification"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              These actions will be queued for your approval before executing.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isActive ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <label className="text-sm font-medium">
              {isActive ? "Active" : "Inactive"}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Saving..." : "Save Guardrail"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
