"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
        params.delete("page");
      } else {
        params.delete("q");
      }
      router.push(`/store?${params.toString()}`);
    }, 300);
  }

  function handleClear() {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`/store?${params.toString()}`);
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search modules..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
