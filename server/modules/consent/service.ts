import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export const CONSENT_TYPES = ["privacy_policy", "terms_of_use", "cookie_notice"] as const;
export const CONSENT_VERSION = "1.0";

export async function hasUserConsented(userId: string): Promise<boolean> {
  const accepted = await prisma.consentLog.findMany({
    where: {
      userId,
      type: { in: CONSENT_TYPES as unknown as string[] },
      status: "ACCEPTED",
    },
    select: { type: true },
  });

  const acceptedTypes = new Set(accepted.map((c) => c.type));
  return CONSENT_TYPES.every((t) => acceptedTypes.has(t));
}

export async function acceptConsent(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const now = new Date();
  const records = CONSENT_TYPES.map((type) => ({
    userId,
    type,
    status: "ACCEPTED" as const,
    version: CONSENT_VERSION,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    acceptedAt: now,
  }));

  await prisma.consentLog.createMany({ data: records });
  return { success: true };
}
