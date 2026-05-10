import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@prisma/config";

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0);
}

const migrationDatabaseUrl =
  firstNonEmpty(
    process.env.PRISMA_MIGRATION_DATABASE_URL,
    process.env.storage_POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.storage_POSTGRES_PRISMA_URL
  ) ?? "postgresql://academy:academy-local-only@postgres:5432/academy?schema=public";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: migrationDatabaseUrl,
  },
});
