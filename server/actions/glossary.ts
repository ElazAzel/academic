"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError, getSafeErrorMetadata } from "@/lib/http";

const prisma = getPrisma();

function throwGlossaryReadActionError(error: unknown, label: string, message: string): never {
  if (error instanceof ApiError) throw error;
  console.error(label, getSafeErrorMetadata(error));
  throw new ApiError("internal_error", message, 500);
}

function toGlossaryMutationResult(error: unknown, label: string, fallback: string) {
  if (error instanceof ApiError) throw error;
  console.error(label, getSafeErrorMetadata(error));
  return { success: false, error: fallback };
}

const GetGlossaryEntriesSchema = z.object({
  search: z.string().optional(),
});

export async function getGlossaryEntries(search?: string) {
  try {
    const parsed = GetGlossaryEntriesSchema.safeParse({ search });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
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
    const entries = await prisma.glossaryEntry.findMany({ where, orderBy: [{ direction: "asc" }, { category: "asc" }, { updatedAt: "desc" }] });
    return entries;
  } catch (error) {
    throwGlossaryReadActionError(error, "[getGlossaryEntries]", "Не удалось загрузить глоссарий");
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
    throwGlossaryReadActionError(error, "[getGlossaryCategories]", "Не удалось загрузить категории глоссария");
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
    throwGlossaryReadActionError(error, "[getGlossaryDirections]", "Не удалось загрузить направления глоссария");
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
    return toGlossaryMutationResult(error, "[createGlossaryEntryAction]", "Произошла ошибка при создании записи");
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
    return toGlossaryMutationResult(error, "[updateGlossaryEntryAction]", "Произошла ошибка при обновлении записи");
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
    return toGlossaryMutationResult(error, "[deleteGlossaryEntryAction]", "Произошла ошибка при удалении записи");
  }
}
