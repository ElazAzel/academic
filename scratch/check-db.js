import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const quiz = await prisma.quiz.findFirst({
    where: {
      OR: [
        { id: "demo-quiz-1" },
        { title: { contains: "demo-quiz-1" } }
      ]
    }
  });
  console.log("Quiz:", quiz);
  await prisma.$disconnect();
}

check();
