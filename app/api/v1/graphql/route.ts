import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { assertGraphqlEnabled } from "@/server/graphql/resolvers";

export async function POST() {
  try {
    await requireUser(); // Require authentication even for scaffolded endpoint
    assertGraphqlEnabled();
    return NextResponse.json({
      error: {
        code: "not_implemented",
        message: "GraphQL runtime is scaffolded. Use REST endpoints for MVP."
      }
    }, { status: 501 });
  } catch (error) {
    return errorResponse(error);
  }
}

