import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { RoleKey } from "@prisma/client";
import { getPrisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";

type ProvisionAccount = {
  email: string;
  name: string;
  role: RoleKey;
};

const prisma = getPrisma();

const permissions = [
  "users:read",
  "users:write",
  "roles:manage",
  "courses:read",
  "courses:write",
  "lessons:write",
  "enrollments:write",
  "progress:write",
  "quizzes:write",
  "assignments:review",
  "certificates:issue",
  "invites:manage",
  "analytics:read",
  "audit:read",
  "settings:manage",
  "notifications:write",
  "reports:read"
] as const;

const rolePermissions: Record<RoleKey, readonly string[]> = {
  admin: permissions,
  instructor: ["courses:read", "courses:write", "lessons:write", "quizzes:write", "analytics:read", "reports:read"],
  student: ["courses:read", "progress:write"],
  curator: ["courses:read", "assignments:review", "progress:write", "notifications:write", "reports:read"],
  super_curator: ["courses:read", "assignments:review", "analytics:read", "notifications:write", "reports:read"],
  customer_observer: ["courses:read", "analytics:read", "reports:read"]
};

function intEnv(key: string, fallback: number) {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boolEnv(key: string, fallback = false) {
  const value = process.env[key];
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function cleanDomain(value: string) {
  return value.replace(/^@+/, "").trim().toLowerCase();
}

function pad(value: number, width: number) {
  return String(value).padStart(width, "0");
}

function generatePassword(length = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function csv(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildAccounts() {
  const domain = cleanDomain(process.env.PROVISION_EMAIL_DOMAIN ?? "academy.local");
  const studentCount = intEnv("PROVISION_STUDENT_COUNT", 4000);
  const curatorCount = intEnv("PROVISION_CURATOR_COUNT", 50);
  const studentWidth = Math.max(4, String(studentCount).length);
  const curatorWidth = Math.max(2, String(curatorCount).length);

  const accounts: ProvisionAccount[] = [
    {
      email: process.env.PROVISION_ADMIN_EMAIL ?? `academy-admin@${domain}`,
      name: "Academy Admin",
      role: RoleKey.admin
    },
    {
      email: process.env.PROVISION_SUPER_CURATOR_EMAIL ?? `head-curator@${domain}`,
      name: "Head Curator",
      role: RoleKey.super_curator
    },
    {
      email: process.env.PROVISION_OBSERVER_EMAIL ?? `observer@${domain}`,
      name: "Customer Observer",
      role: RoleKey.customer_observer
    }
  ];

  for (let index = 1; index <= curatorCount; index += 1) {
    accounts.push({
      email: `curator${pad(index, curatorWidth)}@${domain}`,
      name: `Curator ${pad(index, curatorWidth)}`,
      role: RoleKey.curator
    });
  }

  for (let index = 1; index <= studentCount; index += 1) {
    accounts.push({
      email: `student${pad(index, studentWidth)}@${domain}`,
      name: `Student ${pad(index, studentWidth)}`,
      role: RoleKey.student
    });
  }

  return accounts;
}

async function ensureRolesAndPermissions() {
  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, name: key }
    });
  }

  for (const roleKey of Object.values(RoleKey)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: {},
      create: { key: roleKey, name: roleKey }
    });

    for (const permissionKey of rolePermissions[roleKey]) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }
}

async function upsertAccount(account: ProvisionAccount, resetExistingPasswords: boolean) {
  const email = account.email.toLowerCase().trim();
  const role = await prisma.role.findUniqueOrThrow({ where: { key: account.role } });
  const existing = await prisma.user.findUnique({ where: { email } });
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: account.name,
          emailVerified: existing.emailVerified ?? new Date(),
          ...(resetExistingPasswords ? { passwordHash } : {})
        }
      })
    : await prisma.user.create({
        data: {
          email,
          name: account.name,
          passwordHash,
          emailVerified: new Date()
        }
      });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id }
  });

  return {
    id: user.id,
    email,
    name: account.name,
    role: account.role,
    password: existing && !resetExistingPasswords ? "UNCHANGED" : password,
    status: existing ? (resetExistingPasswords ? "updated_password_reset" : "updated_password_unchanged") : "created"
  };
}

async function main() {
  const resetExistingPasswords = boolEnv("PROVISION_RESET_EXISTING_PASSWORDS", false);
  const outputDir = process.env.PROVISION_OUTPUT_DIR ?? "var/credentials";
  const accounts = buildAccounts();
  const startedAt = new Date();

  await ensureRolesAndPermissions();

  const rows = [];
  for (const account of accounts) {
    rows.push(await upsertAccount(account, resetExistingPasswords));
  }

  await prisma.auditLog.create({
    data: {
      action: "users.provisioned",
      entity: "user",
      metadata: {
        total: rows.length,
        students: intEnv("PROVISION_STUDENT_COUNT", 4000),
        curators: intEnv("PROVISION_CURATOR_COUNT", 50),
        resetExistingPasswords,
        outputDir
      }
    }
  });

  await mkdir(outputDir, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const outputPath = join(outputDir, `academy-users-${stamp}.csv`);
  const header = ["role", "login", "email", "password", "name", "status", "user_id"];
  const body = rows.map((row) =>
    [row.role, row.email, row.email, row.password, row.name, row.status, row.id].map(csv).join(",")
  );
  await writeFile(outputPath, `${header.join(",")}\n${body.join("\n")}\n`, "utf8");

  console.log(`Provisioned ${rows.length} issued-credential accounts.`);
  console.log(`Credentials CSV: ${outputPath}`);
  console.log("CSV is inside an ignored directory. Do not commit issued credentials.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
