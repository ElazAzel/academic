import { describe, expect, it } from "vitest";
import {
  assertLocalDatabaseMutation,
  getMutationDatabaseUrl,
} from "../../scripts/assert-local-database";

describe("local database mutation guard", () => {
  it("allows docker-compose and loopback database targets", () => {
    expect(() =>
      assertLocalDatabaseMutation("db:push", {
        DATABASE_URL: "postgresql://academy:local@postgres:5432/academy",
      })
    ).not.toThrow();

    expect(() =>
      assertLocalDatabaseMutation("db:seed", {
        DATABASE_URL: "postgresql://academy:local@127.0.0.1:5432/academy",
      })
    ).not.toThrow();
  });

  it("refuses remote seed targets without the explicit override", () => {
    expect(() =>
      assertLocalDatabaseMutation("db:seed", {
        DATABASE_URL: "postgresql://academy:secret@db.example.com:5432/academy",
      })
    ).toThrow(/non-local database host "db\.example\.com"/);
  });

  it("refuses e2e runs against remote databases because the suite mutates seeded data", () => {
    expect(() =>
      assertLocalDatabaseMutation("test:e2e", {
        DATABASE_URL: "postgresql://academy:secret@db.example.com:5432/academy",
      })
    ).toThrow(/Refusing test:e2e/);
  });

  it("uses the migration URL for db:push and accepts an explicit remote override", () => {
    expect(
      getMutationDatabaseUrl("db:push", {
        DATABASE_URL: "postgresql://academy:local@localhost:5432/academy",
        PRISMA_MIGRATION_DATABASE_URL: "postgresql://academy:remote@migration.example.com:5432/academy",
      })
    ).toContain("migration.example.com");

    expect(
      assertLocalDatabaseMutation("db:push", {
        PRISMA_MIGRATION_DATABASE_URL: "postgresql://academy:remote@migration.example.com:5432/academy",
        ALLOW_REMOTE_DATABASE_MUTATION: "true",
      }).overridden
    ).toBe(true);
  });
});
