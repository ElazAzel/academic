import { z } from "zod";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Next.js and production hosts usually load environment variables before app code runs.
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(16).default("development-secret-change-me"),
  DATABASE_URL: z.string().min(1).default("postgresql://academy:academy-local-only@postgres:5432/academy?schema=public"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  CERTIFICATE_COMPLETION_THRESHOLD: z.coerce.number().int().min(1).max(100).default(85),
  FEATURE_GRAPHQL: z.coerce.boolean().default(false),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  REDIS_URL: z.string().optional(),

  // SMTP / transactional email
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("noreply@academy.local"),

  // S3-compatible storage
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("local"),
  S3_BUCKET: z.string().default("academy-media"),
  S3_ACCESS_KEY: z.string().default("minio"),
  S3_SECRET_KEY: z.string().default("minio123"),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  // Feature flags
  FEATURE_EMAIL_NOTIFICATIONS: z.coerce.boolean().default(false),
  FEATURE_PUSH_NOTIFICATIONS: z.coerce.boolean().default(false),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);

process.env.APP_URL ??= env.APP_URL;
process.env.NEXTAUTH_URL ??= env.NEXTAUTH_URL;
process.env.NEXTAUTH_SECRET ??= env.NEXTAUTH_SECRET;
