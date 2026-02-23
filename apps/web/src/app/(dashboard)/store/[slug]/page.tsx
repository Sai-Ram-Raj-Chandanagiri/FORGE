"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { StarRating } from "@/components/store/star-rating";
import {
  ArrowLeft,
  Package,
  Download,
  Star,
  ExternalLink,
  GitBranch,
  BookOpen,
  Globe,
  Calendar,
  Tag,
  Loader2,
  Check,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface ModuleData {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  type: string;
  pricingModel: string;
  price: unknown;
  currency: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  website: string | null;
  featured: boolean;
  downloadCount: number;
  averageRating: number;
  reviewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string | null; username: string; avatarUrl: string | null; bio: string | null };
  categories: { category: { id: string; name: string; slug: string } }[];
  tags: { tag: { id: string; name: string; slug: string } }[];
  versions: { id: string; version: string; changelog: string | null; dockerImage: string; composeFileUrl: string | null; configSchema: unknown; minResources: unknown; isLatest: boolean; publishedAt: string; fileSize: unknown }[];
  screenshots: { id: string; url: string; caption: string | null; sortOrder: number }[];
  reviews: { id: string; rating: number; title: string | null; body: string | null; createdAt: string; user: { id: string; name: string | null; username: string; avatarUrl: string | null } }[];
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

export default function ModuleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const { data: module, isLoading } = trpc.store.getBySlug.useQuery({ slug }) as {
    data: ModuleData | null | undefined;
    isLoading: boolean;
  };
  const purchaseMutation = trpc.store.purchase.useMutation();
  const [purchased, setPurchased] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">Module not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This module doesn&apos;t exist or isn&apos;t published yet.
        </p>
        <Link
          href="/store"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </Link>
      </div>
    );
  }

  const latestVersion = module.versions.find((v: { isLatest: boolean }) => v.isLatest) || module.versions[0];

  async function handlePurchase() {
    if (!module) return;
    try {
      await purchaseMutation.mutateAsync({ moduleId: module.id });
      setPurchased(true);
    } catch {
      // Error handled by tRPC
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/store"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Store
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-muted">
              {module.logoUrl ? (
                <img
                  src={module.logoUrl}
                  alt={module.name}
                  className="h-14 w-14 rounded-lg object-contain"
                />
              ) : (
                <Package className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{module.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                by{" "}
                <span className="font-medium text-foreground">
                  {module.author.name || module.author.username}
                </span>
              </p>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {module.averageRating.toFixed(1)} ({module.reviewCount} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {module.downloadCount.toLocaleString()} downloads
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-muted-foreground">{module.shortDescription}</p>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {module.categories.map((mc) => (
              <Link
                key={mc.category.slug}
                href={`/store?category=${mc.category.slug}`}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                {mc.category.name}
              </Link>
            ))}
            {module.tags.map((mt) => (
              <span
                key={mt.tag.slug}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                <Tag className="mr-1 inline h-3 w-3" />
                {mt.tag.name}
              </span>
            ))}
          </div>
        </div>

        {/* Sidebar — purchase */}
        <div className="w-full shrink-0 lg:w-72">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {formatPrice(module.pricingModel, module.price, module.currency)}
              </p>
              {module.pricingModel !== "FREE" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {module.pricingModel.replace(/_/g, " ").toLowerCase()}
                </p>
              )}
            </div>

            {session ? (
              <button
                onClick={handlePurchase}
                disabled={purchaseMutation.isPending || purchased}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {purchaseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : purchased ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {purchased
                  ? "Acquired!"
                  : module.pricingModel === "FREE"
                    ? "Get Module"
                    : "Acquire Module"}
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow"
              >
                Sign in to acquire
              </Link>
            )}

            {purchased && (
              <Link
                href="/link"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium shadow-sm transition-colors hover:bg-muted"
              >
                Deploy in FORGE Link
              </Link>
            )}

            {latestVersion && (
              <div className="space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono">{latestVersion.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{module.type === "SINGLE_CONTAINER" ? "Single" : "Multi"} Container</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span>{new Date(module.publishedAt || module.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="space-y-2 border-t pt-4">
              {module.repositoryUrl && (
                <a
                  href={module.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <GitBranch className="h-4 w-4" />
                  Repository
                  <ExternalLink className="ml-auto h-3 w-3" />
                </a>
              )}
              {module.documentationUrl && (
                <a
                  href={module.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                  Documentation
                  <ExternalLink className="ml-auto h-3 w-3" />
                </a>
              )}
              {module.website && (
                <a
                  href={module.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Globe className="h-4 w-4" />
                  Website
                  <ExternalLink className="ml-auto h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Description / Versions / Reviews */}
      <div className="space-y-6">
        {/* Description */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Description</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {module.description}
          </div>
        </section>

        {/* Screenshots */}
        {module.screenshots.length > 0 && (
          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Screenshots</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {module.screenshots.map((ss) => (
                <div key={ss.id} className="overflow-hidden rounded-lg border">
                  <img
                    src={ss.url}
                    alt={ss.caption || module.name}
                    className="w-full object-cover"
                  />
                  {ss.caption && (
                    <p className="p-2 text-xs text-muted-foreground">{ss.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Versions */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Versions ({module.versions.length})
          </h2>
          <div className="space-y-3">
            {module.versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold">{v.version}</span>
                  {v.isLatest && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(v.publishedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Reviews ({module.reviewCount})
          </h2>
          {module.reviews.length > 0 ? (
            <div className="space-y-4">
              {module.reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {(review.user.name || review.user.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {review.user.name || review.user.username}
                      </p>
                      <StarRating value={review.rating} readonly size="sm" />
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <p className="mt-2 font-medium text-sm">{review.title}</p>
                  )}
                  {review.body && (
                    <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
          )}
        </section>
      </div>
    </div>
  );
}
