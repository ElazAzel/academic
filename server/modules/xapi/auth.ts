import { env } from "@/lib/env";

const XAPI_API_KEY = env.XAPI_API_KEY || "";

export function validateXapiKey(request: Request): boolean {
  const key = request.headers.get("X-Experience-API-Key") || request.headers.get("authorization")?.replace("Bearer ", "");
  return key === XAPI_API_KEY;
}
