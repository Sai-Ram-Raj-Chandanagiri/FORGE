"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Workflow,
  Activity,
  Plug,
  Send,
  Loader2,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const AGENTS = {
  setup: {
    label: "Setup Agent",
    description:
      "I help you onboard your organization, recommend modules, and configure deployments. Describe what you need and I will guide you through it.",
    icon: Bot,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  workflow: {
    label: "Workflow Agent",
    description:
      "I create cross-module automations using natural language. Tell me what events, conditions, and actions you want to connect.",
    icon: Workflow,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  monitor: {
    label: "Monitor Agent",
    description:
      "I provide intelligent anomaly detection, cost optimization, and scaling recommendations for your deployments.",
    icon: Activity,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  integration: {
    label: "Integration Agent",
    description:
      "I analyze module APIs, create data bridges, and generate Docker Compose configs for connected services.",
    icon: Plug,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
} as const;

type AgentType = keyof typeof AGENTS;

function AgentChatContent() {
  const searchParams = useSearchParams();
  const agentParam = searchParams.get("agent") as AgentType | null;
  const conversationId = searchParams.get("conversation");

  const agentType: AgentType =
    agentParam && agentParam in AGENTS ? agentParam : "setup";
  const agent = AGENTS[agentType];
  const Icon = agent.icon;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation } = trpc.agent.getConversation.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId },
  ) as {
    data:
      | { id: string; agentType: string; messages: ChatMessage[] }
      | undefined;
  };

  const chatMutation = trpc.agent.chat.useMutation();

  // Load conversation messages when data arrives
  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages);
      setActiveConversationId(conversation.id);
    }
  }, [conversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await chatMutation.mutateAsync({
        agentType,
        message: trimmed,
        conversationId: activeConversationId ?? undefined,
      });

      const result = response as { response: string; conversationId: string; messages: ChatMessage[] };
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: result.response ?? "I'm sorry, I could not generate a response.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Store conversation ID for follow-up messages
      if (result.conversationId) {
        setActiveConversationId(result.conversationId);
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          "Sorry, something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [input, chatMutation, agentType, activeConversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b pb-4">
        <BackButton fallback="/agents" label="Back" />
        <div className={`rounded-lg p-2.5 ${agent.bgColor}`}>
          <Icon className={`h-6 w-6 ${agent.color}`} />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{agent.label}</h1>
          <p className="text-xs text-muted-foreground">
            {activeConversationId
              ? `Conversation ${activeConversationId.slice(0, 8)}...`
              : "New conversation"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Agent Greeting (shown when no messages) */}
          {messages.length === 0 && (
            <div className="flex gap-3">
              <div
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agent.bgColor}`}
              >
                <Icon className={`h-4 w-4 ${agent.color}`} />
              </div>
              <div
                className={`rounded-2xl rounded-tl-sm border bg-muted/50 px-4 py-3 ${agent.borderColor}`}
              >
                <p className="text-sm leading-relaxed">{agent.description}</p>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className="flex gap-3">
                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agent.bgColor}`}
                >
                  <Icon className={`h-4 w-4 ${agent.color}`} />
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl rounded-tl-sm border bg-muted/50 px-4 py-3 ${agent.borderColor}`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${agent.bgColor}`}
              >
                <Icon className={`h-4 w-4 ${agent.color}`} />
              </div>
              <div
                className={`flex items-center gap-2 rounded-2xl rounded-tl-sm border bg-muted/50 px-4 py-3 ${agent.borderColor}`}
              >
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t pt-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.label}...`}
            rows={1}
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-muted-foreground">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}

export default function AgentChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AgentChatContent />
    </Suspense>
  );
}
