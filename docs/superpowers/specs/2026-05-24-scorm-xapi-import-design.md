# SCORM/xAPI Import — Design Spec

## Goals

- Support SCORM 1.2/2004 package import and playback inside the unified lesson player.
- Preserve same-origin serving and authenticated progress capture for SCORM runtime calls.
- Add a minimal xAPI LRS for package-generated learning statements without opening public access.

## Overview

Полный стек импорта и воспроизведения SCORM-пакетов (1.2 + 2004) + минимальный xAPI LRS.

## Models

- `ScormPackage` stores uploaded package metadata, manifest-derived entry points, and storage paths.
- `ScormLaunch` stores per-user launch state, score, completion status, and CMI values.
- `XapiStatement` stores accepted xAPI statements as JSONB with optional user and lesson links.

## Architecture

```
Instructor UI                         Student UI
  │ (ZIP upload)                        │ (iframe + API Bridge)
  ▼                                     ▼
API Routes ───► SCORM Module ───► Supabase Storage
  │                                    ▲
  ▼                                    │
xAPI Module ───► xapi_statements       Proxy Route (same-origin)
                    (JSONB)            serve/{packageId}/*
```

## 1. ZIP Import

### Flow
1. Instructor добавляет SCORM-блок в урок, выбирает ZIP
2. `POST /api/v1/lessons/:lessonId/scorm/import` (multipart)
3. Сервер:
   - Валидирует ZIP (сигнатура PK\x03\x04, размер ≤ 200MB)
   - Распаковывает во временную папку
   - Парсит `imsmanifest.xml` (fast-xml-parser)
   - Определяет версию SCORM (schemaversion 1.2 / CAM 1.3 / 2004.x)
   - Извлекает organizations, resources, entry point
   - Генерирует packageId (cuid)
   - Загружает все файлы в Supabase Storage: `scorm-packages/{packageId}/...`
   - Создаёт `ScormPackage` в БД
   - Удаляет временные файлы
   - Возвращает `{ id, title, version, entryUrl }`
4. UI отображает информацию о пакете

### Error states
| Condition | HTTP | Message |
|---|---|---|
| Нет imsmanifest.xml | 422 | Не является SCORM-пакетом |
| Битый ZIP | 422 | Ошибка распаковки |
| > 200MB | 413 | Превышен лимит |
| Урок уже имеет пакет | 409 | Замените существующий пакет |
| XML невалидный | 422 | Ошибка парсинга manifest |

### New files
- `server/modules/scorm/import.ts` — ZIP upload + extract
- `server/modules/scorm/manifest-parser.ts` — imsmanifest.xml → JS
- `server/modules/scorm/storage.ts` — Supabase Storage helpers
- `app/api/v1/lessons/[lessonId]/scorm/import/route.ts` — API handler

## 2. File Serving Proxy + SCORM API Bridge

### Proxy Route
`GET /api/v1/scorm/serve/:packageId/*path`
- Fetch from `scorm-packages/{packageId}/{path}`
- Set Content-Type from extension
- For HTML files: inject SCORM API Bridge `<script>` before `</head>`
- Cache-Control: public, max-age=3600

### SCORM API Bridge (injected JS)

SCORM 1.2 (window.API):
- `LMSInitialize("")` → POST init → status=IN_PROGRESS
- `LMSFinish("")` → PATCH launch → status=COMPLETED
- `LMSGetValue(name)` → GET cmi?name=X → return cached or fetch
- `LMSSetValue(name, val)` → cache locally, POST cmi on Commit
- `LMSCommit("")` → flush local cache to API
- `LMSGetLastError()` → return last error code
- `LMSGetErrorString(code)` → return error string
- `LMSGetDiagnostic(code)` → return diagnostic

SCORM 2004 (window.API_1484_11):
- `Initialize("")` / `Terminate("")` / `GetValue(name)` / `SetValue(name, val)` / `Commit("")`
- `GetLastError()` / `GetErrorString(code)` / `GetDiagnostic(code)`

### Backend endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/lessons/:lessonId/scorm/launch` | Already exists — create launch |
| `POST .../launch/:launchId/init` | Set status = IN_PROGRESS |
| `GET .../launch/:launchId/cmi?name=X` | Get CMI value |
| `POST .../launch/:launchId/cmi` | Save CMI data (batch) |
| `PATCH .../launch/:launchId` | Update status, score, completion |

### New files
- `server/modules/scorm/proxy.ts` — proxy handler + bridge injection
- `server/modules/scorm/cmi-service.ts` — CMI CRUD on ScormLaunch
- `server/modules/scorm/api-bridge.ts` — JS templates for 1.2 + 2004
- `app/api/v1/scorm/serve/[...path]/route.ts` — catch-all proxy
- `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/route.ts` — PATCH
- `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/cmi/route.ts` — CMI
- `app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/init/route.ts` — init

## 3. xAPI LRS (minimal)

### Data model

```prisma
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

### Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/v1/xapi/statements` | POST | X-Experience-API-Key or JWT | Accept statement(s) |
| `/api/v1/xapi/statements?statementId=` | GET | JWT (admin/instructor) | Get by ID |
| `/api/v1/xapi/statements?limit=&agent=` | GET | JWT | Search |

### Auth
- SCORM-контент: API key в `X-Experience-API-Key` (shared secret, хранится в env)
- Внутренние вызовы: стандартная JWT-сессия

### New files
- `prisma/migrations/20260524000001_add_xapi_statements/`
- `server/modules/xapi/lrs.ts` — validate + store + query statements
- `server/modules/xapi/auth.ts` — API key check middleware
- `app/api/v1/xapi/statements/route.ts` — POST + GET handler

## 4. Instructor UI

### SCORM block type

В `lesson-block-editor.tsx` добавляется тип `scorm`:

- До загрузки: дроп-зона для ZIP
- После загрузки: информация из manifest (название, версия, организации, кол-во файлов)
- Кнопка "Заменить" / "Удалить"

### New/changed files
- `components/lms/lesson-block-editor.tsx` — add scorm type
- `components/lms/scorm-block.tsx` — upload + status component
- `app/api/v1/lessons/[lessonId]/scorm/package/route.ts` — GET status + DELETE

## 5. Student UI

### SCORM Player

`components/lms/scorm-player.tsx`:
- Iframe pointing to proxy route
- Fullscreen toggle
- Close confirmation (if SCORM not finished)
- Progress bar from CMI data
- Score display on completion
- iframe name attribute (required by SCORM)

### Changed files
- `components/lms/lesson-player-shell.tsx` — detect SCORM block → render ScormPlayer

## Implementation Order

1. ZIP import (module + import API + manifest parser + storage)
2. Instructor UI (block type + upload form)
3. Proxy route + API Bridge injection
4. CMI backend endpoints
5. Student player (ScormPlayer component)
6. xAPI LRS (migration + module + endpoints)

## Migration

Ordered list of DDL changes already applied:
- `20260522000001_add_scorm_package` — ✅ done (ScormPackage + ScormLaunch)
- `20260524000001_add_xapi_statements` — ❌ new (XapiStatement table)

## Validation

- Unit tests for manifest parsing, ZIP validation, CMI persistence, and xAPI statement validation.
- Route tests for import, launch init, CMI read/write, package proxy, and xAPI POST/GET authorization.
- Student smoke flow: open SCORM lesson -> initialize launch -> commit CMI -> complete package -> verify lesson progress.
- Release gate: `npm run verify` plus guarded e2e coverage when seeded local data is available.
