import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@prisma/config";

const envPath = resolve(process.cwd(), ".env");
const explicitDatabaseEnv = {
  databaseUrl: process.env.DATABASE_URL,
  migrationDatabaseUrl: process.env.PRISMA_MIGRATION_DATABASE_URL,
  storagePrismaUrl: process.env.storage_POSTGRES_PRISMA_URL,
  storageNonPoolingUrl: process.env.storage_POSTGRES_URL_NON_POOLING,
};

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0);
}

function toDirectUrl(poolerUrl: string): string {
  try {
    const url = new URL(poolerUrl);
    url.port = "5432";
    url.searchParams.delete("pgbouncer");
    return url.toString();
  } catch {
    return poolerUrl;
  }
}

const poolerUrl = firstNonEmpty(
  explicitDatabaseEnv.databaseUrl,
  explicitDatabaseEnv.storagePrismaUrl,
  process.env.DATABASE_URL,
  process.env.storage_POSTGRES_PRISMA_URL,
);

const migrationDatabaseUrl =
  firstNonEmpty(
    explicitDatabaseEnv.migrationDatabaseUrl,
    explicitDatabaseEnv.databaseUrl ? toDirectUrl(explicitDatabaseEnv.databaseUrl) : undefined,
    explicitDatabaseEnv.storageNonPoolingUrl,
    explicitDatabaseEnv.storagePrismaUrl ? toDirectUrl(explicitDatabaseEnv.storagePrismaUrl) : undefined,
    process.env.PRISMA_MIGRATION_DATABASE_URL,
    process.env.storage_POSTGRES_URL_NON_POOLING,
    poolerUrl ? toDirectUrl(poolerUrl) : undefined,
  ) ?? "postgresql://academy:academy-local-only@postgres:5432/academy?schema=public";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: migrationDatabaseUrl,
  },
});
