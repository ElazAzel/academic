import { getPrisma } from "../lib/prisma";
import { verifyPassword } from "../lib/auth/password";

const prisma = getPrisma();

const DEMO_PASSWORD = "Password123!";

const DEMO_USERS = [
  "admin@academy.local",
  "instructor1@academy.local",
  "curator@academy.local",
  "supercurator@academy.local",
  "student1@academy.local",
  "student2@academy.local",
  "student3@academy.local",
  "student4@academy.local",
  "student5@academy.local",
  "student6@academy.local",
  "student7@academy.local",
  "student8@academy.local",
  "student9@academy.local",
  "student10@academy.local",
  "observer@academy.local",
] as const;

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: [...DEMO_USERS] } },
    include: { roles: { include: { role: true } } },
    orderBy: { email: "asc" },
  });

  const byEmail = new Map(users.map((user) => [user.email, user]));
  let broken = 0;

  for (const email of DEMO_USERS) {
    const user = byEmail.get(email);
    if (!user) {
      broken += 1;
      console.log(`${email}: missing`);
      continue;
    }

    const passwordOk = user.passwordHash ? await verifyPassword(user.passwordHash, DEMO_PASSWORD) : false;
    const roles = user.roles.map((entry) => entry.role.key).sort().join(", ") || "none";
    const checksOk = user.status === "ACTIVE" && Boolean(user.passwordHash) && passwordOk && roles !== "none";

    if (!checksOk) {
      broken += 1;
    }

    console.log(
      [
        `${email}: ${checksOk ? "ok" : "broken"}`,
        `status=${user.status}`,
        `hasPassword=${Boolean(user.passwordHash)}`,
        `passwordOk=${passwordOk}`,
        `roles=${roles}`,
      ].join(" | "),
    );
  }

  if (broken > 0) {
    throw new Error(`Demo user check failed: ${broken} account(s) need repair.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
