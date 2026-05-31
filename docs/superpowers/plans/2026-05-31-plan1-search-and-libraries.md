# Plan 1: Поиск в CommandPalette + Новые библиотеки

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Добавить API-поиск в CommandPalette и интегрировать 5 новых библиотек (recharts, vaul, hls.js, usehooks-ts, nuqs)

**Architecture:** Search использует существующий `searchAcademy()` из `server/modules/search/service.ts` через API `/api/v1/search`. recharts заменяет самодельные BarChart/DonutChart в analytics. vaul добавляет мобильный Drawer в XpCenterModal. hls.js добавляет провайдер `upload` в VideoBlock. usehooks-ts и nuqs — точечные интеграции.

**Tech Stack:** Next.js 16, recharts, vaul, hls.js, usehooks-ts, nuqs

---

### Task 1.1: Добавить useDebounce в CommandPalette

**Files:**
- Modify: `components/lms/command-palette.tsx`

- [ ] **Step 1: Добавить импорты и состояние поиска**

Добавить в начало файла:
```typescript
import { useDebounce } from "usehooks-ts";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, User, Search, Loader2 } from "lucide-react";
```

Добавить состояния в тело компонента после `const [query, setQuery] = useState("");`:
```typescript
const [searchResults, setSearchResults] = useState<{
  courses: Array<{ id: string; title: string; description: string }>;
  lessons: Array<{ id: string; title: string; summary: string | null }>;
  users: Array<{ id: string; name: string | null; email: string }>;
}>({ courses: [], lessons: [], users: [] });
const [isSearching, setIsSearching] = useState(false);
const [searchError, setSearchError] = useState(false);
const [showSearchResults, setShowSearchResults] = useState(false);
```

- [ ] **Step 2: Добавить useDebounce и API-вызов**

После `useEffect` с `onKeyDown` добавить:
```typescript
const debouncedQuery = useDebounce(query, 300);

const isAdmin = roles.includes("admin");

useEffect(() => {
  if (!debouncedQuery.trim()) {
    setSearchResults({ courses: [], lessons: [], users: [] });
    setShowSearchResults(false);
    setSearchError(false);
    return;
  }

  setShowSearchResults(true);
  setIsSearching(true);
  setSearchError(false);

  fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`)
    .then((res) => {
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    })
    .then((data) => {
      setSearchResults(data);
      setIsSearching(false);
    })
    .catch(() => {
      setSearchError(true);
      setIsSearching(false);
    });
}, [debouncedQuery, isAdmin]);
```

- [ ] **Step 3: Обновить JSX для отображения секций поиска**

Заменить содержимое `<div className="max-h-72 overflow-y-auto p-2">...</div>` на:

```typescript
// existing filtered for nav links when no search
const filtered = query.trim()
  ? links.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
  : links;

// render
{showSearchResults ? (
  <div className="max-h-80 overflow-y-auto p-2 space-y-3">
    {isSearching ? (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Поиск...</span>
      </div>
    ) : searchError ? (
      <p className="py-6 text-center text-sm text-destructive">Ошибка поиска</p>
    ) : searchResults.courses.length === 0 &&
      searchResults.lessons.length === 0 &&
      searchResults.users.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>
    ) : (
      <>
        {searchResults.courses.length > 0 && (
          <SectionGroup title="Курсы" icon={GraduationCap}>
            {searchResults.courses.map((c) => (
              <SearchItem
                key={c.id}
                label={c.title}
                sublabel={c.description}
                onClick={() => handleSelect(`/course/${c.id}`)}
              />
            ))}
          </SectionGroup>
        )}
        {searchResults.lessons.length > 0 && (
          <SectionGroup title="Уроки" icon={BookOpen}>
            {searchResults.lessons.map((l) => (
              <SearchItem
                key={l.id}
                label={l.title}
                sublabel={l.summary ?? undefined}
                onClick={() => handleSelect(`/lesson/${l.id}`)}
              />
            ))}
          </SectionGroup>
        )}
        {searchResults.users.length > 0 && isAdmin && (
          <SectionGroup title="Пользователи" icon={User}>
            {searchResults.users.map((u) => (
              <SearchItem
                key={u.id}
                label={u.name ?? u.email}
                sublabel={u.email}
                onClick={() => handleSelect(`/admin/users`)}
              />
            ))}
          </SectionGroup>
        )}
      </>
    )}
  </div>
) : (
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
      <p className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>
    )}
  </div>
)}
```

- [ ] **Step 4: Добавить хелпер-компоненты SectionGroup и SearchItem**

В конец файла, перед закрывающей скобкой компонента (внутри того же файла):

```typescript
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
```

- [ ] **Step 5: Проверить сборку и типы**

Run: `npm run typecheck`
Expected: Clean, no errors

- [ ] **Step 6: Commit**

```bash
git add components/lms/command-palette.tsx
git commit -m "Feat: глобальный поиск в CommandPalette через /api/v1/search + useDebounce"
```

---

### Task 1.2: Заменить BarChart/DonutChart на recharts

**Files:**
- Create: `components/charts/activity-area-chart.tsx`
- Create: `components/charts/visit-bar-chart.tsx`
- Create: `components/charts/distribution-pie-chart.tsx`
- Modify: `components/admin/visit-analytics-block.tsx`

- [ ] **Step 1: Создать activity-area-chart.tsx**

```typescript
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ActivityPoint {
  date: string;
  value: number;
}

