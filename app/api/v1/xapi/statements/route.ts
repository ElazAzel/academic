import { NextResponse } from "next/server";
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { validateXapiKey } from "@/server/modules/xapi/auth";
import { storeStatements, getStatement, searchStatements } from "@/server/modules/xapi/lrs";

export async function POST(request: Request) {
  try {
    const isKeyValid = validateXapiKey(request);
    if (!isKeyValid) {
      try {
        await requireUser();
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const statements = Array.isArray(body) ? body : [body];

    for (const st of statements) {
      if (!st.id || !st.actor || !st.verb || !st.object) {
        return ok({ error: "Invalid statement structure" }, 400);
      }
    }

    await storeStatements(statements);
    return NextResponse.json({}, { status: 204 });
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
