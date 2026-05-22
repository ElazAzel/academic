import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("schema cleanup window", () => {
  it("keeps user and lesson question statuses enum-backed in Prisma schema", () => {
    const schema = readProjectFile("prisma/schema.prisma");

    expect(schema).toMatch(/enum UserAccountStatus\s*\{[\s\S]*ACTIVE[\s\S]*INACTIVE[\s\S]*BLOCKED[\s\S]*DELETED[\s\S]*\}/);
    expect(schema).toMatch(/enum QuestionStatus\s*\{[\s\S]*OPEN[\s\S]*ANSWERED[\s\S]*FORWARDED[\s\S]*CLOSED[\s\S]*\}/);
    expect(schema).toMatch(/status\s+UserAccountStatus\s+@default\(ACTIVE\)/);
    expect(schema).toMatch(/status\s+QuestionStatus\s+@default\(OPEN\)/);
  });

  it("normalizes legacy string statuses while migrating to PostgreSQL enums", () => {
    const migration = readProjectFile("prisma/migrations/20260514000000_migrate_status_enums/migration.sql");

    expect(migration).toContain('CREATE TYPE "UserAccountStatus" AS ENUM');
    expect(migration).toContain('ALTER TABLE users ALTER COLUMN status TYPE "UserAccountStatus"');
    expect(migration).toContain("WHEN lower(trim(status)) = 'active' THEN 'ACTIVE'::\"UserAccountStatus\"");
    expect(migration).toContain("WHEN lower(trim(status)) = 'deleted' THEN 'DELETED'::\"UserAccountStatus\"");

    expect(migration).toContain('CREATE TYPE "QuestionStatus" AS ENUM');
    expect(migration).toContain('ALTER TABLE lesson_questions ALTER COLUMN status TYPE "QuestionStatus"');
    expect(migration).toContain("WHEN lower(trim(status)) = 'open' THEN 'OPEN'::\"QuestionStatus\"");
    expect(migration).toContain("WHEN lower(trim(status)) = 'forwarded' THEN 'FORWARDED'::\"QuestionStatus\"");
  });

  it("documents a backup-first downtime path and migration-history reconciliation", () => {
    const runbook = readProjectFile("docs/archive/schema-cleanup-window.md");

    expect(runbook).toContain("Create a verified database backup");
    expect(runbook).toContain("npx prisma migrate status");
    expect(runbook).toContain("npx tsx scripts/schema-cleanup-preflight.ts");
    expect(runbook).toContain("do not run `migrate deploy`");
    expect(runbook).toContain("npx prisma migrate resolve --applied 20260514000000_migrate_status_enums");
    expect(runbook).toContain("Primary rollback is restore from the verified backup");
  });

  it("preflight script is read-only and casts raw metadata to supported scalar types", () => {
    const script = readProjectFile("scripts/schema-cleanup-preflight.ts");

    expect(script).not.toMatch(/\b(update|insert|delete|alter|create|drop)\b/i);
    expect(script).toContain("to_regclass('public._prisma_migrations')::text");
    expect(script).toContain("array_agg(e.enumlabel::text");
    expect(script).toContain("count(*)::int");
  });
});
