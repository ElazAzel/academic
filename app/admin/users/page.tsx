import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { UserRoleEditor } from "@/components/admin/user-role-editor";
import { PageHeader } from "@/components/lms/page-header";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/lms/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { UserAccountStatus } from "@prisma/client";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getAssignableRolesForActor, listUsers, countUsers } from "@/server/modules/users/service";
import { ROLE_LABELS, type RoleKey } from "@/types/domain";
import { UserManagementToolbar } from "@/components/admin/user-management-toolbar";
import { EditUserDialog, DeleteUserButton } from "@/components/admin/edit-user-dialog";
import { UserFilters } from "@/components/admin/user-filters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

export default async function AdminUsersPage(props: {
  searchParams?: Promise<{ page?: string; search?: string; role?: string; status?: string }>;
}) {
  const actor = await requireRolePage(["admin", "super_curator"]);
  const sp = await props.searchParams;
  const currentPage = Math.max(1, Number(sp?.page) || 1);
  const search = sp?.search ?? "";
  const roleFilter = sp?.role ?? "";
  const statusFilter = sp?.status ?? "";
  const skip = (currentPage - 1) * PAGE_SIZE;

  const roleKeys = roleFilter ? [roleFilter as RoleKey] : undefined;
  const [users, totalUsers] = await Promise.all([
    listUsers({ take: PAGE_SIZE, skip, search: search || undefined, roleKeys, status: statusFilter || undefined }),
    countUsers({ search: search || undefined, roleKeys, status: statusFilter || undefined }),
  ]);
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
  const assignableRoles = getAssignableRolesForActor(actor.roles);

  return (
    <AppShell role={actor.roles.includes("admin") ? "admin" : "super_curator"}>
      <PageHeader title="Пользователи" description="Выданные аккаунты, статусы и роли." />
      <div className="space-y-6">
        <UserManagementToolbar assignableRoles={assignableRoles} />

        <UserFilters search={search} role={roleFilter} status={statusFilter} />

        <Tabs tabs={[{
          label: `Все пользователи (${totalUsers})`,
          content: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Реальное имя</TableHead>
                  <TableHead>Роли</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Вход</TableHead>
                  <TableHead>Назначение ролей</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {user.organization ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.map((role) => (
                            <Badge key={role} className="border-primary/20 bg-primary/5 text-primary text-[10px]">{ROLE_LABELS[role]}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={user.status === UserAccountStatus.ACTIVE ? "ACTIVE" : "BLOCKED"}
                          label={user.status === UserAccountStatus.ACTIVE ? "Активен" : user.status === UserAccountStatus.INACTIVE ? "Неактивен" : "Заблокирован"}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{user.lastLoginAt?.toISOString().slice(0, 10) ?? "—"}</TableCell>
                      <TableCell>
                        <UserRoleEditor userId={user.id} initialRoles={roles} assignableRoles={assignableRoles} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditUserDialog user={{ id: user.id, name: user.name, email: user.email, status: user.status, realName: user.organization ?? null }} />
                          <DeleteUserButton userId={user.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ),
        }, {
          label: "Импорт",
          content: (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Импорт пользователей</CardTitle>
                <CardDescription>Массовое создание через CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-10 text-center text-sm text-muted-foreground">
                  Сейчас массовое создание выполняется через защищенный скрипт `npm run users:provision`.
                </div>
              </CardContent>
            </Card>
          ),
        }]} />
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">{totalUsers} пользователей · стр. {currentPage} из {totalPages}</p>
            <div className="flex gap-2">
              {currentPage > 1 && <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/users?page=${currentPage - 1}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}>Назад</Link>
              </Button>}
              {currentPage < totalPages && <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/users?page=${currentPage + 1}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}>Вперёд</Link>
              </Button>}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
