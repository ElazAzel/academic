import { z } from "zod";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { verifyEmail } from "@/server/modules/auth/service";

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, schema);
    return ok(await verifyEmail(input.token));
  } catch (error) {
    return errorResponse(error);
  }
}

