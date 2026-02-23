"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    router.push(`/store?${params.toString()}`);
  }

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm disabled:pointer-events-none disabled:opacity-50 hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => goToPage(page)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm ${
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            {page}
          </button>
        ),
      )}
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm disabled:pointer-events-none disabled:opacity-50 hover:bg-muted"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
