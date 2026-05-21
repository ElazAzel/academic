import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export const CONSENT_TYPES = ["privacy_policy", "terms_of_use", "cookie_notice"] as const;

export const CONSENT_VERSIONS: Record<string, string> = {
  privacy_policy: "2026-05-01",
  terms_of_use: "2026-05-01",
  cookie_notice: "2026-05-01",
};

export async function hasUserConsented(userId: string): Promise<boolean> {
  const accepted = await prisma.consentLog.findMany({
    where: {
      userId,
      type: { in: CONSENT_TYPES as unknown as string[] },
      status: "ACCEPTED",
    },
    select: { type: true, version: true },
    orderBy: { createdAt: "desc" },
  });

  // Check that every required type has been accepted at the current version
  const latestByType = new Map<string, string>();
  for (const c of accepted) {
    if (!latestByType.has(c.type)) {
      latestByType.set(c.type, c.version);
    }
  }

  return CONSENT_TYPES.every(
    (t) => latestByType.has(t) && latestByType.get(t) === CONSENT_VERSIONS[t],
  );
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
    version: CONSENT_VERSIONS[type],
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    acceptedAt: now,
  }));

  await prisma.consentLog.createMany({ data: records });
  return { success: true };
}
