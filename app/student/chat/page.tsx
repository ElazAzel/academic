import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { ChatPanel } from "@/components/lms/chat-panel";
import { MessageCircle, User } from "lucide-react";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function StudentChatPage() {
  const user = await requireRolePage(["student"]);

  // Get the student's assigned curator
  const assignment = await prisma.curatorAssignment.findFirst({
    where: { studentId: user.id, active: true },
    select: {
      curatorId: true,
      curator: { select: { name: true } },
    },
  });

  return (
    <AppShell role="student">
      <PageHeader
        title="Чат с куратором"
        description="Задавайте вопросы и получайте ответы от вашего куратора."
      />

      {assignment ? (
        <div className="space-y-4">
          <Card className="rounded-2xl bg-muted/30">
            <CardContent className="flex items-center gap-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </span>
              <div>
                <p className="text-sm font-medium">Ваш куратор</p>
                <p className="text-xs text-muted-foreground">{assignment.curator.name ?? "Куратор"}</p>
              </div>
            </CardContent>
          </Card>
          <ChatPanel
            studentId={user.id}
            curatorId={assignment.curatorId}
          />
        </div>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              У вас пока нет назначенного куратора.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Обратитесь к администратору для назначения.
            </p>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
