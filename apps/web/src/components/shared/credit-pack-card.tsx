"use client";

import { Coins, Zap, Crown } from "lucide-react";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  isActive: boolean;
}

interface CreditPackCardProps {
  pack: CreditPack;
  onPurchase: (packId: string) => void;
  isPurchasing: boolean;
}

const PACK_ICONS: Record<string, typeof Coins> = {
  Starter: Coins,
  Pro: Zap,
  Enterprise: Crown,
};

export function CreditPackCard({ pack, onPurchase, isPurchasing }: CreditPackCardProps) {
  const Icon = Object.entries(PACK_ICONS).find(([key]) =>
    pack.name.toLowerCase().includes(key.toLowerCase()),
  )?.[1] ?? Coins;

  const pricePerCredit = pack.credits > 0 ? (pack.price / pack.credits).toFixed(3) : "0";

  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{pack.name}</h3>
          <p className="text-xs text-muted-foreground">${pricePerCredit}/credit</p>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold">{pack.credits.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground ml-1">credits</span>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-lg font-semibold">
          {pack.price === 0 ? (
            "Free"
          ) : (
            <>
              ${pack.price.toFixed(2)}
            </>
          )}
        </span>
        <button
          onClick={() => onPurchase(pack.id)}
          disabled={isPurchasing}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPurchasing ? "Processing..." : pack.price === 0 ? "Claim" : "Purchase"}
        </button>
      </div>
    </div>
  );
}
