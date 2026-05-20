import { NextResponse } from "next/server";
import { getAppSetting } from "@/server/modules/admin/settings";

/**
 * Возвращает текущую версию сборки.
 * Используется Service Worker для инвалидации кэша при обновлениях.
 */
export async function GET() {
  const version = await getAppSetting<number>("BUILD_VERSION", 1);
  return NextResponse.json({ version, buildId: process.env.NEXT_BUILD_ID ?? null });
}
