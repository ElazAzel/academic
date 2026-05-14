"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function getGlossaryEntries() {
  await requireRole(["curator", "super_curator", "admin"]);
  return prisma.glossaryEntry.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function createGlossaryEntryAction(formData: FormData) {
  const actor = await requireRole(["admin", "super_curator"]);
  const question = formData.get("question") as string;
  const answer = formData.get("answer") as string;

  if (!question || !answer) throw new Error("Вопрос и ответ обязательны");

  await prisma.glossaryEntry.create({ data: { question, answer } });

  await logAudit({
    actorId: actor.id,
    action: "glossary.created",
    entity: "glossary_entry",
    metadata: { question },
  });

  revalidatePath("/curator/glossary");
  return { success: true };
}

export async function updateGlossaryEntryAction(formData: FormData) {
  await requireRole(["admin", "super_curator"]);
  const id = formData.get("id") as string;
  const question = formData.get("question") as string;
  const answer = formData.get("answer") as string;

  if (!id || !question || !answer) throw new Error("Все поля обязательны");

  await prisma.glossaryEntry.update({ where: { id }, data: { question, answer } });

  revalidatePath("/curator/glossary");
  return { success: true };
}

export async function deleteGlossaryEntryAction(id: string) {
  await requireRole(["admin", "super_curator"]);
  await prisma.glossaryEntry.delete({ where: { id } });
  revalidatePath("/curator/glossary");
  return { success: true };
}
