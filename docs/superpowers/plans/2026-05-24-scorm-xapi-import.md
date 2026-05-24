# SCORM/xAPI Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full SCORM 1.2 + 2004 ZIP import, proxy serving with API Bridge injection, student player, and minimal xAPI LRS.

**Architecture:** ZIP upload → server-side extraction + manifest parsing → files stored in Supabase Storage `scorm-packages/` bucket. Same-origin proxy serves files with injected SCORM API Bridge (JS). CMI data persisted via REST endpoints on `ScormLaunch`. xAPI statements stored in `xapi_statements` table.

**Tech Stack:** Next.js 16 App Router, Prisma + PostgreSQL, Supabase Storage, fast-xml-parser, Zod validation

---

### File Structure Overview

**Types & Constants:**
- Modify: `types/domain.ts` — add `ScormBlockData`, extend `ContentBlockType`, `ContentBlock` discriminated union
- Modify: `lib/constants.ts` — add `SCORM_MAX_SIZE_BYTES`

**Server Modules:**
- Create: `server/modules/scorm/import.ts` — ZIP upload, extraction, manifest parsing, file storage
- Create: `server/modules/scorm/manifest-parser.ts` — imsmanifest.xml → organizations, resources, version
- Create: `server/modules/scorm/proxy.ts` — serve files + inject API Bridge
- Create: `server/modules/scorm/api-bridge.ts` — JS templates for SCORM 1.2 + 2004
- Create: `server/modules/scorm/cmi-service.ts` — CMI value CRUD on ScormLaunch
- Create: `server/modules/xapi/lrs.ts` — validate + store + query statements
- Create: `server/modules/xapi/auth.ts` — API key check for xAPI

**API Routes:**
- Create: `app/api/v1/lessons/[lessonId]/scorm/import/route.ts` — POST import ZIP
- Create: `app/api/v1/lessons/[lessonId]/scorm/package/route.ts` — GET status + DELETE
- Create: `app/api/v1/scorm/serve/[...path]/route.ts` — GET proxy (catch-all)
- Create: `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/route.ts` — PATCH update
- Create: `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/cmi/route.ts` — GET/POST CMI
- Create: `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/init/route.ts` — POST init
- Create: `app/api/v1/xapi/statements/route.ts` — POST + GET

**UI Components:**
- Modify: `components/lms/lesson-block-editor.tsx` — add scorm block type
- Create: `components/lms/scorm-block.tsx` — upload form + status display
- Create: `components/lms/scorm-player.tsx` — iframe + fullscreen + progress
- Modify: `components/lms/lesson-player-shell.tsx` — render ScormPlayer for scorm block

**DB Migration:**
- Create: `prisma/migrations/20260524000001_add_xapi_statements/migration.sql`
- Modify: `prisma/schema.prisma` — add XapiStatement model

---

### Task 1: Add xapi_statements migration + schema

**Files:**
- Create: `prisma/migrations/20260524000001_add_xapi_statements/migration.sql`
- Modify: `prisma/schema.prisma` — add XapiStatement model after ScormLaunch model block

- [ ] **Step 1: Add XapiStatement model to schema.prisma**

Add after the ScormLaunch model block (after line ~1330):

```prisma
// ── xAPI LRS (Phase 2.4) ──────────────────────────────────────────────

model XapiStatement {
  id          String   @id
  statement   Json
  stored      DateTime @default(now())
  userId      String?
  lessonId    String?

  @@index([userId])
  @@map("xapi_statements")
}
```

- [ ] **Step 2: Create migration file**

```sql
-- Create xAPI LRS statement storage

CREATE TABLE IF NOT EXISTS xapi_statements (
  id TEXT PRIMARY KEY,
  statement JSONB NOT NULL,
  stored TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT,
  lesson_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_xapi_statements_user ON xapi_statements(user_id);
```

- [ ] **Step 3: Apply migration**

Run: `npx prisma migrate dev --name add_xapi_statements`
Expected: Migration applied, Prisma generates XapiStatement type

- [ ] **Step 4: Commit**

```
git add prisma/schema.prisma prisma/migrations/20260524000001_add_xapi_statements/
git commit -m "feat: add xapi_statements table"
```

---

### Task 2: Extend types for SCORM block

**Files:**
- Modify: `types/domain.ts`

- [ ] **Step 1: Add ScormBlockData interface and extend discriminated unions**

Add after the `CompletionBlockData` interface (~line 205):

```typescript
export interface ScormBlockData {
  packageId: string;
  lessonId: string;
}
```

Add `"scorm"` to `ContentBlockType` union (~line 153):

```typescript
export type ContentBlockType =
  | "video" | "text" | "file" | "quiz" | "assignment"
  | "rating" | "curator_question" | "completion"
  | "scorm";
```

Add `ScormContentBlock` interface after `CompletionContentBlock` (~line 259):

```typescript
export interface ScormContentBlock extends ContentBlockBase {
  type: "scorm";
  data: ScormBlockData;
}
```

Add `ScormContentBlock` to `ContentBlock` discriminated union:

