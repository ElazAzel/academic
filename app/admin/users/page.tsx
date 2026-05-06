import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Download, Upload, UserPlus } from "lucide-react";
import { ROLE_LABELS } from "@/types/domain";
import type { RoleKey } from "@/types/domain";

const MOCK_USERS = [
  { id: "u1", name: "Администратор Академии", email: "admin@academy.local", roles: ["admin" as RoleKey], status: "active", lastLogin: "2026-05-07" },
  { id: "u2", name: "Алия Нурланова", email: "instructor1@academy.local", roles: ["instructor" as RoleKey], status: "active", lastLogin: "2026-05-06" },
  { id: "u3", name: "Куратор Мадина", email: "curator@academy.local", roles: ["curator" as RoleKey], status: "active", lastLogin: "2026-05-06" },
  { id: "u4", name: "Супер-куратор Тимур", email: "supercurator@academy.local", roles: ["super_curator" as RoleKey], status: "active", lastLogin: "2026-05-05" },
  { id: "u5", name: "Слушатель 1", email: "student1@academy.local", roles: ["student" as RoleKey], status: "active", lastLogin: "2026-05-06" },
  { id: "u6", name: "Слушатель 2", email: "student2@academy.local", roles: ["student" as RoleKey], status: "active", lastLogin: "2026-05-04" },
  { id: "u7", name: "Заказчик-наблюдатель", email: "observer@academy.local", roles: ["customer_observer" as RoleKey], status: "active", lastLogin: "2026-05-03" },
];

export default function AdminUsersPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Пользователи" description="Управление пользователями: создание, импорт, роли и блокировка." badge="Администратор" />
      <div className="space-y-6">
        <div className="flex gap-3">
          <Button><UserPlus className="h-4 w-4" />Добавить пользователя</Button>
          <Button variant="secondary"><Upload className="h-4 w-4" />Импорт из Excel</Button>
          <Button variant="secondary"><Download className="h-4 w-4" />Экспорт CSV</Button>
        </div>

        <Tabs tabs={[
          {
            label: "Все пользователи",
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_USERS.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} className="h-7 w-7 text-[10px]" />
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.roles.map((r) => (
                            <Badge key={r} className="border-primary/20 bg-primary/5 text-primary text-[10px]">{ROLE_LABELS[r]}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={u.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>
                          {u.status === "active" ? "Активен" : "Заблокирован"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.lastLogin}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary">Редактировать</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ),
          },
          {
            label: "Импорт из Excel",
            content: (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Импорт пользователей</CardTitle>
                  <CardDescription>Загрузите Excel-файл (.xlsx) со списком пользователей. Формат: Имя, Email, Роль.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-10">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Перетащите файл сюда или нажмите для выбора</p>
                      <p className="text-xs text-muted-foreground mt-1">.xlsx, максимум 5MB</p>
                    </div>
                  </div>
                  <Button disabled>Начать импорт</Button>
                </CardContent>
              </Card>
            ),
          },
        ]} />
      </div>
    </AppShell>
  );
}
