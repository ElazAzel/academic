import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Next.js and production hosts usually load environment variables before app code runs.
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function normalizePostgresConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    // `pg` lets sslmode from the URL override the explicit ssl object below.
    // Supabase certificates can otherwise fail on Vercel with a self-signed-chain error.
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

function isUsingSupabasePooler(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    // Supabase Supavisor pooler uses port 6543
    if (url.port === "6543") return true;
    // Or explicit pgbouncer param
    if (url.searchParams.get("pgbouncer") === "true") return true;
  } catch {
    // ignore
  }
  return false;
}

function ensurePgbouncerParam(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.port === "6543" && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const rawConnectionString =
      process.env.storage_POSTGRES_PRISMA_URL ??
      process.env.DATABASE_URL ??
      (process.env.NODE_ENV === "production"
        ? undefined
        : "postgresql://academy:academy-local-only@localhost:5432/academy?schema=public");

    if (!rawConnectionString) {
      throw new Error(
        "DATABASE_URL is not set. Set DATABASE_URL or storage_POSTGRES_PRISMA_URL in your environment."
      );
    }

    const isLocal = rawConnectionString.includes("localhost") || rawConnectionString.includes("127.0.0.1");
    const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const usingPooler = isUsingSupabasePooler(rawConnectionString);

    // With Supabase pooler (Supavisor), we can handle many more concurrent connections.
    // Without pooler (direct Postgres), limit aggressively.
    let maxConnections: number;
    if (usingPooler) {
      maxConnections = 20; // Supavisor handles multiplexing
    } else if (isLocal) {
      maxConnections = 10;
    } else if (isServerless) {
      maxConnections = 1; // Vercel serverless = 1 request per instance
    } else {
      maxConnections = 10;
    }

    const connectionString = usingPooler
      ? normalizePostgresConnectionString(ensurePgbouncerParam(rawConnectionString))
      : normalizePostgresConnectionString(rawConnectionString);

    const pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: maxConnections,
      idleTimeoutMillis: usingPooler ? 30000 : isServerless ? 0 : 30000,
      connectionTimeoutMillis: isServerless ? 10000 : 5000,
    });

    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrisma();