```typescript
export type ContentBlock =
  | VideoContentBlock | TextContentBlock | FileContentBlock
  | QuizContentBlock | AssignmentContentBlock | RatingContentBlock
  | CuratorQuestionContentBlock | CompletionContentBlock
  | ScormContentBlock;
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```
git add types/domain.ts
git commit -m "feat: add scorm block type to ContentBlock union"
```

---

### Task 3: ZIP import — manifest parser

**Files:**
- Create: `server/modules/scorm/manifest-parser.ts`

- [ ] **Step 1: Write manifest-parser.ts**

```typescript
import { XMLParser } from "fast-xml-parser";

export interface ScormResource {
  identifier: string;
  href?: string;
  type: string;
  dependencies: string[];
}

export interface ScormOrganization {
  identifier: string;
  title: string;
}

export interface ParsedManifest {
  title: string;
  scormVersion: string;
  organizations: ScormOrganization[];
  resources: ScormResource[];
  entryPoint: string | null;
}

export function parseManifest(xmlContent: string): ParsedManifest {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(xmlContent);
  const manifest = doc.manifest ?? doc.Manifest;
  if (!manifest) throw new Error("Invalid SCORM manifest: no <manifest> root");

  // Determine SCORM version from schemaversion or metadata
  const meta = manifest.metadata ?? manifest.Metadata ?? {};
  const schemaver = meta.schemaversion ?? meta.SchemaVersion ?? meta.SchemaVersion ?? "";
  const versionStr = typeof schemaver === "string" ? schemaver : String(schemaver ?? "");
  const scormVersion = detectVersion(versionStr);

  // Title from metadata.organization.title or manifest metadata
  const title =
    meta?.title ?? meta?.Title ??
    manifest?.organizations?.Organization?.@_title ??
    manifest?.Organizations?.Organization?.@_title ??
    "SCORM Package";

  // Parse organizations
  const orgsRaw = manifest.organizations ?? manifest.Organizations ?? {};
  const orgList = orgsRaw.organization ?? orgsRaw.Organization ?? [];
  const orgsArr = Array.isArray(orgList) ? orgList : [orgList];
  const organizations: ScormOrganization[] = orgsArr.map((o: Record<string, unknown>) => ({
    identifier: String(o["@_identifier"] ?? o["@_id"] ?? ""),
    title: String(o["@_title"] ?? o["title"] ?? ""),
  }));

  // Parse resources  
  const resRaw = manifest.resources ?? manifest.Resources ?? {};
  const resList = resRaw.resource ?? resRaw.Resource ?? [];
  const resArr = Array.isArray(resList) ? resList : [resList];
  const resources: ScormResource[] = resArr.map((r: Record<string, unknown>) => {
    const deps = r.dependency ?? r.Dependency ?? [];
    const depsArr = Array.isArray(deps) ? deps : [deps];
    return {
      identifier: String(r["@_identifier"] ?? r["@_id"] ?? ""),
      href: String(r["@_href"] ?? r["@_url"] ?? ""),
      type: String(r["@_type"] ?? r["@_adlcp:scormtype"] ?? ""),
      dependencies: depsArr.map((d: Record<string, unknown>) => String(d["@_identifierref"] ?? "")).filter(Boolean),
    };
  });

  // Find entry point: resource referenced by first organization item
  const orgItem = orgsArr[0]?.item ?? orgsArr[0]?.Item ?? orgsArr[0]?.items ?? [];
  const firstItem = Array.isArray(orgItem) ? orgItem[0] : orgItem;
  const resourceRef = firstItem?.["@_identifierref"] ?? "";
  const entryResource = resources.find((r) => r.identifier === resourceRef);
  let entryPoint = entryResource?.href ?? resources[0]?.href ?? null;

  // Clean entry point (remove leading /)
  if (entryPoint) entryPoint = entryPoint.replace(/^\//, "");

  return { title, scormVersion, organizations, resources, entryPoint };
}

function detectVersion(versionStr: string): string {
  const v = versionStr.trim().toLowerCase();
  if (v.includes("2004") || v.includes("cam") || v.includes("1.3")) return "2004";
  if (v.includes("1.2")) return "1.2";
  // Default: try to detect from known patterns
  return v || "1.2";
}
```

- [ ] **Step 2: Write test for manifest parser**

Create `tests/unit/scorm/manifest-parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseManifest } from "@/server/modules/scorm/manifest-parser";

const SCORM_12_MANIFEST = `<?xml version="1.0"?>
<manifest identifier="test" version="1">
  <metadata>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1" title="Test Course">
      <item identifier="item1" identifierref="res1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" href="index.html" type="webcontent" adlcp:scormtype="sco"/>
  </resources>
</manifest>`;

