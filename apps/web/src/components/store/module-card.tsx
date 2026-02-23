"use client";

import Link from "next/link";
import { Star, Download, Package } from "lucide-react";

interface ModuleCardProps {
  module: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    logoUrl: string | null;
    pricingModel: string;
    price: unknown;
    currency: string;
    downloadCount: number;
    averageRating: number;
    reviewCount: number;
    featured: boolean;
    author: {
      name: string | null;
      username: string;
      avatarUrl: string | null;
    };
    categories: { category: { name: string; slug: string } }[];
    tags: { tag: { name: string; slug: string } }[];
  };
}

function formatPrice(pricingModel: string, price: unknown, currency: string): string {
  if (pricingModel === "FREE") return "Free";
  const numPrice = Number(price);
  if (!numPrice) return "Free";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numPrice);
  if (pricingModel === "SUBSCRIPTION_MONTHLY") return `${formatted}/mo`;
  if (pricingModel === "SUBSCRIPTION_YEARLY") return `${formatted}/yr`;
  return formatted;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <Link
      href={`/store/${module.slug}`}
      className="group relative flex flex-col rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20"
    >
      {module.featured && (
        <div className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          Featured
        </div>
      )}
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
          {module.logoUrl ? (
            <img
              src={module.logoUrl}
              alt={module.name}
              className="h-10 w-10 rounded-md object-contain"
            />
          ) : (
            <Package className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors truncate">
            {module.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            by {module.author.name || module.author.username}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-primary">
          {formatPrice(module.pricingModel, module.price, module.currency)}
        </span>
      </div>

      <p className="px-5 text-sm text-muted-foreground line-clamp-2">
        {module.shortDescription}
      </p>

      <div className="mt-auto flex items-center justify-between border-t px-5 py-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {module.averageRating.toFixed(1)}
            <span className="text-muted-foreground/60">({module.reviewCount})</span>
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {formatCount(module.downloadCount)}
          </span>
        </div>
        {module.categories.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {module.categories[0]?.category.name}
          </span>
        )}
      </div>
    </Link>
  );
}
