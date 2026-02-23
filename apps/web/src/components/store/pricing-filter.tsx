"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PRICING_OPTIONS = [
  { value: "", label: "All Pricing" },
  { value: "FREE", label: "Free" },
  { value: "ONE_TIME", label: "One-Time" },
  { value: "SUBSCRIPTION_MONTHLY", label: "Monthly" },
  { value: "SUBSCRIPTION_YEARLY", label: "Yearly" },
  { value: "USAGE_BASED", label: "Usage-Based" },
];

export function PricingFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPricing = searchParams.get("pricing") || "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("pricing", value);
    } else {
      params.delete("pricing");
    }
    params.delete("page");
    router.push(`/store?${params.toString()}`);
  }

  return (
    <select
      value={currentPricing}
      onChange={(e) => handleChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {PRICING_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