describe("parseManifest", () => {
  it("parses SCORM 1.2 manifest", () => {
    const result = parseManifest(SCORM_12_MANIFEST);
    expect(result.title).toBe("Test Course");
    expect(result.scormVersion).toBe("1.2");
    expect(result.organizations).toHaveLength(1);
    expect(result.organizations[0].title).toBe("Test Course");
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].href).toBe("index.html");
    expect(result.entryPoint).toBe("index.html");
  });

  it("throws on missing manifest root", () => {
    expect(() => parseManifest("<root/>")).toThrow("Invalid SCORM manifest");
  });
});
```

- [ ] **Step 3: Run test**

Run: `npx vitest run tests/unit/scorm/manifest-parser.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```
git add server/modules/scorm/manifest-parser.ts tests/unit/scorm/manifest-parser.test.ts
git commit -m "feat: add SCORM manifest parser"
```

---

### Task 4: ZIP import — storage helpers + import service

**Files:**
- Create: `server/modules/scorm/storage.ts`
- Create: `server/modules/scorm/import.ts`
- Create: `app/api/v1/lessons/[lessonId]/scorm/import/route.ts`
- Modify: `lib/constants.ts` — add SCORM_MAX_SIZE_BYTES

- [ ] **Step 1: Add SCORM size constant to lib/constants.ts**

```typescript
SCORM_MAX_SIZE_BYTES: 200 * 1024 * 1024, // 200 MB
```

Add inside `UPLOAD` object.

- [ ] **Step 2: Create storage.ts**

```typescript
import { getStorageClient } from "@/lib/storage";

const SCORM_BUCKET = "scorm-packages";

export async function uploadScormFile(
  packageId: string,
  relativePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const client = getStorageClient();
  if (!client) return null;

  const storagePath = `${packageId}/${relativePath}`;
  const { error } = await client.storage.from(SCORM_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error("[ScormStorage] Upload error:", error.message);
    return null;
  }
  return storagePath;
}

export async function deleteScormDirectory(packageId: string): Promise<boolean> {
  const client = getStorageClient();
  if (!client) return false;

  const { data, error: listError } = await client.storage.from(SCORM_BUCKET).list(packageId);
  if (listError || !data?.length) {
    // Try deleting the prefix anyway
    const { error } = await client.storage.from(SCORM_BUCKET).remove([packageId]);
    return !error;
  }

  const files = data.map((f) => `${packageId}/${f.name}`);
  const { error } = await client.storage.from(SCORM_BUCKET).remove(files);
  return !error;
}

export async function downloadScormFile(storagePath: string): Promise<{ data: ReadableStream; contentType: string } | null> {
  const client = getStorageClient();
  if (!client) return null;

  const { data, error } = await client.storage.from(SCORM_BUCKET).download(storagePath);
  if (error || !data) return null;

  return { data: data.stream(), contentType: data.type || "application/octet-stream" };
}
```

- [ ] **Step 3: Create import.ts**

```typescript
import { getPrisma } from "@/lib/prisma";
import { UPLOAD } from "@/lib/constants";
import { ApiError } from "@/lib/http";
import { parseManifest } from "./manifest-parser";
import { uploadScormFile, deleteScormDirectory } from "./storage";
import { createId } from "@paralleldrive/cuid2";
import AdmZip from "adm-zip";

const MIME_MAP: Record<string, string> = {
  ".html": "text/html", ".htm": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "text/xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".mp3": "audio/mpeg", ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".swf": "application/x-shockwave-flash",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? MIME_MAP[`.${ext}`] || "application/octet-stream" : "application/octet-stream";
}

export async function importScormPackage(lessonId: string, zipBuffer: Buffer) {
  const prisma = getPrisma();

  if (zipBuffer.length > UPLOAD.SCORM_MAX_SIZE_BYTES) {
    throw new ApiError("bad_request", "ZIP-файл превышает лимит 200MB", 413);
  }

  // Check for existing package
  const existing = await prisma.scormPackage.findUnique({ where: { lessonId } });
  if (existing) {
    throw new ApiError("conflict", "Урок уже имеет SCORM-пакет. Удалите существующий перед загрузкой.", 409);
  }

  // Extract ZIP
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    throw new ApiError("bad_request", "Ошибка распаковки ZIP — файл повреждён", 422);
  }

  // Find and parse manifest
  const manifestEntry = zip.getEntry("imsmanifest.xml");
  if (!manifestEntry) {
    throw new ApiError("bad_request", "ZIP не является SCORM-пакетом: отсутствует imsmanifest.xml", 422);
  }

  let manifest: ReturnType<typeof parseManifest>;
  try {
    manifest = parseManifest(manifestEntry.getData().toString("utf-8"));
  } catch (err) {
    throw new ApiError("bad_request", "Ошибка парсинга imsmanifest.xml: " + (err instanceof Error ? err.message : "невалидный XML"), 422);
  }

  // Generate package ID and upload files to storage
  const packageId = createId();
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  let uploadCount = 0;

  for (const entry of entries) {
    const fileName = entry.entryName.replace(/\\/g, "/"); // normalize paths
    const contentType = getMimeType(fileName);
    const uploaded = await uploadScormFile(packageId, fileName, entry.getData(), contentType);
    if (uploaded) uploadCount++;
  }

  // Clean temp files (adm-zip is in-memory, no cleanup needed)

  // Determine entry URL (via proxy)
  const entryPoint = manifest.entryPoint || "index.html";
  const entryUrl = `/api/v1/scorm/serve/${packageId}/${entryPoint}`;

  // Create DB record
  const pkg = await prisma.scormPackage.create({
    data: {
      id: packageId,
      lessonId,
      title: manifest.title,
      scormVersion: manifest.scormVersion,
      manifest: manifest as object,
      storageKey: packageId,
      entryUrl,
      status: "VALID",
    },
  });

  return {
    id: pkg.id,
    title: pkg.title,
    version: pkg.scormVersion,
    entryUrl: pkg.entryUrl,
    organizations: manifest.organizations,
    fileCount: uploadCount,
  };
}
```

