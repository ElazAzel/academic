import { type RoleKey } from "@prisma/client";
import { getPrisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";

const prisma = getPrisma();

const SEED_PASSWORD = process.env.SEED_PASSWORD || process.env.SEED_ADMIN_TOKEN || "Password123!";
if (!process.env.SEED_PASSWORD && !process.env.SEED_ADMIN_TOKEN) {
  console.warn("WARNING: Using default SEED_PASSWORD. Set SEED_PASSWORD or SEED_ADMIN_TOKEN env var.");
}

const USERS: Array<{ email: string; name: string; role: RoleKey }> = [
  { email: "admin@academy.local", name: "Администратор", role: "admin" },
  { email: "instructor1@academy.local", name: "Преподаватель", role: "instructor" },
  { email: "curator@academy.local", name: "Куратор", role: "curator" },
  { email: "supercurator@academy.local", name: "Супер-куратор", role: "super_curator" },
  { email: "student1@academy.local", name: "Слушатель 1", role: "student" },
  { email: "student2@academy.local", name: "Слушатель 2", role: "student" },
  { email: "student3@academy.local", name: "Слушатель 3", role: "student" },
  { email: "student4@academy.local", name: "Слушатель 4", role: "student" },
  { email: "student5@academy.local", name: "Слушатель 5", role: "student" },
  { email: "student6@academy.local", name: "Слушатель 6", role: "student" },
  { email: "student7@academy.local", name: "Слушатель 7", role: "student" },
  { email: "student8@academy.local", name: "Слушатель 8", role: "student" },
  { email: "student9@academy.local", name: "Слушатель 9", role: "student" },
  { email: "student10@academy.local", name: "Слушатель 10", role: "student" },
  { email: "observer@academy.local", name: "Заказчик / Наблюдатель", role: "customer_observer" },
];

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, status: "ACTIVE" },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
        consentLogs: {
          create: [
            { type: "privacy_policy", status: "ACCEPTED", version: "2026-05-01", acceptedAt: new Date() },
            { type: "terms_of_use", status: "ACCEPTED", version: "2026-05-01", acceptedAt: new Date() },
            { type: "cookie_notice", status: "ACCEPTED", version: "2026-05-01", acceptedAt: new Date() },
          ],
        },
      },
    });

    const role = await prisma.role.upsert({
      where: { key: u.role },
      update: {},
      create: { key: u.role, name: u.role },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    console.log(`Upserted: ${u.email} (${u.role})`);
  }

  console.log("\nAll users created/updated successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
