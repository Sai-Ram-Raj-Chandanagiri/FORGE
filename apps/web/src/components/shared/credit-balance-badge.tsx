"use client";

import { Coins } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";

export function CreditBalanceBadge() {
  const { data: balance } = trpc.credits.getBalance.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (!balance) return null;

  const isLow = balance.balance <= balance.lowBalanceAlert;

  return (
    <Link
      href="/settings/credits"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted ${
        isLow ? "border-amber-300 text-amber-600" : "border-border text-muted-foreground"
      }`}
      title={`${balance.balance} credits remaining`}
    >
      <Coins className={`h-3.5 w-3.5 ${isLow ? "text-amber-500" : ""}`} />
      <span>{balance.balance}</span>
    </Link>
  );
}