Note: Check if `adm-zip` or `@paralleldrive/cuid2` are installed. If not, use Node.js built-in `zlib` + custom `crypto.randomUUID()` based approach or install.

- [ ] **Step 3.5: Check and install dependencies if needed**

Run: `npm ls adm-zip @paralleldrive/cuid2 2>&1`
If missing: `npm install adm-zip @paralleldrive/cuid2`
If dev-only: `npm install adm-zip @paralleldrive/cuid2`

- [ ] **Step 4: Create import API route**

Create `app/api/v1/lessons/[lessonId]/scorm/import/route.ts`:

```typescript
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { importScormPackage } from "@/server/modules/scorm/import";

type Context = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return ok({ error: "Файл не предоставлен" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importScormPackage(lessonId, buffer);

    return ok(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 5: Verify unit tests pass**

Run: `npx vitest run tests/unit/scorm/`
Expected: PASS

- [ ] **Step 6: Commit**

```
git add server/modules/scorm/import.ts server/modules/scorm/storage.ts lib/constants.ts
git add app/api/v1/lessons/[lessonId]/scorm/import/route.ts
git commit -m "feat: add SCORM ZIP import module + API route"
```

---

### Task 5: Add SCORM block type to lesson block editor

**Files:**
- Create: `components/lms/scorm-block.tsx`
- Modify: `components/lms/lesson-block-editor.tsx`

- [ ] **Step 1: Create scorm-block.tsx**

```typescript
"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Replace, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScormBlockEditorProps {
  lessonId: string;
  packageInfo?: {
    id: string;
    title: string;
    version: string;
    organizations: Array<{ identifier: string; title: string }>;
    fileCount: number;
  } | null;
  onPackageChange: (pkg: Record<string, unknown> | null) => void;
}

export function ScormBlockEditor({ lessonId, packageInfo, onPackageChange }: ScormBlockEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error("Можно загружать только ZIP-файлы");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/lessons/${lessonId}/scorm/import`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message || "Ошибка импорта");
        return;
      }

      onPackageChange(json.data as Record<string, unknown>);
      toast.success("SCORM-пакет загружен");
    } catch {
      toast.error("Ошибка сети при загрузке");
    } finally {
      setUploading(false);
    }
  }, [lessonId, onPackageChange]);

  const handleDelete = useCallback(async () => {
    if (!packageInfo?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/lessons/${lessonId}/scorm/package`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Ошибка удаления");
        return;
      }
      onPackageChange(null);
      toast.success("SCORM-пакет удалён");
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setDeleting(false);
    }
  }, [lessonId, packageInfo?.id, onPackageChange]);

  if (packageInfo) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 mt-0.5 text-m3-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{packageInfo.title}</p>
              <p className="text-sm text-muted-foreground">
                SCORM {packageInfo.version} · {packageInfo.fileCount} файлов
              </p>
              {packageInfo.organizations?.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {packageInfo.organizations.length} организаций
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => document.getElementById("scorm-zip-input")?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
              Заменить
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Удалить
            </Button>
          </div>
          <input id="scorm-zip-input" type="file" accept=".zip" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Загрузите SCORM-пакет (ZIP)</p>
          <Button variant="outline" disabled={uploading} onClick={() => document.getElementById("scorm-zip-input")?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Загрузка..." : "Выбрать ZIP"}
          </Button>
          <input id="scorm-zip-input" type="file" accept=".zip" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }} />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Modify lesson-block-editor.tsx**

Add SCORM to BLOCK_LABELS (~line 19):

```typescript
const BLOCK_LABELS: Record<ContentBlockType, string> = {
  video: "Видео",
  text: "Текст",
  file: "Файл",
  quiz: "Тест",
  assignment: "Задание",
  rating: "Оценка урока",
  curator_question: "Вопрос куратору",
  completion: "Завершение",
  scorm: "SCORM-пакет",
};
```

Add SCORM to BLOCK_ICONS (~line 31):

```typescript
const BLOCK_ICONS: Record<ContentBlockType, React.ComponentType<{ className?: string }>> = {
  ...
  scorm: FileText,
};
```

Add to defaultBlockData (~line 41):

```typescript
if (type === "scorm") return { packageId: "", lessonId };
```

