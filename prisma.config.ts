import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  // @ts-expect-error db is valid in Prisma 7
  db: {
    url: process.env.storage_POSTGRES_PRISMA_URL,
    directUrl: process.env.storage_POSTGRES_URL_NON_POOLING,
  },
})
