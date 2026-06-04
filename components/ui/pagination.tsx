import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}) {
  if (totalPages <= 1) return null;

  function href(page: number) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${page}`;
  }

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Пагинация">
      <p className="text-sm text-m3-on-surface-variant">
        Страница {currentPage} из {totalPages}
      </p>
      <div className="flex items-center gap-1 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container/40 p-1 backdrop-blur-sm">
        {currentPage > 1 ? (
          <Link
            href={href(currentPage - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm text-m3-on-surface-variant transition-all hover:bg-m3-surface-container-high/60 hover:text-m3-on-surface"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : null}
        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="inline-flex h-9 w-9 items-center justify-center text-sm text-m3-on-surface-variant/50">
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={href(page)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all",
                page === currentPage
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                  : "text-m3-on-surface-variant hover:bg-m3-surface-container-high/60 hover:text-m3-on-surface"
              )}
            >
              {page}
            </Link>
          )
        )}
        {currentPage < totalPages ? (
          <Link
            href={href(currentPage + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm text-m3-on-surface-variant transition-all hover:bg-m3-surface-container-high/60 hover:text-m3-on-surface"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