Add SCORM block rendering in the editor form (~after the file block section, around line 340):

```typescript
{block.type === "scorm" && (
  <ScormBlockEditor
    lessonId={lessonId}
    packageInfo={block.data.packageId ? (scormPackageInfo ?? null) : null}
    onPackageChange={(pkg) => updateBlock(block.id, pkg ? { packageId: pkg.id as string, lessonId } : { packageId: "", lessonId })}
  />
)}
```

Add import at top of file:

```typescript
import { ScormBlockEditor } from "@/components/lms/scorm-block";
```

Add `scormPackageInfo` state to the component:

```typescript
const [scormPackageInfo, setScormPackageInfo] = useState<Record<string, unknown> | null>(null);
```

And fetch it when blocks have scorm type:

```typescript
useEffect(() => {
  const scormBlock = blocks.find((b) => b.type === "scorm");
  if (scormBlock?.data?.packageId) {
    fetch(`/api/v1/lessons/${lessonId}/scorm/package`)
      .then((r) => r.ok ? r.json() : null)
      .then((j) => setScormPackageInfo(j?.data ?? null))
      .catch(() => {});
  }
}, [blocks, lessonId]);
```

- [ ] **Step 3: Commit**

```
git add components/lms/scorm-block.tsx components/lms/lesson-block-editor.tsx
git commit -m "feat: add SCORM block type to lesson editor"
```

---

### Task 6: SCORM package API (GET status + DELETE)

**Files:**
- Create: `app/api/v1/lessons/[lessonId]/scorm/package/route.ts`

- [ ] **Step 1: Create package route**

```typescript
import { errorResponse, ok, empty } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { deleteScormDirectory } from "@/server/modules/scorm/storage";

type Context = { params: Promise<{ lessonId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const prisma = getPrisma();

    const pkg = await prisma.scormPackage.findUnique({ where: { lessonId } });
    if (!pkg) return ok(null, 200);

    return ok({
      id: pkg.id,
      title: pkg.title,
      scormVersion: pkg.scormVersion,
      organizations: (pkg.manifest as { organizations?: Array<{ identifier: string; title: string }> })?.organizations ?? [],
      fileCount: 0,
      entryUrl: pkg.entryUrl,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const prisma = getPrisma();

    const pkg = await prisma.scormPackage.findUnique({ where: { lessonId } });
    if (!pkg) return empty(204);

    await deleteScormDirectory(pkg.id);
    await prisma.scormPackage.delete({ where: { id: pkg.id } });

    return empty(204);
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 2: Commit**

```
git add app/api/v1/lessons/[lessonId]/scorm/package/route.ts
git commit -m "feat: add SCORM package GET/DELETE API"
```

---

### Task 7: Proxy route + API Bridge injection

**Files:**
- Create: `server/modules/scorm/api-bridge.ts`
- Create: `server/modules/scorm/proxy.ts`
- Create: `app/api/v1/scorm/serve/[...path]/route.ts`

- [ ] **Step 1: Create api-bridge.ts**

```typescript
export function getScorm12Bridge(
  launchId: string,
  initUrl: string,
  cmiGetUrl: string,
  cmiSetUrl: string,
  finishUrl: string,
): string {
  return `
(function() {
  var _err = 0;
  var _cache = {};
  window.API = {
    LMSInitialize: function() {
      fetch("${initUrl}", { method: "POST", credentials: "include" }).catch(function(){});
      return "true";
    },
    LMSFinish: function() {
      fetch("${finishUrl}", { method: "PATCH", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"COMPLETED"}) }).catch(function(){});
      return "true";
    },
    LMSGetValue: function(name) {
      if (_cache[name] !== undefined) return _cache[name];
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "${cmiGetUrl}?name=" + encodeURIComponent(name), false);
      xhr.send();
      if (xhr.status === 200) {
        var json = JSON.parse(xhr.responseText);
        _cache[name] = json.data;
        return json.data;
      }
      _err = 101;
      return "";
    },
    LMSSetValue: function(name, value) {
      _cache[name] = value;
      _err = 0;
      return "true";
    },
    LMSCommit: function() {
      var entries = Object.keys(_cache);
      if (entries.length === 0) return "true";
      fetch("${cmiSetUrl}", { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({values:_cache}) }).catch(function(){});
      return "true";
    },
    LMSGetLastError: function() { return String(_err); },
    LMSGetErrorString: function() { return "No error"; },
    LMSGetDiagnostic: function() { return "No error"; },
  };
})();
`;
}

