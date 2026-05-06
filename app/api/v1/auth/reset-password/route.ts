import { z } from "zod";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { resetPassword } from "@/server/modules/auth/service";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(10).max(128)
});

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, schema);
    return ok(await resetPassword(input.token, input.password));
  } catch (error) {
    return errorResponse(error);
  }
}

