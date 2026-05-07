import { AppShell } from "@/components/layout/app-shell";
import { UserRoleEditor } from "@/components/admin/user-role-editor";
import { PageHeader } from "@/components/lms/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getAssignableRolesForActor, listUsers } from "@/server/modules/users/service";
import { ROLE_LABELS, type RoleKey } from "@/types/domain";
import { UserManagementToolbar } from "@/components/admin/user-management-toolbar";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const actor = await requireRolePage(["admin", "super_curator"]);
  const users = await listUsers({ take: 200 });
  const assignableRoles = getAssignableRolesForActor(actor.roles);
  const badge = actor.roles.includes("admin") ? "Администратор" : "Главный куратор";

  return (
    <AppShell role={actor.roles.includes("admin") ? "admin" : "super_curator"}>
      <PageHeader title="Пользователи" description="Выданные аккаунты, статусы входа и роли пользователей академии." badge={badge} />
      <div className="space-y-6">
        <UserManagementToolbar assignableRoles={assignableRoles} />

        <Tabs tabs={[
          {
            label: "Все пользователи",
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Текущие роли</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead>Назначение ролей</TableHead>
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
                            <div>
                              <p className="text-sm font-medium">{user.name ?? user.email}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <Badge key={role} className="border-primary/20 bg-primary/5 text-primary text-[10px]">{ROLE_LABELS[role]}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={user.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>
                            {user.status === "active" ? "Активен" : "Заблокирован"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{user.lastLoginAt?.toISOString().slice(0, 10) ?? "не входил"}</TableCell>
                        <TableCell>
                          <UserRoleEditor userId={user.id} initialRoles={roles} assignableRoles={assignableRoles} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          },
          {
            label: "Импорт",
            content: (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Импорт пользователей</CardTitle>
                  <CardDescription>Импорт будет подключен к защищенной внутренней БД и audit log отдельным шагом.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-10 text-center text-sm text-muted-foreground">
                    Сейчас массовое создание выполняется через защищенный скрипт `npm run users:provision`.
                  </div>
                </CardContent>
              </Card>
            )
          }
        ]} />
      </div>
    </AppShell>
  );
}
