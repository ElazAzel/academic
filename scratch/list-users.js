import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  });

  console.log("Total users:", users.length);
  users.forEach(u => {
    const roleKeys = u.roles.map(r => r.role.key).join(", ");
    console.log(`${u.email} | ${u.name} | Roles: [${roleKeys}]`);
  });

  await prisma.$disconnect();
}

listUsers();
