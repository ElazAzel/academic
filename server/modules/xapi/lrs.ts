import { getPrisma } from "@/lib/prisma";

interface XapiStatement {
  id: string;
  actor: { mbox?: string; account?: { name: string }; objectType: string };
  verb: { id: string; display?: Record<string, string> };
  object: { id: string; objectType?: string };
  result?: Record<string, unknown>;
  context?: Record<string, unknown>;
  timestamp?: string;
  stored?: string;
}

function extractUserId(statement: XapiStatement): string | null {
  if (statement.actor?.mbox) {
    const email = statement.actor.mbox.replace("mailto:", "");
    return email;
  }
  if (statement.actor?.account?.name) {
    return statement.actor.account.name;
  }
  return null;
}

function extractLessonId(statement: XapiStatement): string | null {
  const objId = statement.object?.id || "";
  if (objId.includes("/lessons/")) {
    const match = objId.match(/\/lessons\/([^/]+)/);
    return match?.[1] || null;
  }
  if (objId.includes("/courses/")) {
    const match = objId.match(/\/courses\/([^/]+)/);
    return match?.[1] || null;
  }
  return null;
}

export async function storeStatement(statement: XapiStatement): Promise<void> {
  const prisma = getPrisma();
  const id = statement.id;

  await prisma.xapiStatement.upsert({
    where: { id },
    update: { statement: statement as object },
    create: {
      id,
      statement: statement as object,
      userId: extractUserId(statement),
      lessonId: extractLessonId(statement),
    },
  });
}

export async function storeStatements(statements: XapiStatement[]): Promise<void> {
  for (const st of statements) {
    await storeStatement(st);
  }
}

export async function getStatement(statementId: string) {
  const prisma = getPrisma();
  return prisma.xapiStatement.findUnique({ where: { id: statementId } });
}

export async function searchStatements(params: {
  agent?: string;
  limit?: number;
}) {
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  if (params.agent) where.userId = params.agent;

  return prisma.xapiStatement.findMany({
    where,
    orderBy: { stored: "desc" },
    take: Math.min(params.limit || 100, 1000),
  });
}
