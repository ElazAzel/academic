import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "gone"
  | "validation_error"
  | "service_unavailable"
  | "internal_error";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function empty(status = 204) {
  return new NextResponse(null, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Некорректные данные запроса",
          details: error.flatten()
        }
      },
      { status: 422 }
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Внутренняя ошибка сервера" } },
    { status: 500 }
  );
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError("bad_request", "Тело запроса должно быть JSON", 400);
  }
  return schema.parse(payload);
}

export function getSearchParam(request: Request, key: string, fallback = "") {
  return new URL(request.url).searchParams.get(key) ?? fallback;
}
