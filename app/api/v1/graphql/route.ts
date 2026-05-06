import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { assertGraphqlEnabled } from "@/server/graphql/resolvers";

export async function POST() {
  try {
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

