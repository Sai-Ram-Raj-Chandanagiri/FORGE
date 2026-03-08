"use client";

import Link from "next/link";
import {
  CreditCard,
  BarChart3,
  TrendingUp,
  DollarSign,
  Cpu,
  HardDrive,
  Wifi,
  ShoppingBag,
  RefreshCw,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";
import { useState } from "react";

interface UsageSummary {
  totalCpuHours: number;
  totalMemoryGbHours: number;
  totalNetworkGb: number;
  totalDeployments: number;
  estimatedCost: number;
}

interface PurchaseItem {
  id: string;
  moduleName: string;
  moduleSlug: string;
  pricingModel: string;
  pricePaid: string;
  currency: string;
  purchasedAt: string;
  status: string;
  subscriptionId: string | null;
}

function formatPricingLabel(pricingModel: string): string {
  switch (pricingModel) {
    case "SUBSCRIPTION_MONTHLY": return "Monthly";
    case "SUBSCRIPTION_YEARLY": return "Yearly";
    case "ONE_TIME": return "One-time";
    case "FREE": return "Free";
    default: return pricingModel;
  }
}

function CancelButton({ purchaseId, onCancelled }: { purchaseId: string; onCancelled: () => void }) {
  const cancelMutation = trpc.billing.cancelSubscription.useMutation();
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync({ purchaseId });
      onCancelled();
    } catch {
      // Error shown via mutation state
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        <XCircle className="h-3 w-3" />
        Cancel
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCancel}
        disabled={cancelMutation.isPending}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50"
      >
        {cancelMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
        Confirm
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Keep
      </button>
      {cancelMutation.isError && (
        <span className="text-xs text-destructive">{cancelMutation.error?.message || "Failed"}</span>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { data: usage } = trpc.billing.getUsageSummary.useQuery() as {
    data: UsageSummary | undefined;
  };

  const { data: purchases, refetch } = trpc.billing.getPurchaseHistory.useQuery() as {
    data: PurchaseItem[] | undefined;
    refetch: () => void;
  };

  const activeSubscriptions = purchases?.filter(
    (p) => p.status === "ACTIVE" && p.subscriptionId,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <BackButton fallback="/link" label="Back" />
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <CreditCard className="h-8 w-8 text-primary" />
          Billing & Usage
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitor resource usage, manage subscriptions, and view purchase history.
        </p>
      </div>

      {/* Active Subscriptions */}
      {activeSubscriptions && activeSubscriptions.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <RefreshCw className="h-5 w-5 text-primary" />
            Active Subscriptions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeSubscriptions.map((sub) => (
              <div key={sub.id} className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/store/${sub.moduleSlug}`}
                      className="font-semibold hover:underline flex items-center gap-1"
                    >
                      {sub.moduleName}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Since {new Date(sub.purchasedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
                      ${parseFloat(sub.pricePaid).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {sub.pricingModel === "SUBSCRIPTION_MONTHLY" ? "month" : "year"}
                    </span>
                  </div>
                  <CancelButton purchaseId={sub.id} onCancelled={refetch} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Summary */}
      {usage && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Current Period Usage
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Cpu className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {usage.totalCpuHours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">CPU Hours</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <HardDrive className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {usage.totalMemoryGbHours.toFixed(1)} GB·h
                  </p>
                  <p className="text-xs text-muted-foreground">Memory Usage</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Wifi className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">
                    {usage.totalNetworkGb.toFixed(2)} GB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Network Transfer
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">
                    ${usage.estimatedCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Estimated Cost
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>
              Based on {usage.totalDeployments} active deployment
              {usage.totalDeployments !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Purchase History */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Purchase History
        </h2>
        {purchases && purchases.length > 0 ? (
          <div className="rounded-xl border">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b px-4 py-3 text-xs font-medium text-muted-foreground">
              <span>Module</span>
              <span>Type</span>
              <span>Price</span>
              <span>Status</span>
              <span>Date</span>
            </div>
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b px-4 py-3 last:border-0"
              >
                <Link
                  href={`/store/${purchase.moduleSlug}`}
                  className="text-sm font-medium hover:underline"
                >
                  {purchase.moduleName}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatPricingLabel(purchase.pricingModel)}
                </span>
                <span className="text-sm">
                  {parseFloat(purchase.pricePaid) === 0
                    ? "Free"
                    : `$${parseFloat(purchase.pricePaid).toFixed(2)}`}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    purchase.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : purchase.status === "CANCELLED"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {purchase.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(purchase.purchasedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
            <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="font-semibold">No purchases yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Modules you acquire from the Store will appear here.
            </p>
            <Link
              href="/store"
              className="mt-4 text-sm text-primary hover:underline"
            >
              Browse Store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
