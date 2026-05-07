import { z } from "zod";

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
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120)
});

export const env = envSchema.parse(process.env);
