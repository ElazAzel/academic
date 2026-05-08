import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  // @ts-expect-error db is valid in Prisma 7
  db: {
    url:
      process.env.DATABASE_URL ??
      process.env.storage_POSTGRES_PRISMA_URL ??
      "postgresql://academy:academy-local-only@postgres:5432/academy?schema=public",
    directUrl:
      process.env.storage_POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      "postgresql://academy:academy-local-only@postgres:5432/academy?schema=public",
  },
})
