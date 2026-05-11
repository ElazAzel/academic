import { AppShell } from "@/components/layout/app-shell";
import { UserRoleEditor } from "@/components/admin/user-role-editor";
import { PageHeader } from "@/components/lms/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getAssignableRolesForActor, listUsers } from "@/server/modules/users/service";
import { ROLE_LABELS, type RoleKey } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function SuperCuratorUsersPage() {
 const actor = await requireRolePage(["super_curator"]);
 const assignableRoles = getAssignableRolesForActor(actor.roles);
 const users = await listUsers({ roleKeys: assignableRoles, take: 300 });

 return (
  <AppShell role="super_curator">
   <PageHeader title="Роли участников" description="Главный куратор может назначать учебные и операционные роли без доступа к роли администратора."/>
   <Table>
    <TableHeader>
     <TableRow>
      <TableHead>Пользователь</TableHead>
      <TableHead>Текущие роли</TableHead>
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
          <Avatar name={user.name ?? user.email} className="h-7 w-7 text-[10px]"/>
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
         <UserRoleEditor userId={user.id} initialRoles={roles} assignableRoles={assignableRoles}/>
        </TableCell>
       </TableRow>
      );
     })}
    </TableBody>
   </Table>
  </AppShell>
 );
}
