"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  Star,
  Download,
  Shield,
  Calendar,
  User,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { SecurityScoreIndicator } from "@/components/store/security-score-indicator";
import { ComplianceBadge } from "@/components/store/compliance-badge";
import { DataPolicyDisplay } from "@/components/store/data-policy-display";

export default function AgentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-xl border bg-muted" />
        </div>
      }
    >
      <AgentDetailContent />
    </Suspense>
  );
}

interface AgentModule {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  logoUrl: string | null;
  pricingModel: string;
  price: unknown;
  currency: string;
  downloadCount: number;
  averageRating: number;
  reviewCount: number;
  type: string;
  status: string;
  agentConfig: unknown;
  securityScore: number | null;
  complianceBadges: string[];
  dataPolicy: unknown;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  versions: {
    id: string;
    version: string;
    publishedAt: string | null;
    securityScanResult: unknown;
  }[];
  categories: { category: { name: string; slug: string } }[];
  tags: { tag: { name: string; slug: string } }[];
}

function AgentDetailContent() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: rawModule, isLoading } = trpc.store.getAgentModule.useQuery({ slug });
  const mod = rawModule as AgentModule | undefined;

  const utils = trpc.useUtils();

  const installMutation = trpc.store.installAgent.useMutation({
    onSuccess: () => {
      utils.store.getInstalledAgents.invalidate();
    },
  });

  const { data: compliance } = trpc.module.getComplianceSummary.useQuery(
    { moduleId: mod?.id ?? "" },
    { enabled: !!mod?.id },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="flex flex-col items-center py-16">
        <Bot className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-lg font-medium">Agent not found</p>
        <Link href="/store/agents" className="mt-4 text-sm text-primary hover:underline">
          Back to Agent Marketplace
        </Link>
      </div>
    );
  }

  const price = Number(mod.price);
  const priceLabel =
    mod.pricingModel === "FREE"
      ? "Free"
      : !price
        ? "Free"
        : new Intl.NumberFormat("en-US", { style: "currency", currency: mod.currency }).format(price);

  const agentConfig = mod.agentConfig as {
    systemPrompt?: string;
    tools?: { name: string; description: string }[];
    personality?: string;
    greeting?: string;
  } | null;

  const dataPolicy = mod.dataPolicy as {
    dataCollected: string[];
    dataSentExternally: boolean;
    encryptionAtRest: boolean;
  } | null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/store" className="hover:text-foreground transition-colors">Store</Link>
        <span>/</span>
        <Link href="/store/agents" className="hover:text-foreground transition-colors">Agents</Link>
        <span>/</span>
        <span className="text-foreground">{mod.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-muted">
            {mod.logoUrl ? (
              <img src={mod.logoUrl} alt={mod.name} className="h-14 w-14 rounded-lg object-contain" />
            ) : (
              <Bot className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{mod.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{mod.shortDescription}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {mod.author.name || mod.author.username}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {mod.averageRating.toFixed(1)} ({mod.reviewCount})
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3.5 w-3.5" />
                {mod.downloadCount} installs
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-2xl font-bold text-primary">{priceLabel}</span>
          <button
            onClick={() => installMutation.mutate({ moduleId: mod.id })}
            disabled={installMutation.isPending}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {installMutation.isPending
              ? "Installing..."
              : mod.pricingModel === "FREE"
                ? "Install Agent"
                : "Purchase Agent"}
          </button>
          {installMutation.isSuccess && (
            <p className="text-xs text-green-600">
              {installMutation.data?.alreadyOwned
                ? "Already installed"
                : installMutation.data?.requiresPayment
                  ? "Redirecting to checkout..."
                  : "Installed successfully!"}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{mod.description}</p>
            </div>
          </div>

          {/* Agent capabilities */}
          {agentConfig && (
            <div className="rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-3">Agent Capabilities</h2>
              {agentConfig.greeting && (
                <div className="mb-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Greeting</p>
                  <p className="text-sm">{agentConfig.greeting}</p>
                </div>
              )}
              {agentConfig.personality && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Personality</p>
                  <p className="text-sm">{agentConfig.personality}</p>
                </div>
              )}
              {agentConfig.tools && agentConfig.tools.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Tools ({agentConfig.tools.length})
                  </p>
                  <div className="space-y-2">
                    {agentConfig.tools.map((tool) => (
                      <div key={tool.name} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">{tool.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tool.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Security */}
          {compliance && (
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security & Compliance
              </h3>
              {compliance.score != null && (
                <SecurityScoreIndicator score={compliance.score} size="lg" showLabel />
              )}
              {compliance.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {compliance.badges.map((badge) => (
                    <ComplianceBadge key={badge} badge={badge} />
                  ))}
                </div>
              )}
              {compliance.lastScanDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last scanned: {new Date(compliance.lastScanDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Data Policy */}
          <DataPolicyDisplay dataPolicy={dataPolicy} />

          {/* Tags */}
          {mod.tags.length > 0 && (
            <div className="rounded-xl border p-5">
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {mod.tags.map((t) => (
                  <span
                    key={t.tag.slug}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
                  >
                    {t.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <Link
            href="/store/agents"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agent Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
