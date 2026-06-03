"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Search, GraduationCap, BookOpen, User, Loader2 } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { NAV_BY_ROLE } from "@/components/layout/navigation";
import { useSession } from "next-auth/react";
import type { RoleKey } from "@/types/domain";

const SEARCH_DEBOUNCE_MS = 300;

interface SearchResultsData {
  courses: Array<{ id: string; title: string; description: string }>;
  lessons: Array<{ id: string; title: string; summary: string | null }>;
  users: Array<{ id: string; name: string | null; email: string }>;
}

export function CommandPalette() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultsData>({ courses: [], lessons: [], users: [] });
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [debouncedQuery] = useDebounceValue(query, SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedQuery.trim().length > 0
    && searchResults.courses.length === 0
    && searchResults.lessons.length === 0
    && searchResults.users.length === 0
    && !searchError;
  const showSearchResults = debouncedQuery.trim().length > 0;

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

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
      if (e.key === "Enter") {
        if (showSearchResults && !isSearching && !searchError) {
          const { courses, lessons, users } = searchResults;
          const firstResult = courses[0] || lessons[0] || users[0];
          if (firstResult) {
            let href = "";
            if (courses.includes(firstResult as any)) href = `/courses/${firstResult.id}`;
            else if (lessons.includes(firstResult as any)) href = `/lessons/${firstResult.id}`;
            else href = `/users/${firstResult.id}`;
            handleSelect(href);
          }
        } else if (filtered.length > 0) {
          handleSelect(filtered[0].href);
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, handleSelect, showSearchResults, isSearching, searchError, searchResults]);

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    const controller = new AbortController();

    if (!debouncedQuery.trim()) {
      return;
    }

    fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось выполнить поиск");
        return res.json();
      })
      .then((data) => {
        setSearchResults(data);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setSearchError(true);
      });

    return () => controller.abort();
  }, [debouncedQuery, isAdmin]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] pointer-events-none">
          <div
            className="pointer-events-auto w-full max-w-xl rounded-lg border bg-card shadow-m3-modal overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center gap-3 border-b px-4 py-3 dark:border-gray-800">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Поиск по разделам..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded-md border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {showSearchResults ? (
                <>
                  {isSearching ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Поиск...
                    </div>
                  ) : searchError ? (
                    <p className="py-6 text-center text-sm text-destructive">
                      Ошибка поиска
                    </p>
                  ) : searchResults.courses.length === 0 &&
                    searchResults.lessons.length === 0 &&
                    searchResults.users.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Ничего не найдено
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.courses.length > 0 && (
                        <SectionGroup title="Курсы" icon={GraduationCap}>
                          {searchResults.courses.map((course) => (
                            <SearchItem
                              key={course.id}
                              label={course.title}
                              sublabel={course.description}
                              onClick={() => handleSelect(`/courses/${course.id}`)}
                            />
                          ))}
                        </SectionGroup>
                      )}
                      {searchResults.lessons.length > 0 && (
                        <SectionGroup title="Уроки" icon={BookOpen}>
                          {searchResults.lessons.map((lesson) => (
                            <SearchItem
                              key={lesson.id}
                              label={lesson.title}
                              sublabel={lesson.summary ?? undefined}
                              onClick={() => handleSelect(`/lessons/${lesson.id}`)}
                            />
                          ))}
                        </SectionGroup>
                      )}
                      {isAdmin && searchResults.users.length > 0 && (
                        <SectionGroup title="Пользователи" icon={User}>
                          {searchResults.users.map((user) => (
                            <SearchItem
                              key={user.id}
                              label={user.name ?? user.email}
                              sublabel={user.name ? user.email : undefined}
                              onClick={() => handleSelect(`/users/${user.id}`)}
                            />
                          ))}
                        </SectionGroup>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

function SectionGroup({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-1 py-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SearchItem({ label, sublabel, onClick }: { label: string; sublabel?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-muted"
    >
      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {sublabel && (
          <span className="block truncate text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </button>
  );
}
