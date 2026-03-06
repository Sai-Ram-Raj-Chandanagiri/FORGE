"use client";

import Link from "next/link";
import {
  Bot,
  Workflow,
  Activity,
  Plug,
  Layers,
  MessageSquare,
  Zap,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";

interface InsightsData {
  activeDeployments: number;
  activeWorkflows: number;
  totalConversations: number;
  insights: { type: string; title: string; description: string }[];
}

const AGENT_CARDS = [
  {
    type: "composer" as const,
    label: "Platform Composer",
    description:
      "Build complete platforms from FORGE modules using conversation. Search, deploy, connect, and deliver — all in one flow.",
    icon: Layers,
    href: "/agents/chat?agent=composer",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    featured: true,
  },
  {
    type: "setup" as const,
    label: "Setup Agent",
    description:
      "Conversational onboarding — describe your organization and get module recommendations with one-click deploy.",
    icon: Bot,
    href: "/agents/chat?agent=setup",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    type: "workflow" as const,
    label: "Workflow Agent",
    description:
      "Create cross-module automations using natural language. Connect events, conditions, and actions.",
    icon: Workflow,
    href: "/agents/chat?agent=workflow",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    type: "monitor" as const,
    label: "Monitor Agent",
    description:
      "Intelligent anomaly detection, cost optimization, and scaling recommendations for your deployments.",
    icon: Activity,
    href: "/agents/chat?agent=monitor",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    type: "integration" as const,
    label: "Integration Agent",
    description:
      "Analyze module APIs, create data bridges, and generate Docker Compose configs for connected services.",
    icon: Plug,
    href: "/agents/chat?agent=integration",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export default function AgentsPage() {
  const { data: insights } = trpc.agent.getInsights.useQuery() as {
    data: InsightsData | undefined;
  };

  const { data: conversations } = trpc.agent.listConversations.useQuery({
    limit: 5,
  }) as {
    data:
      | {
          id: string;
          agentType: string;
          status: string;
          messageCount: number;
          lastMessage: string | null;
          updatedAt: string;
        }[]
      | undefined;
  };

  const { data: workflows } = trpc.agent.listWorkflows.useQuery() as {
    data:
      | {
          id: string;
          name: string;
          triggerEvent: string;
          isActive: boolean;
          lastTriggered: string | null;
        }[]
      | undefined;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Bot className="h-8 w-8 text-primary" />
          FORGE Agents
        </h1>
        <p className="mt-1 text-muted-foreground">
          AI-powered agents for setup, workflow automation, monitoring, and
          integration.
        </p>
      </div>

      {/* Stats */}
      {insights && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {insights.activeDeployments}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active Deployments
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Zap className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {insights.activeWorkflows}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active Workflows
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {insights.totalConversations}
                </p>
                <p className="text-xs text-muted-foreground">
                  Agent Conversations
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Choose an Agent</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {AGENT_CARDS.map((agent) => {
            const Icon = agent.icon;
            return (
              <Link
                key={agent.type}
                href={agent.href}
                className="group rounded-xl border bg-card p-6 transition-all hover:shadow-sm hover:border-primary/20"
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-2.5 ${agent.bgColor}`}>
                    <Icon className={`h-6 w-6 ${agent.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {agent.label}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Conversations</h2>
            <Link
              href="/agents/conversations"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {conversations && conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const agentInfo = AGENT_CARDS.find(
                  (a) => a.type === conv.agentType,
                );
                const Icon = agentInfo?.icon ?? Bot;
                return (
                  <Link
                    key={conv.id}
                    href={`/agents/chat?conversation=${conv.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Icon
                      className={`h-5 w-5 ${agentInfo?.color ?? "text-primary"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {agentInfo?.label ?? conv.agentType}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.lastMessage ?? "No messages yet"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {conv.messageCount} msgs
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No conversations yet. Start chatting with an agent!
              </p>
            </div>
          )}
        </div>

        {/* Active Workflows */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Workflows</h2>
            <Link
              href="/agents/workflows"
              className="text-sm text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          {workflows && workflows.length > 0 ? (
            <div className="space-y-2">
              {workflows.slice(0, 5).map((wf) => (
                <div
                  key={wf.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Zap
                    className={`h-5 w-5 ${wf.isActive ? "text-emerald-500" : "text-muted-foreground"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Trigger: {wf.triggerEvent}
                    </p>
                  </div>
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
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
              <Workflow className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No workflows yet. Use the Workflow Agent to create automations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
