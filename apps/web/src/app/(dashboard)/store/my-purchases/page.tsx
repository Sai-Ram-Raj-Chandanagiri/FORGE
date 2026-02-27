"use client";

import { ShoppingBag, Package, ArrowRight, Rocket, XCircle, Loader2, CreditCard } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { useState } from "react";

interface PurchaseData {
  id: string;
  status: string;
  pricePaid: unknown;
  currency: string;
  subscriptionId: string | null;
  purchasedAt: string;
  module: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    pricingModel: string;
    price: unknown;
    logoUrl: string | null;
    author: { name: string | null; username: string };
  };
}

function formatPricePaid(price: unknown, currency: string): string {
  const num = Number(price);
  if (!num) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

function PurchaseCard({ purchase, onCancelled }: { purchase: PurchaseData; onCancelled: () => void }) {
  const cancelMutation = trpc.store.cancelSubscription.useMutation();
  const [showConfirm, setShowConfirm] = useState(false);

  const isSubscription = !!purchase.subscriptionId;
  const pricingLabel = purchase.module.pricingModel.replace(/_/g, " ").toLowerCase();

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync({ purchaseId: purchase.id });
      onCancelled();
    } catch {
      // Error shown via mutation state
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
          {purchase.module.logoUrl ? (
            <img src={purchase.module.logoUrl} alt={purchase.module.name} className="h-10 w-10 rounded-md object-contain" />
          ) : (
            <Package className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/store/${purchase.module.slug}`} className="font-semibold hover:underline">
            {purchase.module.name}
          </Link>
          <p className="text-xs text-muted-foreground truncate">{purchase.module.shortDescription}</p>
          <p className="text-xs text-muted-foreground mt-1">
            by {purchase.module.author.name || purchase.module.author.username}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm border-t pt-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{formatPricePaid(purchase.pricePaid, purchase.currency)}</span>
            {isSubscription && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {pricingLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Purchased {new Date(purchase.purchasedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/link/deploy"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Rocket className="h-3.5 w-3.5" />
            Deploy
          </Link>
        </div>
      </div>

      {/* Cancel subscription */}
      {isSubscription && (
        <div className="border-t pt-3">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Are you sure? You will lose access to this module.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Keep subscription
                </button>
              </div>
              {cancelMutation.isError && (
                <p className="text-xs text-destructive">
                  {cancelMutation.error?.message || "Failed to cancel subscription"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyPurchasesPage() {
  const { data: purchases, isLoading, refetch } = trpc.store.getMyPurchases.useQuery() as {
    data: PurchaseData[] | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ShoppingBag className="h-8 w-8 text-primary" />
          My Modules
        </h1>
        <p className="mt-1 text-muted-foreground">
          Modules you&apos;ve acquired from the FORGE Store.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : purchases && purchases.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((p) => (
            <PurchaseCard key={p.id} purchase={p} onCancelled={refetch} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No modules yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the Store to find modules for your organization.
          </p>
          <Link
            href="/store"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Browse Store
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
