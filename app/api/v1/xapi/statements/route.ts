import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { validateXapiKey } from "@/server/modules/xapi/auth";
import { storeStatements, getStatement, searchStatements } from "@/server/modules/xapi/lrs";

const xapiStatementSchema = z.object({
  id: z.string().trim().min(1, "ID xAPI-записи обязателен"),
  actor: z.object({
    objectType: z.string().trim().min(1, "Тип actor обязателен"),
    mbox: z.string().optional(),
    account: z.object({ name: z.string().trim().min(1) }).optional(),
  }).passthrough(),
  verb: z.object({
    id: z.string().trim().min(1, "ID verb обязателен"),
    display: z.record(z.string()).optional(),
  }).passthrough(),
  object: z.object({
    id: z.string().trim().min(1, "ID object обязателен"),
    objectType: z.string().optional(),
  }).passthrough(),
  result: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
  stored: z.string().optional(),
}).passthrough();

const xapiStatementsPayloadSchema = z.union([
  xapiStatementSchema,
  z.array(xapiStatementSchema).min(1, "Список xAPI-записей не может быть пустым"),
]);

export async function POST(request: Request) {
  try {
    const isKeyValid = validateXapiKey(request);
    if (!isKeyValid) {
      try {
        await requireUser();
      } catch {
        throw new ApiError("unauthorized", "Требуется вход или X-Experience-API-Key", 401);
      }
    }

    const body = await parseJson(request, xapiStatementsPayloadSchema);
    const statements = Array.isArray(body) ? body : [body];

    await storeStatements(statements);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireUser("reports:read");
    const url = new URL(request.url);
    const statementId = url.searchParams.get("statementId");

    if (statementId) {
      const st = await getStatement(statementId);
      if (!st) return ok(null, 404);
      return ok(st.statement);
    }

    const agent = url.searchParams.get("agent") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 100;

    const results = await searchStatements({ agent, limit });
    return ok(results.map((r) => r.statement));
  } catch (error) {
    return errorResponse(error);
  }
}
