import { getPrisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const prisma = getPrisma();
  const users = await prisma.user.findMany();

  
  const newPassword = "Password123!";
  const newHash = await hashPassword(newPassword);

  console.log(`--- Начинаю обновление ${users.length} пользователей ---`);

  for (const user of users) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          status: "active"
        data: { 
          passwordHash: newHash,
          status: "active" 
        }
      });
      console.log(`✅ Обновлен: ${user.email}`);
    } catch (err) {
      console.error(`❌ Ошибка обновления ${user.email}:`, err);
    }
  }

  console.log("\n--- ИТОГОВЫЙ СПИСОК ЛОГИНОВ ---");
  users.forEach(u => console.log(`Логин: ${u.email} | Пароль: ${newPassword}`));
  console.log("\nВсе данные пользователей (курсы, прогресс) сохранены.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
    process.exit();
  });
