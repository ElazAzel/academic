"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";

const prisma = getPrisma();

export async function getGlossaryEntries(search?: string) {
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
}

export async function getGlossaryCategories() {
  await requireRole(["curator", "super_curator", "admin"]);
  const entries = await prisma.glossaryEntry.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return entries.map((e) => e.category);
}

export async function getGlossaryDirections() {
  await requireRole(["curator", "super_curator", "admin"]);
  const entries = await prisma.glossaryEntry.findMany({
    select: { direction: true },
    distinct: ["direction"],
    orderBy: { direction: "asc" },
  });
  return entries.map((e) => e.direction);
}



export async function createGlossaryEntryAction(formData: FormData) {
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
}

export async function updateGlossaryEntryAction(formData: FormData) {
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
}

export async function deleteGlossaryEntryAction(id: string) {
  await requireRole(["admin", "super_curator"]);
  await prisma.glossaryEntry.delete({ where: { id } });
  revalidatePath("/curator/glossary");
  return { success: true };
}
