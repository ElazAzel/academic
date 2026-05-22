import { existsSync } from "node:fs";

type Env = Record<string, string | undefined>;

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);
const REMOTE_OVERRIDE = "ALLOW_REMOTE_DATABASE_MUTATION";

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0);
}

function loadRepoEnv() {
  const databaseEnvAlreadyProvided = firstNonEmpty(
    process.env.PRISMA_MIGRATION_DATABASE_URL,
    process.env.storage_POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL
  );
  if (
    databaseEnvAlreadyProvided ||
    !existsSync(".env") ||
    typeof process.loadEnvFile !== "function"
  ) {
    return;
  }

  try {
    process.loadEnvFile(".env");
  } catch {
    // Shell and deployment environments may provide variables without a local .env file.
  }
}

export function getMutationDatabaseUrl(operation: string, env: Env) {
  const runtimeUrl = firstNonEmpty(env.storage_POSTGRES_PRISMA_URL, env.DATABASE_URL);

  if (operation === "db:push") {
    return (
      firstNonEmpty(env.PRISMA_MIGRATION_DATABASE_URL, runtimeUrl) ??
      "postgresql://academy:academy-local-only@postgres:5432/academy?schema=public"
    );
  }

  return (
    runtimeUrl ??
    "postgresql://academy:academy-local-only@localhost:5432/academy?schema=public"
  );
}

export function assertLocalDatabaseMutation(operation: string, env: Env = process.env) {
  const databaseUrl = getMutationDatabaseUrl(operation, env);

  if (env[REMOTE_OVERRIDE] === "true") {
    return { databaseUrl, overridden: true };
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(
      `[db-guard] Refusing ${operation}: selected database URL is not a valid URL.`
    );
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(
      `[db-guard] Refusing ${operation}: selected database URL must use postgres or postgresql.`
    );
  }

  if (!LOCAL_DATABASE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `[db-guard] Refusing ${operation} for non-local database host "${url.hostname}". Set ${REMOTE_OVERRIDE}=true only for an intentional remote mutation.`
    );
  }

  return { databaseUrl, overridden: false };
}

function main() {
  loadRepoEnv();

  const operation = process.argv[2] ?? "database mutation";
  try {
    const result = assertLocalDatabaseMutation(operation);
    const host = new URL(result.databaseUrl).hostname;
    const mode = result.overridden ? "remote override accepted" : "local target accepted";
    console.log(`[db-guard] ${mode} for ${operation}: ${host}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("assert-local-database.ts")) {
  main();
}
