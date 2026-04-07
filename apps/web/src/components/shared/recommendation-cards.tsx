"use client";

import Link from "next/link";
import { Star, Package, ArrowRight } from "lucide-react";

interface ModuleRecommendation {
  moduleId: string;
  name: string;
  slug: string;
  shortDescription: string;
  pricingModel: string;
  averageRating: number;
  downloadCount: number;
  score: number;
}

interface RecommendationCardsProps {
  recommendations: ModuleRecommendation[];
}

export function RecommendationCards({
  recommendations,
}: RecommendationCardsProps) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">Recommendations</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          No recommendations available. Purchase or deploy some modules to get
          personalized suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Recommended Modules</h3>
      </div>

      <div className="space-y-2">
        {recommendations.map((mod) => (
          <Link
            key={mod.moduleId}
            href={`/store/${mod.slug}`}
            className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
          >
            <Package className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                  {mod.name}
                </p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium shrink-0">
                  {mod.pricingModel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {mod.shortDescription}
              </p>
              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  {mod.averageRating.toFixed(1)}
                </span>
                <span>{mod.downloadCount.toLocaleString()} downloads</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
