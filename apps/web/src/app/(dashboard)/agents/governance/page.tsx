"use client";

import { Suspense, useState } from "react";
import {
  Shield,
  ScrollText,
  BarChart3,
  Trash2,
  Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { GuardrailEditor } from "@/components/agents/guardrail-editor";
import { AuditLogTable } from "@/components/agents/audit-log-table";
import { UsageAnalyticsCharts } from "@/components/agents/usage-analytics-charts";

type Tab = "guardrails" | "audit" | "usage";

interface GuardrailData {
  id: string;
  agentType: string | null;
  rules: unknown;
  isActive: boolean;
  createdAt: Date;
}

interface AuditEntry {
  id: string;
  agentType: string;
  action: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  durationMs: number | null;
  success: boolean;
  createdAt: string;
}

interface UsageData {
  totalTokens: number;
  totalCost: number;
  totalActions: number;
  actionsByType: Record<string, number>;
  errorRate: number;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    cost: number;
    actions: number;
  }>;
}

const TABS: { key: Tab; label: string; icon: typeof Shield }[] = [
  { key: "guardrails", label: "Guardrails", icon: Shield },
  { key: "audit", label: "Audit Log", icon: ScrollText },
  { key: "usage", label: "Usage Analytics", icon: BarChart3 },
];

function GovernanceContent() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("guardrails");
  const [showEditor, setShowEditor] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");

  // ==================== Guardrails ====================
  const { data: guardrails } = trpc.agent.getGuardrails.useQuery({}) as {
    data: GuardrailData[] | undefined;
  };

  const createGuardrail = trpc.agent.upsertGuardrail.useMutation({
    onSuccess: () => {
      void utils.agent.getGuardrails.invalidate();
      setShowEditor(false);
    },
  });

  const deleteGuardrail = trpc.agent.deleteGuardrail.useMutation({
    onSuccess: () => void utils.agent.getGuardrails.invalidate(),
  });

  // ==================== Audit Log ====================
  const { data: auditData } = trpc.agent.getAuditLog.useQuery({
    page: auditPage,
    limit: 20,
  }) as {
    data: { entries: AuditEntry[]; total: number } | undefined;
  };

  // ==================== Usage ====================
  const { data: usageData } = trpc.agent.getUsageAnalytics.useQuery({
    period,
  }) as { data: UsageData | undefined };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Shield className="h-8 w-8 text-primary" />
          AI Governance
        </h1>
        <p className="mt-1 text-muted-foreground">
          Guardrails, audit trails, and usage analytics for your AI agents.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "guardrails" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {guardrails?.length ?? 0} guardrail
              {guardrails?.length !== 1 ? "s" : ""} configured
            </p>
            <button
              onClick={() => setShowEditor(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Guardrail
            </button>
          </div>

          <GuardrailEditor
            open={showEditor}
            onClose={() => setShowEditor(false)}
            onSubmit={(data) => createGuardrail.mutate(data)}
            isPending={createGuardrail.isPending}
          />

          {guardrails && guardrails.length > 0 ? (
            <div className="space-y-3">
              {guardrails.map((g) => {
                const rules = g.rules as Record<string, unknown>;
                return (
                  <div
                    key={g.id}
                    className="rounded-xl border bg-card p-5 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">
                          {g.agentType || "Global"}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            g.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {g.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        {Array.isArray(rules.blockedActions) &&
                          rules.blockedActions.length > 0 && (
                            <span>
                              Blocked:{" "}
                              {(rules.blockedActions as string[]).join(", ")}
                            </span>
                          )}
                        {rules.maxActionsPerHour != null && (
                          <span>
                            Max/hr: {String(rules.maxActionsPerHour)}
                          </span>
                        )}
                        {Array.isArray(rules.requireApprovalFor) &&
                          rules.requireApprovalFor.length > 0 && (
                            <span>
                              Approval:{" "}
                              {(rules.requireApprovalFor as string[]).join(
                                ", ",
                              )}
                            </span>
                          )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Delete this guardrail?")) {
                          deleteGuardrail.mutate({ guardrailId: g.id });
                        }
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
              <Shield className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No guardrails configured</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add guardrails to control what your agents can do.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "audit" && (
        <AuditLogTable
          entries={auditData?.entries ?? []}
          total={auditData?.total ?? 0}
          page={auditPage}
          limit={20}
          onPageChange={setAuditPage}
        />
      )}

      {tab === "usage" && (
        <div className="space-y-4">
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>

          {usageData ? (
            <UsageAnalyticsCharts data={usageData} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
              <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GovernancePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      }
    >
      <GovernanceContent />
    </Suspense>
  );
}
