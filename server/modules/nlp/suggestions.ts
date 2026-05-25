import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export interface Suggestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  direction: string;
  rank: number;
}

/**
 * Finds glossary entries relevant to the given question text using
 * PostgreSQL full-text search (simple dictionary for Russian text).
 * Falls back to ILIKE search if full-text returns no results.
 */
export async function getAnswerSuggestions(questionText: string): Promise<Suggestion[]> {
  const normalized = questionText.trim();
  if (!normalized || normalized.length < 3) return [];

  // Try full-text search first
  const ftsResults = await prisma.$queryRaw<Suggestion[]>(Prisma.sql`
    SELECT
      id, question, answer, category, direction,
      ts_rank(
        to_tsvector('simple', question || ' ' || answer),
        plainto_tsquery('simple', ${normalized})
      )::int AS rank
    FROM glossary_entries
    WHERE to_tsvector('simple', question || ' ' || answer)
      @@ plainto_tsquery('simple', ${normalized})
    ORDER BY rank DESC
    LIMIT 3
  `);

  if (ftsResults.length > 0) return ftsResults;

  // Fallback: ILIKE search on question field
  const likeResults = await prisma.glossaryEntry.findMany({
    where: {
      OR: [
        { question: { contains: normalized, mode: "insensitive" } },
        { answer: { contains: normalized, mode: "insensitive" } },
      ],
    },
    orderBy: [{ direction: "asc" }, { category: "asc" }, { updatedAt: "desc" }],
    take: 3,
  });

  return likeResults.map((entry, i) => ({
    id: entry.id,
    question: entry.question,
    answer: entry.answer,
    category: entry.category,
    direction: entry.direction,
    rank: 3 - i, // artificial rank for fallback results
  }));
}
