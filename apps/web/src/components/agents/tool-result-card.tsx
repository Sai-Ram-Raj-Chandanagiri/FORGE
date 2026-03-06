"use client";

import {
  Check,
  Package,
  Rocket,
  Globe,
  ArrowRight,
  Layout,
  Search,
  ExternalLink,
} from "lucide-react";

export interface ToolResult {
  tool: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

export function ToolResultCard({ toolResult }: { toolResult: ToolResult }) {
  const { tool, success, result, error } = toolResult;

  if (!success || error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
        <p className="text-xs font-medium text-red-700 dark:text-red-400">
          {tool} failed: {error || "Unknown error"}
        </p>
      </div>
    );
  }

  switch (tool) {
    case "search_modules":
      return <SearchModulesCard result={result} />;
    case "purchase_module":
      return <PurchaseModuleCard result={result} />;
    case "deploy_module":
      return <DeployModuleCard result={result} />;
    case "activate_workspace":
      return <ActivateWorkspaceCard result={result} />;
    case "create_data_bridge":
      return <CreateBridgeCard result={result} />;
    case "generate_platform_layout":
      return <LayoutCard result={result} />;
    default:
      return null;
  }
}

function SearchModulesCard({ result }: { result?: Record<string, unknown> }) {
  const modules = (result?.modules as { name: string; slug: string; description?: string; pricingModel?: string; rating?: number }[]) || [];
  if (modules.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Search className="h-4 w-4 text-blue-500" />
        <span className="text-xs font-medium">Found {modules.length} modules</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {modules.slice(0, 6).map((m) => (
          <div key={m.slug} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{m.name}</p>
              <p className="text-[10px] text-muted-foreground">{m.pricingModel || "FREE"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PurchaseModuleCard({ result }: { result?: Record<string, unknown> }) {
  const owned = result?.owned || result?.alreadyOwned;
  if (!owned) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 dark:border-green-800 dark:bg-green-950/30">
      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      <span className="text-xs font-medium text-green-700 dark:text-green-400">
        Module acquired{result?.alreadyOwned ? " (already owned)" : ""}
      </span>
    </div>
  );
}

function DeployModuleCard({ result }: { result?: Record<string, unknown> }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 text-emerald-500" />
        <span className="text-xs font-medium">{(result?.name as string) || "Deployment"}</span>
        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {(result?.status as string) || "PROVISIONING"}
        </span>
      </div>
      {result?.port != null && (
        <p className="mt-1 text-[10px] text-muted-foreground">Port: {String(result.port)}</p>
      )}
    </div>
  );
}

function ActivateWorkspaceCard({ result }: { result?: Record<string, unknown> }) {
  const portalUrl = result?.portalUrl as string | undefined;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-blue-500" />
        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
          Workspace Portal Active
        </span>
      </div>
      {portalUrl && (
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          Open Platform <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function CreateBridgeCard({ result }: { result?: Record<string, unknown> }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs">
        <span className="rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
          Source
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="rounded bg-purple-100 px-1.5 py-0.5 font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
          Target
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        {(result?.name as string) || "Bridge"} — {(result?.status as string) || "running"}
      </span>
    </div>
  );
}

function LayoutCard({ result }: { result?: Record<string, unknown> }) {
  const sidebar = (result?.sidebar as { label: string; icon: string; group: string }[]) || [];
  const platformName = (result?.platformName as string) || "Platform";

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <Layout className="h-4 w-4 text-rose-500" />
        <span className="text-xs font-medium">{platformName} Layout</span>
      </div>
      {sidebar.length > 0 && (
        <div className="space-y-1">
          {sidebar.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">{item.group}:</span>
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {typeof result?.portalUrl === "string" && (
        <a
          href={result.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-rose-600 hover:underline dark:text-rose-400"
        >
          Open Platform <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