export function getScorm2004Bridge(
  launchId: string,
  initUrl: string,
  cmiGetUrl: string,
  cmiSetUrl: string,
  finishUrl: string,
): string {
  return `
(function() {
  var _err = 0;
  var _cache = {};
  window.API_1484_11 = {
    Initialize: function() {
      fetch("${initUrl}", { method: "POST", credentials: "include" }).catch(function(){});
      return "true";
    },
    Terminate: function() {
      fetch("${finishUrl}", { method: "PATCH", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"COMPLETED"}) }).catch(function(){});
      return "true";
    },
    GetValue: function(name) {
      if (_cache[name] !== undefined) return _cache[name];
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "${cmiGetUrl}?name=" + encodeURIComponent(name), false);
      xhr.send();
      if (xhr.status === 200) {
        var json = JSON.parse(xhr.responseText);
        _cache[name] = json.data;
        return json.data;
      }
      _err = 101;
      return "";
    },
    SetValue: function(name, value) {
      _cache[name] = value;
      _err = 0;
      return "true";
    },
    Commit: function() {
      var entries = Object.keys(_cache);
      if (entries.length === 0) return "true";
      fetch("${cmiSetUrl}", { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({values:_cache}) }).catch(function(){});
      return "true";
    },
    GetLastError: function() { return String(_err); },
    GetErrorString: function() { return "No error"; },
    GetDiagnostic: function() { return "No error"; },
  };
})();
`;
}
```

- [ ] **Step 2: Create proxy.ts**

```typescript
import { getPrisma } from "@/lib/prisma";
import { downloadScormFile } from "./storage";
import { getScorm12Bridge, getScorm2004Bridge } from "./api-bridge";

const MIME_OVERRIDES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

async function findScormPackage(packageId: string) {
  const prisma = getPrisma();
  return prisma.scormPackage.findUnique({ where: { id: packageId } });
}

export async function serveScormFile(packageId: string, filePath: string, launchId?: string) {
  const pkg = await findScormPackage(packageId);
  if (!pkg) return null;

  const storagePath = `${packageId}/${filePath}`;
  const result = await downloadScormFile(storagePath);
  if (!result) return null;

  // Determine content type
  const ext = filePath.split(".").pop()?.toLowerCase();
  const contentType = MIME_OVERRIDES[`.${ext}`] || result.contentType;

  // For HTML files, inject SCORM API Bridge
  if (ext === "html" || ext === "htm") {
    const text = await new Response(result.data).text();
    const bridge = pkg.scormVersion === "2004"
      ? getScorm2004Bridge(
          launchId || "",
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/init`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}`,
        )
      : getScorm12Bridge(
          launchId || "",
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/init`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}`,
        );

    const injected = text.replace("</head>", `<script>${bridge}</script></head>`);
    return { body: injected, contentType };
  }

  return { body: result.data, contentType };
}
```

- [ ] **Step 3: Create serve API route**

Create `app/api/v1/scorm/serve/[...path]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { serveScormFile } from "@/server/modules/scorm/proxy";
import { createScormLaunch, getScormPackage } from "@/server/modules/scorm/service";
import { getToken } from "next-auth/jwt";

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    if (path.length < 2) {
      return new NextResponse("Not found", { status: 404 });
    }

    const [packageId, ...fileParts] = path;
    const filePath = fileParts.join("/");

    // Try to get user for launch tracking (optional — SCORM content may be viewed without login in preview)
    const token = await getToken({ req: request as never });
    let launchId: string | undefined;

    if (token?.sub && filePath.includes("index.")) {
      const pkg = await getScormPackage(path[0] as string);
      if (pkg) {
        try {
          const launch = await createScormLaunch(token.sub, pkg.lessonId, pkg.id);
          launchId = launch.id;
        } catch {
          // Launch creation may fail if user not authenticated properly
        }
      }
    }

    const result = await serveScormFile(packageId, filePath, launchId);
    if (!result) {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse(result.body as BodyInit, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=3600",
        "X-Frame-Options": "ALLOWALL",
      },
    });
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```
git add server/modules/scorm/api-bridge.ts server/modules/scorm/proxy.ts
git add app/api/v1/scorm/serve/[...path]/route.ts
git commit -m "feat: add SCORM proxy route + API Bridge injection"
```

---

### Task 8: CMI backend endpoints

**Files:**
- Create: `server/modules/scorm/cmi-service.ts`
- Create: `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/route.ts`
- Create: `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/cmi/route.ts`
- Create: `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/init/route.ts`

- [ ] **Step 1: Create cmi-service.ts**

