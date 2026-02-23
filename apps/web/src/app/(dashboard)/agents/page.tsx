import { Bot, Workflow, Activity, Plug } from "lucide-react";

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Bot className="h-8 w-8 text-primary" />
          FORGE Agents
        </h1>
        <p className="mt-1 text-muted-foreground">
          AI-powered agents for setup, workflow automation, monitoring, and integration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <Bot className="mb-3 h-8 w-8 text-primary" />
          <h3 className="font-semibold">Setup Agent</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversational onboarding to recommend and configure modules.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <Workflow className="mb-3 h-8 w-8 text-primary" />
          <h3 className="font-semibold">Workflow Agent</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Automate cross-module workflows with natural language.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <Activity className="mb-3 h-8 w-8 text-primary" />
          <h3 className="font-semibold">Monitor Agent</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Intelligent anomaly detection and cost optimization.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <Plug className="mb-3 h-8 w-8 text-primary" />
          <h3 className="font-semibold">Integration Agent</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Smart module composition and data bridging.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">AI Agents</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Google ADK integration, Gemini 2.0 Flash, and A2A protocol coming in Phase 5.
        </p>
      </div>
    </div>
  );
}
