"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";

const prisma = getPrisma();

const GetGlossaryEntriesSchema = z.object({
  search: z.string().optional(),
});

export async function getGlossaryEntries(search?: string) {
  try {
    const parsed = GetGlossaryEntriesSchema.safeParse({ search });
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Ошибка валидации");
    }

    await requireRole(["curator", "super_curator", "admin"]);
    const where = search
      ? {
          OR: [
            { question: { contains: search, mode: "insensitive" as const } },
            { answer: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    return prisma.glossaryEntry.findMany({ where, orderBy: [{ direction: "asc" }, { category: "asc" }, { updatedAt: "desc" }] });
  } catch (error) {
    console.error("[getGlossaryEntries]", error);
    throw error;
  }
}

export async function getGlossaryCategories() {
  try {
    await requireRole(["curator", "super_curator", "admin"]);
    const entries = await prisma.glossaryEntry.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return entries.map((e) => e.category);
  } catch (error) {
    console.error("[getGlossaryCategories]", error);
    throw error;
  }
}

export async function getGlossaryDirections() {
  try {
    await requireRole(["curator", "super_curator", "admin"]);
    const entries = await prisma.glossaryEntry.findMany({
      select: { direction: true },
      distinct: ["direction"],
      orderBy: { direction: "asc" },
    });
    return entries.map((e) => e.direction);
  } catch (error) {
    console.error("[getGlossaryDirections]", error);
    throw error;
  }
}



export async function createGlossaryEntryAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin", "super_curator"]);
    const question = formData.get("question") as string;
    const answer = formData.get("answer") as string;
    const category = (formData.get("category") as string) || "Общее";
    const direction = (formData.get("direction") as string) || "general";

    if (!question || !answer) throw new ApiError("bad_request", "Вопрос и ответ обязательны", 400);

    await prisma.glossaryEntry.create({ data: { question, answer, category, direction } });

    await logAudit({
      actorId: actor.id,
      action: "glossary.created",
      entity: "glossary_entry",
      metadata: { question, category, direction },
    });

    revalidatePath("/curator/glossary");
    return { success: true };
  } catch (error) {
    console.error("[createGlossaryEntryAction]", error);
    if (error instanceof ApiError) throw error;
    return { success: false, error: "Произошла ошибка при создании записи" };
  }
}

export async function updateGlossaryEntryAction(formData: FormData) {
  try {
    await requireRole(["admin", "super_curator"]);
    const id = formData.get("id") as string;
    const question = formData.get("question") as string;
    const answer = formData.get("answer") as string;
    const category = (formData.get("category") as string) || "Общее";
    const direction = (formData.get("direction") as string) || "general";

    if (!id || !question || !answer) throw new ApiError("bad_request", "Все поля обязательны", 400);

    await prisma.glossaryEntry.update({ where: { id }, data: { question, answer, category, direction } });

    revalidatePath("/curator/glossary");
    return { success: true };
  } catch (error) {
    console.error("[updateGlossaryEntryAction]", error);
    if (error instanceof ApiError) throw error;
    return { success: false, error: "Произошла ошибка при обновлении записи" };
  }
}

const DeleteGlossaryEntryActionSchema = z.object({
  id: z.string().min(1, "ID записи обязателен"),
});

export async function deleteGlossaryEntryAction(id: string) {
  try {
    const parsed = DeleteGlossaryEntryActionSchema.safeParse({ id });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Ошибка валидации" };
    }

    await requireRole(["admin", "super_curator"]);
    await prisma.glossaryEntry.delete({ where: { id } });
    revalidatePath("/curator/glossary");
    return { success: true };
  } catch (error) {
    console.error("[deleteGlossaryEntryAction]", error);
    if (error instanceof ApiError) throw error;
    return { success: false, error: "Произошла ошибка при удалении записи" };
  }
}
