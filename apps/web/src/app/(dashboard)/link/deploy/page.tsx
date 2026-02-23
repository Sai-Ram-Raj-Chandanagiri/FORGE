"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Loader2, Rocket, Check } from "lucide-react";
import { trpc } from "@/lib/trpc-client";

interface PurchaseItem {
  module: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    categories: { category: { name: string; slug: string } }[];
    tags: { tag: { name: string; slug: string } }[];
    shortDescription: string;
    author: { name: string | null; username: string; avatarUrl: string | null };
    status: string;
    type: string;
    pricingModel: string;
    price: unknown;
    currency: string;
    featured: boolean;
    downloadCount: number;
    averageRating: number;
    reviewCount: number;
    publishedAt: string | null;
    createdAt: string;
  };
}

interface ModuleVersion {
  id: string;
  version: string;
  dockerImage: string;
  isLatest: boolean;
  publishedAt: string;
}

export default function DeployPage() {
  const router = useRouter();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [deploymentName, setDeploymentName] = useState("");
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [autoRestart, setAutoRestart] = useState(true);
  const [error, setError] = useState("");

  const { data: purchases, isLoading: loadingPurchases } = trpc.store.getMyPurchases.useQuery() as {
    data: PurchaseItem[] | undefined;
    isLoading: boolean;
  };

  const { data: moduleDetail } = trpc.store.getBySlug.useQuery(
    { slug: purchases?.find((p) => p.module.id === selectedModuleId)?.module.slug || "" },
    { enabled: !!selectedModuleId },
  ) as {
    data: { versions: ModuleVersion[] } | null | undefined;
  };

  const createDeployment = trpc.deployment.create.useMutation();

  function addEnvVar() {
    setEnvVars((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeEnvVar(index: number) {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEnvVar(index: number, field: "key" | "value", val: string) {
    setEnvVars((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, [field]: val } : ev)),
    );
  }

  async function handleDeploy() {
    if (!selectedModuleId || !selectedVersionId || !deploymentName) {
      setError("Please fill in all required fields");
      return;
    }

    setError("");

    const configuration: Record<string, string> = {};
    for (const ev of envVars) {
      if (ev.key.trim()) {
        configuration[ev.key.trim()] = ev.value;
      }
    }

    try {
      const deployment = await createDeployment.mutateAsync({
        moduleId: selectedModuleId,
        versionId: selectedVersionId,
        name: deploymentName,
        configuration,
        autoRestart,
      });
      router.push(`/link/${deployment.id}`);
    } catch {
      // Error handled by tRPC
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/link"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to FORGE Link
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Rocket className="h-7 w-7 text-primary" />
          Deploy Module
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deploy a module from your acquired modules.
        </p>
      </div>

      {/* Step 1: Select module */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">1. Select Module</h2>
        {loadingPurchases ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
            ))}
          </div>
        ) : purchases && purchases.length > 0 ? (
          <div className="grid gap-2">
            {purchases.map((p) => (
              <button
                key={p.module.id}
                type="button"
                onClick={() => {
                  setSelectedModuleId(p.module.id);
                  setSelectedVersionId(null);
                  if (!deploymentName) {
                    setDeploymentName(
                      p.module.slug + "-" + Math.random().toString(36).slice(2, 6),
                    );
                  }
                }}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selectedModuleId === p.module.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                  {p.module.logoUrl ? (
                    <img src={p.module.logoUrl} alt={p.module.name} className="h-8 w-8 rounded object-contain" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.module.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.module.shortDescription}
                  </p>
                </div>
                {selectedModuleId === p.module.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No modules acquired yet.</p>
            <Link
              href="/store"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Browse Store
            </Link>
          </div>
        )}
      </section>

      {/* Step 2: Select version */}
      {selectedModuleId && moduleDetail && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">2. Select Version</h2>
          <div className="grid gap-2">
            {moduleDetail.versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVersionId(v.id)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selectedVersionId === v.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{v.version}</span>
                  {v.isLatest && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                      Latest
                    </span>
                  )}
                </div>
                {selectedVersionId === v.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 3: Configuration */}
      {selectedVersionId && (
        <section className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold">3. Configuration</h2>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Deployment Name <span className="text-destructive">*</span>
            </label>
            <input
              value={deploymentName}
              onChange={(e) => setDeploymentName(e.target.value)}
              placeholder="my-crm-instance"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Environment Variables</label>
              <button
                type="button"
                onClick={addEnvVar}
                className="text-xs text-primary hover:underline"
              >
                + Add Variable
              </button>
            </div>
            {envVars.map((ev, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={ev.key}
                  onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                  placeholder="KEY"
                  className="flex h-9 w-36 rounded-md border border-input bg-background px-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-muted-foreground">=</span>
                <input
                  value={ev.value}
                  onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                  placeholder="value"
                  className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => removeEnvVar(i)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRestart}
              onChange={(e) => setAutoRestart(e.target.checked)}
              className="rounded border-input"
            />
            <span>Auto-restart on failure</span>
          </label>
        </section>
      )}

      {/* Error */}
      {(error || createDeployment.error) && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error || createDeployment.error?.message}
        </div>
      )}

      {/* Deploy button */}
      {selectedVersionId && (
        <button
          type="button"
          onClick={handleDeploy}
          disabled={createDeployment.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {createDeployment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
          Deploy Module
        </button>
      )}
    </div>
  );
}
