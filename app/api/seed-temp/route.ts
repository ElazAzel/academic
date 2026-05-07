import { NextResponse } from "next/server";
import { PrismaClient, RoleKey } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const passwordHash = await hashPassword("Password123!");
    
    async function upsertUser(email: string, name: string, roleKey: RoleKey) {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, passwordHash },
        create: {
          email,
          name,
          passwordHash,
          emailVerified: new Date(),
        }
      });
      
      const role = await prisma.role.upsert({
        where: { key: roleKey },
        update: {},
        create: { key: roleKey, name: roleKey }
      });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id }
      });
    }

    await upsertUser("admin@academy.local", "Администратор", "admin");
    await upsertUser("instructor1@academy.local", "Преподаватель", "instructor");
    await upsertUser("curator@academy.local", "Куратор", "curator");
    await upsertUser("supercurator@academy.local", "Супер-куратор", "super_curator");
    await upsertUser("observer@academy.local", "Заказчик", "customer_observer");
    
    for (let i = 1; i <= 10; i++) {
      await upsertUser(`student${i}@academy.local`, `Слушатель ${i}`, "student");
    }
    
    return NextResponse.json({ success: true, message: "Все аккаунты успешно созданы!" });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
