"use client";

import { ShoppingBag, Package, ArrowRight } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { ModuleGrid } from "@/components/store/module-grid";

interface PurchaseItem {
  module: Parameters<typeof ModuleGrid>[0]["modules"][0];
}

export default function MyPurchasesPage() {
  const { data: purchases, isLoading } = trpc.store.getMyPurchases.useQuery() as {
    data: PurchaseItem[] | undefined;
    isLoading: boolean;
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
        <ModuleGrid modules={purchases.map((p) => p.module)} />
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
