import { z } from "zod";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requestPasswordReset } from "@/server/modules/auth/service";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, schema);
    return ok(await requestPasswordReset(input.email));
  } catch (error) {
    return errorResponse(error);
  }
}

