"use client";

import Link from "next/link";
import {
  Bot,
  Workflow,
  Activity,
  Plug,
  MessageSquare,
  Clock,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

interface ConversationItem {
  id: string;
  agentType: string;
  status: string;
  messageCount: number;
  actionCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const AGENT_META: Record<
  string,
  { label: string; icon: typeof Bot; color: string; bgColor: string }
> = {
  setup: {
    label: "Setup Agent",
    icon: Bot,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  workflow: {
    label: "Workflow Agent",
    icon: Workflow,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  monitor: {
    label: "Monitor Agent",
    icon: Activity,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  integration: {
    label: "Integration Agent",
    icon: Plug,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
};

export default function ConversationsPage() {
  const { data: conversations, isLoading } =
    trpc.agent.listConversations.useQuery({ limit: 50 }) as {
      data: ConversationItem[] | undefined;
      isLoading: boolean;
    };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackButton fallback="/agents" label="Back" />
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <MessageSquare className="h-8 w-8 text-primary" />
          Conversations
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your conversation history with FORGE agents.
        </p>
      </div>

      {/* Conversation List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : conversations && conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const meta = (AGENT_META[conv.agentType] || AGENT_META.setup)!;
            const Icon = meta.icon;
            return (
              <Link
                key={conv.id}
                href={`/agents/chat?conversation=${conv.id}`}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/20"
              >
                <div className={`rounded-lg p-2.5 ${meta.bgColor}`}>
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {meta.label}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        conv.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {conv.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {conv.lastMessage ?? "No messages yet"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {conv.messageCount} messages
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No conversations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a conversation with an agent to get started.
          </p>
          <Link
            href="/agents"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Bot className="h-4 w-4" />
            Choose an Agent
          </Link>
        </div>
      )}
    </div>
  );
}
