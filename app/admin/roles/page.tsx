import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { ROLE_LABELS } from "@/types/domain";
import type { RoleKey } from "@/types/domain";

const ROLES = [
  { key: "admin" as RoleKey, permissions: ["users:manage", "courses:manage", "enrollments:manage", "invites:manage", "analytics:read", "audit:read", "settings:manage", "roles:manage"] },
  { key: "instructor" as RoleKey, permissions: ["courses:manage", "lessons:manage", "quizzes:manage", "assignments:manage", "analytics:read"] },
  { key: "curator" as RoleKey, permissions: ["students:read", "questions:answer", "assignments:review", "risks:read", "progress:read"] },
  { key: "super_curator" as RoleKey, permissions: ["curators:manage", "students:read", "questions:answer", "assignments:review", "risks:read", "reports:read", "distribution:manage"] },
  { key: "student" as RoleKey, permissions: ["courses:read", "lessons:read", "quizzes:take", "assignments:submit", "questions:create", "certificates:read"] },
  { key: "customer_observer" as RoleKey, permissions: ["analytics:read", "reports:read", "certificates:read"] },
];

export default function AdminRolesPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Роли и права" description="RBAC матрица: роли и серверные permissions." badge="Администратор" />
      <div className="space-y-4">
        {ROLES.map((r) => (
          <Card key={r.key} className="transition-shadow hover:shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">{ROLE_LABELS[r.key]}</p>
                <Badge>{r.key}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.permissions.map((p) => (
                  <Badge key={p} className="border-primary/15 bg-primary/5 text-primary text-[10px]">{p}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
