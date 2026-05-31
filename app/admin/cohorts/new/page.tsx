import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPublishedCourseOptions } from "@/server/modules/page-data/service";
import { CreateCohortForm } from "./create-cohort-form";

export const metadata = {
  title: "Создание когорты — Администрирование",
  description: "Создание новой когорты.",
};


export const dynamic = "force-dynamic";

export default async function NewCohortPage() {
 await requireRolePage(["admin"]);

 const courses = await getPublishedCourseOptions();

 return (
  <AppShell role="admin">
   <div className="mb-4">
    <Button asChild variant="ghost" size="sm">
     <Link href="/admin/cohorts"><ArrowLeft className="h-4 w-4 mr-1" /> К потокам</Link>
    </Button>
   </div>
   <PageHeader title="Создать поток" description="Новая когорта для группового обучения." />
   <div className="max-w-lg mt-6">
    <Card>
     <CardHeader>
      <CardTitle>Детали потока</CardTitle>
      <CardDescription>Заполните основные параметры нового потока.</CardDescription>
     </CardHeader>
     <CardContent>
      <CreateCohortForm courses={courses} />
     </CardContent>
    </Card>
   </div>
  </AppShell>
 );
}
