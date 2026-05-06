import { created, errorResponse, parseJson } from "@/lib/http";
import { registerSchema } from "@/lib/validation";
import { registerUser } from "@/server/modules/auth/service";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, registerSchema);
    return created(await registerUser(input));
  } catch (error) {
    return errorResponse(error);
  }
}

