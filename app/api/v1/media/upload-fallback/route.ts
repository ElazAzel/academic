import { requireUser } from "@/lib/auth/session";
import { uploadFileToSupabase } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    // 1. Authenticate user
    await requireUser();

    // 2. Parse search parameters
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const contentType = searchParams.get("contentType") || "application/octet-stream";

    if (!key) {
      return NextResponse.json({ error: "Не указан ключ файла (key)" }, { status: 400 });
    }

    // 3. Read request body as Buffer
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Файл пуст" }, { status: 400 });
    }

    // 4. Upload directly to Supabase Storage (cloud service)
    const publicUrl = await uploadFileToSupabase(key, buffer, contentType);

    if (!publicUrl) {
      return NextResponse.json({ error: "Ошибка при сохранении файла в облаке" }, { status: 503 });
    }

    return NextResponse.json({ success: true, publicUrl });
  } catch (error: any) {
    console.error("[Upload Fallback Error]:", error);
    return NextResponse.json({ error: error.message || "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
