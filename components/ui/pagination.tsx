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
      <p className="text-sm text-muted-foreground">
        Страница {currentPage} из {totalPages}
      </p>
      <div className="flex items-center gap-1">
        {currentPage > 1 ? (
          <Link
            href={href(currentPage - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : null}
        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="inline-flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={href(page)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
                page === currentPage
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {page}
            </Link>
          )
        )}
        {currentPage < totalPages ? (
          <Link
            href={href(currentPage + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
