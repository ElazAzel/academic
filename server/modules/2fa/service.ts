import { generateSecret, generateURI, verifySync } from "otplib";
import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

const ISSUER = "AI Strategic Academy";

/**
 * Generate a new TOTP secret for a user.
 * Returns the secret (base32) and an otpauth URL for QR code generation.
 */
export function generateTotpSecret(userEmail: string): {
  secret: string;
  otpauthUrl: string;
} {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: ISSUER,
    label: userEmail,
    secret,
  });
  return { secret, otpauthUrl };
}

/**
 * Verify a TOTP token against a secret.
 * Uses 60s tolerance (2 steps of 30s) to allow clock drift.
 */
export function verifyTotp(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret, epochTolerance: 60 });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate 8 backup codes (8 chars each), return plain + hashed.
 */
export function generateBackupCodes(): {
  plain: string[];
  hashed: string[];
} {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    codes.push(randomBytes(6).toString("hex").slice(0, 8).toUpperCase());
  }
  const hashed = codes.map((c) => hashBackupCode(c));
  return { plain: codes, hashed };
}

function hashBackupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Verify a backup code. Returns true and removes the used code.
 */
export async function verifyAndConsumeBackupCode(
  userId: string,
  code: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { backupCodes: true },
  });
  if (!user?.backupCodes) return false;

  const hashedInput = hashBackupCode(code.toUpperCase());
  const codes: string[] = JSON.parse(user.backupCodes);

  const idx = codes.indexOf(hashedInput);
  if (idx === -1) return false;

  codes.splice(idx, 1);
  await prisma.user.update({
    where: { id: userId },
    data: { backupCodes: codes.length > 0 ? JSON.stringify(codes) : null },
  });
  return true;
}

/**
 * Enable 2FA after successful TOTP verification.
 */
export async function enable2fa(
  userId: string,
  secret: string,
): Promise<{ backupCodes: string[] }> {
  const { plain, hashed } = generateBackupCodes();
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: secret,
      totpEnabled: true,
      backupCodes: JSON.stringify(hashed),
    },
  });
  return { backupCodes: plain };
}

/**
 * Disable 2FA for a user.
 */
export async function disable2fa(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: null,
      totpEnabled: false,
      backupCodes: null,
    },
  });
}

/**
 * Check if a user has 2FA enabled.
 */
export async function is2faEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });
  return user?.totpEnabled ?? false;
}
