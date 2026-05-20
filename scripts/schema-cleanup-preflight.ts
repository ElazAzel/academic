import { getPrisma } from "../lib/prisma";

type ColumnInfo = {
  table_name: string;
  column_name: string;
  udt_name: string;
  data_type: string;
  column_default: string | null;
};

type EnumInfo = {
  enum_name: string;
  labels: string[];
};

type MigrationTableInfo = {
  table_name: string | null;
};

type MigrationInfo = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

type StatusDistribution = {
  table_name: string;
  status: string;
  count: number;
};

const prisma = getPrisma();

async function main() {
  const [columns, enums, migrationTable, userStatuses, questionStatuses] = await Promise.all([
    prisma.$queryRawUnsafe<ColumnInfo[]>(`
      SELECT table_name, column_name, udt_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'users' AND column_name = 'status')
          OR (table_name = 'lesson_questions' AND column_name = 'status')
        )
      ORDER BY table_name, column_name
    `),
    prisma.$queryRawUnsafe<EnumInfo[]>(`
      SELECT t.typname::text AS enum_name, array_agg(e.enumlabel::text ORDER BY e.enumsortorder)::text[] AS labels
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('UserAccountStatus', 'QuestionStatus')
      GROUP BY t.typname
      ORDER BY t.typname
    `),
    prisma.$queryRawUnsafe<MigrationTableInfo[]>(`
      SELECT to_regclass('public._prisma_migrations')::text AS table_name
    `),
    prisma.$queryRawUnsafe<StatusDistribution[]>(`
      SELECT 'users'::text AS table_name, lower(trim(status::text))::text AS status, count(*)::int AS count
      FROM users
      GROUP BY lower(trim(status::text))
      ORDER BY status
    `),
    prisma.$queryRawUnsafe<StatusDistribution[]>(`
      SELECT 'lesson_questions'::text AS table_name, lower(trim(status::text))::text AS status, count(*)::int AS count
      FROM lesson_questions
      GROUP BY lower(trim(status::text))
      ORDER BY status
    `),
  ]);

  const hasMigrationTable = Boolean(migrationTable[0]?.table_name);
  const migrations = hasMigrationTable
    ? await prisma.$queryRawUnsafe<MigrationInfo[]>(`
        SELECT migration_name, finished_at, rolled_back_at
        FROM _prisma_migrations
        ORDER BY started_at
      `)
    : [];

  console.log(
    JSON.stringify(
      {
        columns,
        enums,
        migrationTable: migrationTable[0]?.table_name ?? null,
        migrations,
        statusDistribution: [...userStatuses, ...questionStatuses],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
