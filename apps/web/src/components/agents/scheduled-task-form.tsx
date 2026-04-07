"use client";

import { useState } from "react";
import { X, Plus, Clock } from "lucide-react";

interface ScheduledTaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    agentType: string;
    cronExpression: string;
    actionType: string;
    payload: Record<string, unknown>;
  }) => void;
  isPending?: boolean;
}

const AGENT_TYPES = ["setup", "workflow", "monitor", "integration", "composer"];

export function ScheduledTaskForm({
  open,
  onClose,
  onSubmit,
  isPending,
}: ScheduledTaskFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentType, setAgentType] = useState("monitor");
  const [cronExpression, setCronExpression] = useState("0 * * * *");
  const [actionType, setActionType] = useState("");
  const [payloadStr, setPayloadStr] = useState("{}");
  const [payloadError, setPayloadError] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = JSON.parse(payloadStr) as Record<string, unknown>;
      setPayloadError("");
      onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        agentType,
        cronExpression: cronExpression.trim(),
        actionType: actionType.trim(),
        payload,
      });
    } catch {
      setPayloadError("Invalid JSON");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-primary" />
            Create Scheduled Task
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
            <label className="block text-xs font-medium mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              placeholder="Daily health check"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Describe what this task does..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Agent Type
              </label>
              <select
                value={agentType}
                onChange={(e) => setAgentType(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {AGENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Action Type
              </label>
              <input
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                required
                placeholder="health_check"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Cron Expression
            </label>
            <input
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              required
              placeholder="*/5 * * * *"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Format: minute hour day-of-month month day-of-week (e.g., &quot;0
              9 * * 1&quot; = every Monday at 9am)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Payload (JSON)
            </label>
            <textarea
              value={payloadStr}
              onChange={(e) => {
                setPayloadStr(e.target.value);
                setPayloadError("");
              }}
              rows={3}
              className={`w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                payloadError ? "border-red-500" : ""
              }`}
            />
            {payloadError && (
              <p className="mt-1 text-xs text-red-500">{payloadError}</p>
            )}
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
              {isPending ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