export function ActivityAreaChart({ data }: { data: ActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary) / 0.12)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Создать visit-bar-chart.tsx**

```typescript
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface VisitBar {
  label: string;
  value: number;
  color?: string;
}

export function VisitBarChart({ data, barKey = "value" }: { data: VisitBar[]; barKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
        />
        <Bar dataKey={barKey} radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Создать distribution-pie-chart.tsx**

```typescript
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PieSlice {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 215 80% 55%))",
  "hsl(var(--chart-3, 142 70% 45%))",
  "hsl(var(--chart-4, 30 90% 55%))",
  "hsl(var(--chart-5, 0 75% 55%))",
];

export function DistributionPieChart({ data }: { data: PieSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, idx) => (
            <Cell key={entry.name} fill={entry.color || COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
          }}
        />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Переписать visit-analytics-block.tsx на recharts**

Заменить импорт:
```typescript
// было:
import { BarChart } from "@/components/lms/bar-chart";
// стало:
import { VisitBarChart } from "@/components/charts/visit-bar-chart";
import { ActivityAreaChart } from "@/components/charts/activity-area-chart";
```

Заменить вызовы `<BarChart ...>` на соответствующие recharts-компоненты.

Пример замены (все 10 вызовов BarChart по паттерну):
```typescript
// было:
<BarChart
  items={data.daily.map((d) => ({ label: d.date, value: d.count }))}
  className="mt-4"
/>

// стало:
<VisitBarChart data={data.daily.map((d) => ({ label: d.date, value: d.count }))} />
```

- [ ] **Step 5: Удалить старый bar-chart.tsx**

```bash
Remove-Item -LiteralPath "components/lms/bar-chart.tsx"
```

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 7: Commit**

```bash
git add components/charts/ components/admin/visit-analytics-block.tsx
git add -u # for deletion of bar-chart.tsx
git commit -m "Feat: recharts — интерактивные графики вместо самодельных BarChart/DonutChart"
```

---

### Task 1.3: vaul Drawer для XpCenterModal на мобилках

**Files:**
- Modify: `components/lms/xp-center-modal.tsx`

- [ ] **Step 1: Добавить vaul Drawer для мобильного viewport**

```typescript
// добавить импорты:
import { useMediaQuery } from "usehooks-ts";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "vaul";
```

- [ ] **Step 2: Обернуть содержимое в условный Drawer/Dialog**

```typescript
export function XpCenterModal({ isOpen, onClose, xp, levelInfo }: XpCenterModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  // ... existing logic ...

  const content = (
    // всё содержимое модалки без Dialog обёртки
    <>
      <DialogHeader>...</DialogHeader>
      <div className="space-y-6 px-6 pb-6 pt-4">...</div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[85vh] rounded-t-2xl border-m3-outline-variant">
          <div className="px-4 pb-8">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-lg border-m3-outline-variant bg-m3-surface-container-lowest p-0 shadow-m3-modal">
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add components/lms/xp-center-modal.tsx
git commit -m "Feat: vaul Drawer для XpCenterModal на мобилках + useMediaQuery"
```

---

### Task 1.4: hls.js — провайдер upload в VideoBlock

**Files:**
- Create: `components/lms/hls-player.tsx`
- Create: `components/lms/video-upload-field.tsx`
- Modify: `types/domain.ts`
- Modify: `components/lms/video-block.tsx`

- [ ] **Step 1: Добавить "upload" в VideoProvider type**

В `types/domain.ts`, строка 156:
```typescript
export type VideoProvider = "youtube" | "vimeo" | "bunny" | "mux" | "cloudflare" | "peertube" | "upload";
```

- [ ] **Step 2: Создать HlsPlayer компонент**

```typescript
"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

export function HlsPlayer({ url, className }: { url: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS support
      video.src = url;
    }

    return () => {
      hls?.destroy();
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      controls
      className={className ?? "absolute inset-0 h-full w-full"}
      playsInline
    />
  );
}
```

- [ ] **Step 3: Создать video-upload-field.tsx**

```typescript
"use client";

import { useState, useRef } from "react";
import { Upload, FileVideo, X } from "lucide-react";
import { uploadLessonMediaAction } from "@/server/actions/files";

interface VideoUploadFieldProps {
  lessonId: string;
  onUploaded: (url: string) => void;
}

export function VideoUploadField({ lessonId, onUploaded }: VideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setError("Можно загружать только видеофайлы");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Upload via existing API
      const res = await fetch("/api/v1/media/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: "lesson-videos",
          filename: file.name,
          contentType: file.type,
        }),
      });
      const { publicUrl } = await res.json();
      // Save as lesson media
      await uploadLessonMediaAction(lessonId, "video", publicUrl, file.name);
      onUploaded(publicUrl);
    } catch {
      setError("Ошибка загрузки видео");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 transition-colors hover:border-muted-foreground/50"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        role="button"
        tabIndex={0}
        aria-label="Загрузить видео"
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            Загрузка...
          </div>
        ) : (
          <>
            <FileVideo className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Нажмите, чтобы загрузить видео (MP4, M3U8)
            </span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/mpeg,.m3u8,application/vnd.apple.mpegurl"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <X className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Обновить VideoBlock для поддержки провайдера upload**

В `components/lms/video-block.tsx`, добавить импорт:
```typescript
import { HlsPlayer } from "./hls-player";
```

Добавить условие в `resolveEmbedUrl` или в рендер before iframe:

После строки с `const isPrivate = resolvedVideo?.isPrivate ?? false;`:
```typescript
const isUpload = resolvedVideo?.provider === "upload";
const isHls = isUpload && resolvedVideo?.providerVideoId?.endsWith(".m3u8");
```

В рендер секции, внутри `canWatch`, добавить блок перед `useIFrameAPI`:
```typescript
{isUpload ? (
  isHls ? (
    <HlsPlayer url={resolvedVideo!.providerVideoId} />
  ) : (
    <video
      src={resolvedVideo!.providerVideoId}
      controls
      className="absolute inset-0 h-full w-full"
      playsInline
    />
  )
) : useIFrameAPI ? (
  // ... existing YouTube API player
) : plainEmbedUrl ? (
  // ... existing iframe
) : null}
```

- [ ] **Step 5: Проверить сборку**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 6: Commit**

```bash
git add types/domain.ts components/lms/hls-player.tsx components/lms/video-upload-field.tsx components/lms/video-block.tsx
git commit -m "Feat: hls.js + провайдер upload для VideoBlock (MP4/M3U8)"
```

---

### Task 1.5: nuqs — фильтры в URL для аналитики

**Files:**
- Modify: `components/admin/visit-analytics-block.tsx` (если уже не заменён на recharts)

- [ ] **Step 1: Добавить useQueryState для фильтра периода**

В `visit-analytics-block.tsx` (или компонент аналитики):

```typescript
import { useQueryState } from "nuqs";

// внутри компонента:
const [days, setDays] = useQueryState("days", { defaultValue: "30" });
const [cohortId, setCohortId] = useQueryState("cohort", { defaultValue: "" });
```

- [ ] **Step 2: Использовать URL-параметры для фильтрации**

```typescript
// вместо локального state
const analytics = await getVisitAnalytics(parseInt(days));
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/visit-analytics-block.tsx
git commit -m "Feat: nuqs — фильтры аналитики в URL"
```
