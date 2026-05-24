import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listUsers } from "@/server/modules/users/service";
import { ROLE_LABELS, type RoleKey } from "@/types/domain";

export const metadata = {
  title: "Пользователи — Супер-куратор",
  description: "Управление пользователями.",
};


export const dynamic = "force-dynamic";

/**
 * Супер-куратор видит пользователей и их роли, но НЕ может назначать роли.
 * Назначение ролей — только у администратора.
 */
export default async function SuperCuratorUsersPage() {
  await requireRolePage(["super_curator"]);
  const users = await listUsers({ roleKeys: ["student", "curator", "instructor"], take: 300 });

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Участники"
        description="Просмотр участников обучения и их ролей. Для назначения ролей обратитесь к администратору."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Пользователь</TableHead>
            <TableHead>Роли</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const roles = user.roles.map((entry) => entry.role.key as RoleKey);
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar name={user.name ?? user.email} className="h-7 w-7 text-[10px]" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name ?? user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {roles.map((role) => (
                      <Badge key={role} className="border-primary/20 bg-primary/5 text-primary text-[10px]">
                        {ROLE_LABELS[role]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">
                    {user.status === "ACTIVE" ? "Активен" : user.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AppShell>
  );
}
