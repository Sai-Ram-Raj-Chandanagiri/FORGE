"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name (A-Z)" },
];

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "relevance";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    router.push(`/store?${params.toString()}`);
  }

  return (
    <select
      value={currentSort}
      onChange={(e) => handleChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
