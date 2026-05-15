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

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const connectionString =
      process.env.storage_POSTGRES_PRISMA_URL ??
      process.env.DATABASE_URL ??
      (process.env.NODE_ENV === "production"
        ? undefined
        : "postgresql://academy:academy-local-only@localhost:5432/academy?schema=public");

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Set DATABASE_URL or storage_POSTGRES_PRISMA_URL in your environment."
      );
    }

    const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    // Vercel serverless: each runtime instance handles one request → max 1 connection.
    // Traditional server: small pool to handle concurrent requests within one instance.
    const pool = new Pool({
      connectionString: normalizePostgresConnectionString(connectionString),
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: isServerless ? 1 : 10,
      idleTimeoutMillis: isServerless ? 0 : 30000,
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
