"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { StarRating } from "@/components/store/star-rating";
import {
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
  Rocket,
  User,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useState, useEffect, useCallback, useRef } from "react";
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
  const { data: session, status: sessionStatus } = useSession();

  const { data: module, isLoading } = trpc.store.getBySlug.useQuery({ slug }) as {
    data: ModuleData | null | undefined;
    isLoading: boolean;
  };

  const purchaseMutation = trpc.store.purchase.useMutation();
  const [justPurchased, setJustPurchased] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "failed">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trpcUtils = trpc.useUtils();

  // Check ownership — only fires when we have both module ID + authenticated session
  const { data: purchaseCheck, isLoading: isCheckingPurchase } = trpc.store.checkPurchase.useQuery(
    { moduleId: module?.id ?? "" },
    { enabled: !!module?.id && sessionStatus === "authenticated" },
  ) as { data: { purchased: boolean } | undefined; isLoading: boolean };

  // Poll for purchase completion after Stripe checkout opens in new tab
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setPaymentStatus("pending");
    pollRef.current = setInterval(async () => {
      if (!module?.id) return;
      const result = await trpcUtils.store.checkPurchase.fetch({ moduleId: module.id });
      if (result.purchased) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setPaymentStatus("completed");
        setJustPurchased(true);
      }
    }, 3000); // Check every 3 seconds
  }, [module?.id, trpcUtils]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Derived state
  const isAuthenticated = sessionStatus === "authenticated";
  const isAuthor = isAuthenticated && module?.author.id === (session?.user as { id?: string })?.id;
  const isOwned = justPurchased || (purchaseCheck?.purchased ?? false);
  const isFree = module?.pricingModel === "FREE";

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
        <BackButton fallback="/store" label="Back" />
      </div>
    );
  }

  const latestVersion = module.versions.find((v: { isLatest: boolean }) => v.isLatest) || module.versions[0];

  async function handlePurchase() {
    if (!module) return;
    setPurchaseError(null);
    setPaymentStatus("idle");
    try {
      const result = await purchaseMutation.mutateAsync({ moduleId: module.id });
      if (result.checkoutUrl) {
        // Paid module → open Stripe Checkout in new tab
        window.open(result.checkoutUrl, "_blank");
        // Start polling for payment completion
        startPolling();
      } else {
        // Free module → instant acquisition
        setJustPurchased(true);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to process purchase";
      setPurchaseError(message);
      setPaymentStatus("failed");
    }
  }

  // ---- Purchase Card Content ----
  function renderPurchaseAction() {
    // Not logged in
    if (!isAuthenticated) {
      return (
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow"
        >
          Sign in to acquire
        </Link>
      );
    }

    // Author viewing their own module
    if (isAuthor) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <User className="h-4 w-4" />
          Your Module
        </div>
      );
    }

    // Already owns it (from DB check or just purchased)
    if (isOwned) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            <Check className="h-4 w-4" />
            Owned
          </div>
          <Link
            href="/link/deploy"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Rocket className="h-4 w-4" />
            Deploy Now
          </Link>
        </div>
      );
    }

    // Still checking purchase status
    if (isCheckingPurchase) {
      return (
        <button
          disabled
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow opacity-50"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking...
        </button>
      );
    }

    // Waiting for payment in the other tab
    if (paymentStatus === "pending") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Awaiting payment...
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Complete your purchase in the Stripe tab. This page will update automatically.
          </p>
          <button
            onClick={() => {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              setPaymentStatus("idle");
            }}
            className="inline-flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      );
    }

    // Available for purchase
    return (
      <div className="space-y-3">
        <button
          onClick={handlePurchase}
          disabled={purchaseMutation.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {purchaseMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}
          {purchaseMutation.isPending
            ? "Processing..."
            : isFree
              ? "Get Module"
              : "Buy Now"}
        </button>

        {purchaseError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {purchaseError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BackButton fallback="/store" label="Back" />

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

            {renderPurchaseAction()}

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
