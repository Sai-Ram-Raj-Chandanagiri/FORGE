"use client";

import Link from "next/link";
import { Star, Download, Bot, Shield } from "lucide-react";
import { SecurityScoreIndicator } from "./security-score-indicator";
import { ComplianceBadge } from "./compliance-badge";

interface AgentModuleCardProps {
  module: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    logoUrl: string | null;
    pricingModel: string;
    price: number | null;
    averageRating: number;
    downloadCount: number;
    reviewCount: number;
    securityScore: number | null;
    complianceBadges: string[];
    author: {
      id: string;
      name: string | null;
      username: string;
    };
  };
  onInstall?: (moduleId: string) => void;
  isInstalling?: boolean;
}

function formatPrice(pricingModel: string, price: number | null): string {
  if (pricingModel === "FREE") return "Free";
  if (!price) return "Free";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
  if (pricingModel === "SUBSCRIPTION_MONTHLY") return `${formatted}/mo`;
  if (pricingModel === "SUBSCRIPTION_YEARLY") return `${formatted}/yr`;
  return formatted;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function AgentModuleCard({ module, onInstall, isInstalling }: AgentModuleCardProps) {
  return (
    <div className="group relative flex flex-col rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20">
      <Link href={`/store/agents/${module.slug}`} className="flex-1">
        <div className="flex items-start gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted">
            {module.logoUrl ? (
              <img
                src={module.logoUrl}
                alt={module.name}
                className="h-10 w-10 rounded-md object-contain"
              />
            ) : (
              <Bot className="h-6 w-6 text-muted-foreground" />
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
            {formatPrice(module.pricingModel, module.price)}
          </span>
        </div>

        <p className="px-5 text-sm text-muted-foreground line-clamp-2">
          {module.shortDescription}
        </p>

        {module.securityScore != null && (
          <div className="px-5 pt-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <SecurityScoreIndicator score={module.securityScore} size="sm" />
            {module.complianceBadges.length > 0 && (
              <div className="flex gap-1 overflow-hidden">
                {module.complianceBadges.slice(0, 3).map((badge) => (
                  <ComplianceBadge key={badge} badge={badge} size="sm" />
                ))}
                {module.complianceBadges.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{module.complianceBadges.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Link>

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
        {onInstall && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onInstall(module.id);
            }}
            disabled={isInstalling}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isInstalling ? "Installing..." : module.pricingModel === "FREE" ? "Install" : "Get"}
          </button>
        )}
      </div>
    </div>
  );
}
