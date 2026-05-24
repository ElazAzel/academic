"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { NAV_BY_ROLE } from "@/components/layout/navigation";
import { useSession } from "next-auth/react";
import type { RoleKey } from "@/types/domain";

export function CommandPalette() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const roles = (session?.user?.roles ?? ["student"]) as RoleKey[];
  const primaryRole = (["admin", "super_curator", "curator", "instructor", "customer_observer", "student"] as RoleKey[]).find(
    (r) => roles.includes(r)
  );
  const links = primaryRole ? NAV_BY_ROLE[primaryRole] : [];

  const filtered = query.trim()
    ? links.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
    : links;

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && filtered.length > 0) {
        handleSelect(filtered[0].href);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, handleSelect]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-xl rounded-lg border bg-card shadow-m3-modal overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b px-4 py-3 dark:border-gray-800">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Поиск по разделам..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded-md border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.length > 0 ? (
                <div className="space-y-0.5">
                  {filtered.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleSelect(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Ничего не найдено
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
