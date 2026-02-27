"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, Rocket } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const moduleSlug = searchParams.get("module");

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>

      <h1 className="text-2xl font-bold">Payment Successful!</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Your purchase is complete. The module has been added to your account and
        is ready to deploy.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {moduleSlug && (
          <Link
            href={`/store/${moduleSlug}`}
            className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            <Package className="h-4 w-4" />
            View Module
          </Link>
        )}
        <Link
          href="/link/deploy"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <Rocket className="h-4 w-4" />
          Deploy Now
        </Link>
      </div>

      <Link
        href="/store"
        className="mt-6 text-sm text-muted-foreground hover:text-foreground"
      >
        Continue browsing the Store
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