```typescript
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

export async function initLaunch(launchId: string, userId: string) {
  const prisma = getPrisma();
  const launch = await prisma.scormLaunch.findUnique({ where: { id: launchId } });
  if (!launch) throw new ApiError("not_found", "Запуск не найден", 404);
  if (launch.userId !== userId) throw new ApiError("forbidden", "Доступ запрещён", 403);

  return prisma.scormLaunch.update({
    where: { id: launchId },
    data: { status: "IN_PROGRESS" },
  });
}

export async function getCmiValue(launchId: string, userId: string, name: string) {
  const prisma = getPrisma();
  const launch = await prisma.scormLaunch.findUnique({ where: { id: launchId } });
  if (!launch) throw new ApiError("not_found", "Запуск не найден", 404);
  if (launch.userId !== userId) throw new ApiError("forbidden", "Доступ запрещён", 403);

  // Map SCORM CMI names to DB fields
  const cmiMap: Record<string, keyof typeof launch> = {
    "cmi.core.lesson_status": "status",
    "cmi.core.score.raw": "score",
    "cmi.core.score.max": "maxScore",
    "cmi.suspend_data": "suspendData",
    "cmi.completion_status": "completion",
    "cmi.success_status": "success",
  };

  // For SCORM 2004
  const cmi2004Map: Record<string, keyof typeof launch> = {
    "cmi.completion_status": "completion",
    "cmi.success_status": "success",
    "cmi.score.raw": "score",
    "cmi.score.max": "maxScore",
    "cmi.suspend_data": "suspendData",
  };

  const field = cmiMap[name] || cmi2004Map[name];
  if (field) {
    const value = launch[field];
    return value !== null ? String(value) : "";
  }

  return "";
}

export async function setCmiValues(launchId: string, userId: string, values: Record<string, string>) {
  const prisma = getPrisma();
  const launch = await prisma.scormLaunch.findUnique({ where: { id: launchId } });
  if (!launch) throw new ApiError("not_found", "Запуск не найден", 404);
  if (launch.userId !== userId) throw new ApiError("forbidden", "Доступ запрещён", 403);

  const update: Record<string, unknown> = {};

  if (values["cmi.core.lesson_status"] || values["cmi.completion_status"]) {
    update.status = values["cmi.core.lesson_status"] || values["cmi.completion_status"] || undefined;
  }
  if (values["cmi.core.score.raw"] || values["cmi.score.raw"]) {
    update.score = Number(values["cmi.core.score.raw"] || values["cmi.score.raw"]);
  }
  if (values["cmi.core.score.max"] || values["cmi.score.max"]) {
    update.maxScore = Number(values["cmi.core.score.max"] || values["cmi.score.max"]);
  }
  if (values["cmi.suspend_data"]) {
    update.suspendData = values["cmi.suspend_data"];
  }
  if (values["cmi.completion_status"]) {
    update.completion = values["cmi.completion_status"];
  }
  if (values["cmi.success_status"]) {
    update.success = values["cmi.success_status"];
  }

  if (Object.keys(update).length > 0) {
    return prisma.scormLaunch.update({ where: { id: launchId }, data: update });
  }

  return launch;
}
```

- [ ] **Step 2: Create init route**

`app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/init/route.ts`:

```typescript
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { initLaunch } from "@/server/modules/scorm/cmi-service";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const result = await initLaunch(launchId, user.id);
    return ok({ status: result.status });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 3: Create CMI route**

`app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/cmi/route.ts`:

```typescript
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getCmiValue, setCmiValues } from "@/server/modules/scorm/cmi-service";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    if (!name) return ok({ error: "name parameter required" }, 400);

    const value = await getCmiValue(launchId, user.id, name);
    return ok(value);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const body = await request.json();
    const { values } = body as { values: Record<string, string> };
    if (!values) return ok({ error: "values object required" }, 400);

    await setCmiValues(launchId, user.id, values);
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 4: Create launch update route**

`app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/route.ts`:

```typescript
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateScormLaunch } from "@/server/modules/scorm/service";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const body = await request.json() as Record<string, unknown>;

    const result = await updateScormLaunch(launchId, user.id, body);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 5: Commit**

```
git add server/modules/scorm/cmi-service.ts
git add app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/route.ts
git add app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/cmi/route.ts
git add app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/init/route.ts
git commit -m "feat: add SCORM CMI backend endpoints"
```

---

### Task 9: Student SCORM player

**Files:**
- Create: `components/lms/scorm-player.tsx`
- Modify: `components/lms/lesson-player-shell.tsx`

- [ ] **Step 1: Create scorm-player.tsx**

```typescript
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X } from "lucide-react";

interface ScormPlayerProps {
  entryUrl: string;
  lessonId: string;
  title?: string;
}

