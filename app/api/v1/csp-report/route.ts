import { NextResponse } from "next/server";

/**
 * CSP report-uri endpoint.
 *
 * Браузер отправляет POST с CSP violation report в теле (JSON).
 * Эндпоинт логирует нарушение и возвращает 204.
 *
 * Авторизация не требуется — CSP reports не содержат sensitive данных
 * и приходят от браузера без cookies/credentials.
 *
 * @see https://www.w3.org/TR/CSP3/#reporting
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const report = body?.["csp-report"] ?? body;

    const blocked = report?.["blocked-uri"] ?? "inline";
    const doc = report?.["document-uri"] ?? "?";
    const directive = report?.["violated-directive"] ?? "?";
    const sample = (report?.["script-sample"] ?? "").slice(0, 60);
    const line = report?.["line-number"] ?? "?";
    const col = report?.["column-number"] ?? "?";

    console.log(
      `[CSP] ${doc}:${line}:${col} blocked ${blocked} (${directive})` +
        (sample ? ` sample="${sample}"` : ""),
    );
  } catch {
    // Невалидные report-ы игнорируем
  }

  return new NextResponse(null, { status: 204 });
}
