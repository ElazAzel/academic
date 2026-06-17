---
title: "Feature Name"
date: YYYY-MM-DD
status: draft
---

# Feature Name

## Goals
- [ ] Goal 1
- [ ] Goal 2

## Models
### `ModelName`
| Field | Type | Description |
|-------|------|-------------|
| id | String | PK |

## Architecture
### Layers
- **Service**: `server/modules/feature/service.ts`
- **Controller**: `server/actions/feature.ts`
- **API**: `app/api/v1/feature/route.ts`

### Data Flow
1. User triggers action...
2. Server action validates via Zod...

## Validation (Spec-Kit Verifiable)
- **Rule**: "Input must be validated using Zod."
  - **Test**: `grep -l "zod" server/actions/feature.ts`
- **Rule**: "No Prisma in UI."
  - **Test**: `npm run verify` (architecture scan)
