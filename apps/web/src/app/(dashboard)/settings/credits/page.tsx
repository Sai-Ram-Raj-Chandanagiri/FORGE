"use client";

import { Suspense, useState } from "react";
import { Coins, TrendingUp, TrendingDown, BarChart3, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { CreditTransactionTable } from "@/components/shared/credit-transaction-table";
import { CreditPackCard } from "@/components/shared/credit-pack-card";

export default function CreditsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        </div>
      }
    >
      <CreditsContent />
    </Suspense>
  );
}

function CreditsContent() {
  const [txPage, setTxPage] = useState(1);

  const { data: balance, isLoading: balanceLoading } = trpc.credits.getBalance.useQuery();
  const { data: packs } = trpc.credits.getAvailablePacks.useQuery();
  const { data: transactions } = trpc.credits.getTransactions.useQuery({
    page: txPage,
    limit: 15,
  });

  const utils = trpc.useUtils();

  const purchaseMutation = trpc.credits.purchasePack.useMutation({
    onSuccess: () => {
      utils.credits.getBalance.invalidate();
      utils.credits.getTransactions.invalidate();
    },
  });

  const autoTopUpMutation = trpc.credits.setupAutoTopUp.useMutation({
    onSuccess: () => utils.credits.getBalance.invalidate(),
  });

  const removeAutoTopUpMutation = trpc.credits.removeAutoTopUp.useMutation({
    onSuccess: () => utils.credits.getBalance.invalidate(),
  });

  if (balanceLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Credits & Balance</h1>
            <p className="text-sm text-muted-foreground">
              Manage your FORGE credits for AI agents, deployments, and tools
            </p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Balance</span>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{balance.balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">credits available</p>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Lifetime Earned</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {balance.lifetimeEarned.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">total credits received</p>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Lifetime Spent</span>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {balance.lifetimeSpent.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">total credits used</p>
          </div>
        </div>
      )}

      {/* Auto Top-Up */}
      {balance && (
        <div className="rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Auto Top-Up</h3>
                <p className="text-xs text-muted-foreground">
                  Automatically purchase credits when balance drops below{" "}
                  {balance.lowBalanceAlert}
                </p>
              </div>
            </div>
            {balance.autoTopUp ? (
              <button
                onClick={() => removeAutoTopUpMutation.mutate()}
                disabled={removeAutoTopUpMutation.isPending}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
              >
                {removeAutoTopUpMutation.isPending ? "Removing..." : "Disable"}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Select a pack below to enable
              </span>
            )}
          </div>
        </div>
      )}

      {/* Credit Packs */}
      {packs && packs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Purchase Credits</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <CreditPackCard
                key={pack.id}
                pack={pack}
                onPurchase={(packId) => purchaseMutation.mutate({ packId })}
                isPurchasing={purchaseMutation.isPending}
              />
            ))}
          </div>
          {purchaseMutation.isSuccess && (
            <p className="mt-3 text-sm text-green-600">
              {purchaseMutation.data?.success
                ? `Credits added successfully!`
                : "Redirecting to checkout..."}
            </p>
          )}
          {purchaseMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              {purchaseMutation.error.message}
            </p>
          )}
        </div>
      )}

      {/* Credit Costs Reference */}
      <div className="rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Credit Costs</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { action: "Agent Chat", cost: 1 },
            { action: "Deployment (per hour)", cost: 5 },
            { action: "Sandbox Session", cost: 2 },
            { action: "Cross-Module Query", cost: 1 },
            { action: "MCP Tool Call", cost: 1 },
          ].map((item) => (
            <div key={item.action} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
              <span className="text-sm">{item.action}</span>
              <span className="text-sm font-semibold">{item.cost} credit{item.cost !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
        {transactions ? (
          <CreditTransactionTable
            transactions={transactions.transactions.map((tx) => ({
              ...tx,
              createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : String(tx.createdAt),
            }))}
            total={transactions.total}
            page={txPage}
            limit={15}
            onPageChange={setTxPage}
          />
        ) : (
          <div className="h-32 animate-pulse rounded-xl border bg-muted" />
        )}
      </div>
    </div>
  );
}
