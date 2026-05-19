import { z } from "zod";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Next.js and production hosts usually load environment variables before app code runs.
  }
}

const KNOWN_DEV_SECRET = "development-secret-change-me";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(16).default(KNOWN_DEV_SECRET),
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

  // Vercel KV / Upstash Redis (for caching & rate limiting)
  KV_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),

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

  // VAPID keys for Web Push notifications
  // Generate with: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  // Firebase (legacy, kept for backwards compatibility)
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),

  // Supabase (Realtime)
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),

  // Cron / Scheduled Jobs
  CRON_SECRET: z.string().min(16).optional(),
});

export const env = envSchema.parse(process.env);

// C1: В production отклоняем дефолтный dev-секрет — он известен публично.
if (env.NODE_ENV === "production" && env.NEXTAUTH_SECRET === KNOWN_DEV_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET не переопределён. " +
    "В production требуется установить сильный уникальный секрет (минимум 32 символа). " +
    "Значение по умолчанию известно публично и не может быть использовано."
  );
}

// C4: В production CRON_SECRET обязателен
if (env.NODE_ENV === "production" && !env.CRON_SECRET) {
  throw new Error(
    "CRON_SECRET обязателен в production. " +
    "Установите сильный уникальный секрет для защиты cron-эндпоинтов."
  );
}

process.env.APP_URL ??= env.APP_URL;
process.env.NEXTAUTH_URL ??= env.NEXTAUTH_URL;
process.env.NEXTAUTH_SECRET ??= env.NEXTAUTH_SECRET;
