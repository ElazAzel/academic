"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, GripVertical, Pencil, Trash2, BookOpen, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Lesson {
  id: string;
  title: string;
  type: string;
  order: number;
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CurriculumEditorProps {
  courseId: string;
  initialModules: Module[];
}

export function CurriculumEditor({ courseId, initialModules }: CurriculumEditorProps) {
  const [modules, setModules] = useState(initialModules);
  const router = useRouter();

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Удалить этот модуль со всеми уроками?")) return;
    try {
      const res = await fetch(`/api/v1/modules/${moduleId}`, { method: "DELETE" });
      if (res.ok) {
        setModules(modules.filter(m => m.id !== moduleId));
        router.refresh();
      }
    } catch {
      alert("Ошибка при удалении");
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Удалить этот урок?")) return;
    try {
      const res = await fetch(`/api/v1/lessons/${lessonId}`, { method: "DELETE" });
      if (res.ok) {
        setModules(modules.map(m => ({
          ...m,
          lessons: m.lessons.filter(l => l.id !== lessonId)
        })));
        router.refresh();
      }
    } catch {
      alert("Ошибка при удалении");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить модуль
        </Button>
      </div>

      <div className="space-y-6">
        {modules.map((m) => (
          <div key={m.id} className="space-y-4">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border">
              <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-sm font-bold text-muted-foreground w-6">{m.order}.</span>
                <h3 className="font-semibold">{m.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/instructor/modules/${m.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteModule(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="pl-10 space-y-2">
              {m.lessons.map((l) => (
                <Card key={l.id} className="group transition-shadow hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 py-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground w-4">{l.order}.</span>
                    
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      {l.type === "QUIZ" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : 
                       l.type === "ASSIGNMENT" ? <FileText className="h-4 w-4 text-primary" /> : 
                       <BookOpen className="h-4 w-4 text-primary" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{l.type}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/instructor/lessons/${l.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteLesson(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="ghost" size="sm" className="w-full border-2 border-dashed rounded-xl h-12 text-muted-foreground hover:text-primary hover:border-primary/50">
                <Plus className="h-4 w-4 mr-2" />
                Добавить урок
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
