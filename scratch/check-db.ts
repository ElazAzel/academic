import { getPrisma } from "../lib/prisma";

async function check() {
  const prisma = getPrisma();
  try {
    const userCount = await prisma.user.count();
    console.log("Total users:", userCount);

    const admin = await prisma.user.findUnique({
      where: { email: "admin@academy.local" },
      select: { email: true, status: true, passwordHash: true }
    });

    console.log("Admin user:", admin ? JSON.stringify(admin) : "Not found");
  } catch (err) {
    console.error("Error accessing DB:", err);
  }
}

check();