export function ScormPlayer({ entryUrl, lessonId, title }: ScormPlayerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [completed, setCompleted] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((f) => !f);
  }, []);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
        <iframe
          name="scorm-content"
          src={entryUrl}
          className="w-full h-full border-0"
          allow="fullscreen"
          title={title || "SCORM"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative border rounded-lg overflow-hidden bg-muted">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <iframe
          name="scorm-content"
          src={entryUrl}
          className="w-full h-[600px] border-0"
          allow="fullscreen"
          title={title || "SCORM"}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify lesson-player-shell.tsx**

Add import at top:

```typescript
import { ScormPlayer } from "@/components/lms/scorm-player";
```

Add SCORM case in the blocks switch (~after the "completion" case, ~line 232):

```typescript
case "scorm":
  return (
    <ScormPlayer
      key={block.id}
      entryUrl={`/api/v1/scorm/serve/${block.data.packageId}/index.html`}
      lessonId={lesson.id}
      title="SCORM-пакет"
    />
  );
```

Also add to the `BlockPreview` inline component in the editor (if one exists):

```typescript
case "scorm":
  return <p className="text-sm">SCORM-пакет: {block.data.packageId || "не выбран"}</p>;
```

- [ ] **Step 3: Commit**

```
git add components/lms/scorm-player.tsx components/lms/lesson-player-shell.tsx
git commit -m "feat: add SCORM student player"
```

---

### Task 10: xAPI LRS endpoints

**Files:**
- Create: `server/modules/xapi/auth.ts`
- Create: `server/modules/xapi/lrs.ts`
- Create: `app/api/v1/xapi/statements/route.ts`

- [ ] **Step 1: Create xapi/auth.ts**

```typescript
import { env } from "@/lib/env";

const XAPI_API_KEY = env.XAPI_API_KEY || "";

export function validateXapiKey(request: Request): boolean {
  const key = request.headers.get("X-Experience-API-Key") || request.headers.get("authorization")?.replace("Bearer ", "");
  return key === XAPI_API_KEY;
}
```

- [ ] **Step 2: Add XAPI_API_KEY to env**

Add to `.env`:

```
XAPI_API_KEY=change-me-in-production
```

Add to `lib/env.ts` if it's explicitly typed there.

- [ ] **Step 3: Create xapi/lrs.ts**

```typescript
import { getPrisma } from "@/lib/prisma";

interface XapiStatement {
  id: string;
  actor: { mbox?: string; account?: { name: string }; objectType: string };
  verb: { id: string; display?: Record<string, string> };
  object: { id: string; objectType?: string };
  result?: Record<string, unknown>;
  context?: Record<string, unknown>;
  timestamp?: string;
  stored?: string;
}

function extractUserId(statement: XapiStatement): string | null {
  if (statement.actor?.mbox) {
    const email = statement.actor.mbox.replace("mailto:", "");
    return email; // Will be resolved later if needed
  }
  if (statement.actor?.account?.name) {
    return statement.actor.account.name;
  }
  return null;
}

function extractLessonId(statement: XapiStatement): string | null {
  const objId = statement.object?.id || "";
  // Try to extract lesson/course ID from activity ID
  if (objId.includes("/lessons/")) {
    const match = objId.match(/\/lessons\/([^/]+)/);
    return match?.[1] || null;
  }
  if (objId.includes("/courses/")) {
    const match = objId.match(/\/courses\/([^/]+)/);
    return match?.[1] || null;
  }
  return null;
}

export async function storeStatement(statement: XapiStatement): Promise<void> {
  const prisma = getPrisma();
  const id = statement.id;

  await prisma.xapiStatement.upsert({
    where: { id },
    update: { statement: statement as object },
    create: {
      id,
      statement: statement as object,
      userId: extractUserId(statement),
      lessonId: extractLessonId(statement),
    },
  });
}

export async function storeStatements(statements: XapiStatement[]): Promise<void> {
  for (const st of statements) {
    await storeStatement(st);
  }
}

export async function getStatement(statementId: string) {
  const prisma = getPrisma();
  return prisma.xapiStatement.findUnique({ where: { id: statementId } });
}

export async function searchStatements(params: {
  agent?: string;
  limit?: number;
  since?: string;
  until?: string;
}) {
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  if (params.agent) where.userId = params.agent;

  return prisma.xapiStatement.findMany({
    where,
    orderBy: { stored: "desc" },
    take: Math.min(params.limit || 100, 1000),
  });
}
```

- [ ] **Step 4: Create xapi statements API route**

`app/api/v1/xapi/statements/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { validateXapiKey } from "@/server/modules/xapi/auth";
import { storeStatement, storeStatements, getStatement, searchStatements } from "@/server/modules/xapi/lrs";

export async function POST(request: Request) {
  try {
    // Allow both JWT auth and xAPI key auth
    const isKeyValid = validateXapiKey(request);
    if (!isKeyValid) {
      try {
        await requireUser();
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const statements = Array.isArray(body) ? body : [body];

    for (const st of statements) {
      if (!st.id || !st.actor || !st.verb || !st.object) {
        return ok({ error: "Invalid statement structure" }, 400);
      }
    }

    await storeStatements(statements);
    return NextResponse.json({}, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireUser("reports:read");
    const url = new URL(request.url);
    const statementId = url.searchParams.get("statementId");

    if (statementId) {
      const st = await getStatement(statementId);
      if (!st) return ok(null, 404);
      return ok(st.statement);
    }

    const agent = url.searchParams.get("agent") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 100;

    const results = await searchStatements({ agent, limit });
    return ok(results.map((r) => r.statement));
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 5: Check if XAPI_API_KEY exists in lib/env.ts**

Add to env file validation if needed.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```
git add server/modules/xapi/auth.ts server/modules/xapi/lrs.ts
git add app/api/v1/xapi/statements/route.ts
git commit -m "feat: add xAPI LRS endpoints"
```

---

### Task 11: Verify + E2E

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Commit final verification**

```
git add -A
git commit -m "chore: finalize SCORM/xAPI import implementation"
```

---

### Migration Order

1. `20260522000001_add_scorm_package` — ✅ applied
2. `20260524000001_add_xapi_statements` — applied in Task 1
