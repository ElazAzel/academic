"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, FileText, FolderOpen, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { readApiData, readApiErrorMessage } from "@/lib/api-client";

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

type CreatedModule = Pick<Module, "id" | "title" | "order">;
type CreatedLesson = Pick<Lesson, "id" | "title" | "type" | "order">;

function LessonIcon({ type }: { type: string }) {
  if (type === "QUIZ") {
    return <CheckCircle2 className="h-4 w-4 text-primary" />;
  }
  if (type === "ASSIGNMENT") {
    return <FileText className="h-4 w-4 text-primary" />;
  }
  return <BookOpen className="h-4 w-4 text-primary" />;
}

export function CurriculumEditor({ courseId, initialModules }: CurriculumEditorProps) {
  const [modules, setModules] = useState(initialModules);
  const [showNewModule, setShowNewModule] = useState(false);
  const [activeLessonForm, setActiveLessonForm] = useState<string | null>(null);
  const [pendingModule, setPendingModule] = useState(false);
  const [pendingLesson, setPendingLesson] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Удалить этот модуль со всеми уроками?")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/modules/${moduleId}`, { method: "DELETE" });
      if (response.ok) {
        setModules((current) => current.filter((moduleItem) => moduleItem.id !== moduleId));
        router.refresh();
      } else {
        const msg = await readApiErrorMessage(response, "Не удалось удалить модуль");
        toast.error(msg);
      }
    } catch {
      toast.error("Ошибка сети при удалении модуля");
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Удалить этот урок?")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/lessons/${lessonId}`, { method: "DELETE" });
      if (response.ok) {
        setModules((current) =>
          current.map((moduleItem) => ({
            ...moduleItem,
            lessons: moduleItem.lessons.filter((lesson) => lesson.id !== lessonId),
          })),
        );
        router.refresh();
      } else {
        const msg = await readApiErrorMessage(response, "Не удалось удалить урок");
        toast.error(msg);
      }
    } catch {
      toast.error("Ошибка сети при удалении урока");
    }
  }

  async function handleAddModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingModule) {
      return;
    }

    setPendingModule(true);
    setModuleError(null);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || undefined;
    const order = Number(formData.get("order"));
    const recommendedDays = Number(formData.get("recommendedDays"));

    if (!title) {
      setModuleError("Название модуля обязательно");
      setPendingModule(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, order, recommendedDays }),
      });

      if (!response.ok) {
        setModuleError(await readApiErrorMessage(response, "Не удалось создать модуль"));
        return;
      }

      const newModule = await readApiData<CreatedModule>(response);
      setModules((current) => [
        ...current,
        { id: newModule.id, title: newModule.title, order: newModule.order, lessons: [] },
      ]);
      setShowNewModule(false);
      setActiveLessonForm(newModule.id);
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setModuleError("Ошибка сети при создании модуля");
    } finally {
      setPendingModule(false);
    }
  }

  async function handleAddLesson(event: React.FormEvent<HTMLFormElement>, moduleId: string) {
    event.preventDefault();
    if (pendingLesson) {
      return;
    }

    setPendingLesson(true);
    setLessonError(null);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const type = String(formData.get("type") ?? "TEXT");
    const summary = String(formData.get("summary") ?? "").trim() || null;
    const contentText = String(formData.get("contentText") ?? "").trim();
    const durationMinutes = Number(formData.get("durationMinutes"));
    const order = Number(formData.get("order"));

    if (!title) {
      setLessonError("Название урока обязательно");
      setPendingLesson(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          summary,
          durationMinutes,
          order,
          content: { blocks: contentText ? [{ type: "paragraph", text: contentText }] : [] },
        }),
      });

      if (!response.ok) {
        setLessonError(await readApiErrorMessage(response, "Не удалось создать урок"));
        return;
      }

      const lesson = await readApiData<CreatedLesson>(response);
      setModules((current) =>
        current.map((moduleItem) =>
          moduleItem.id === moduleId
            ? { ...moduleItem, lessons: [...moduleItem.lessons, lesson] }
            : moduleItem,
        ),
      );
      setActiveLessonForm(null);
      router.refresh();
    } catch {
      setLessonError("Ошибка сети при создании урока");
    } finally {
      setPendingLesson(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Учебный план</h2>
          <p className="text-sm text-muted-foreground">
            Добавляйте модули и уроки в том порядке, в котором студент будет проходить курс.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowNewModule((value) => !value)}>
          <Plus className="h-4 w-4" />
          {showNewModule ? "Отменить" : "Добавить модуль"}
        </Button>
      </div>

      {showNewModule ? (
        <Card className="rounded-lg border p-6">
          <form onSubmit={handleAddModule} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="module-title" className="text-xs font-semibold uppercase text-muted-foreground">Название модуля</label>
                <input id="module-title" name="title" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="module-order" className="text-xs font-semibold uppercase text-muted-foreground">Порядок</label>
                <input
                  id="module-order"
                  name="order"
                  type="number"
                  min={1}
                  defaultValue={modules.length + 1}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="recommendedDays" className="text-xs font-semibold uppercase text-muted-foreground">Дней на модуль</label>
                <input
                  id="recommendedDays"
                  name="recommendedDays"
                  type="number"
                  min={1}
                  defaultValue={7}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>
            <textarea
              name="description"
              className="w-full rounded-lg border bg-background px-4 py-3 text-sm"
              placeholder="Краткое описание модуля"
            />
            {moduleError ? <p className="text-sm text-rose-600">{moduleError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowNewModule(false)} disabled={pendingModule}>
                Отмена
              </Button>
              <Button type="submit" disabled={pendingModule}>
                {pendingModule ? "Создаем..." : "Создать модуль"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 px-6 py-16 text-center">
          <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">Нет модулей</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Нажмите «Добавить модуль», чтобы создать первый учебный модуль курса.
          </p>
        </div>
      ) : (
      <div className="space-y-6">
        {modules.map((moduleItem) => (
          <div key={moduleItem.id} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                <span className="w-6 shrink-0 text-sm font-bold text-muted-foreground">{moduleItem.order}.</span>
                <h3 className="truncate font-semibold">{moduleItem.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/instructor/modules/${moduleItem.id}/edit`} prefetch={false}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => handleDeleteModule(moduleItem.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 pl-0 sm:pl-10">
              {moduleItem.lessons.map((lesson) => (
                <Card key={lesson.id} className="group transition-shadow hover:shadow-sm">
                  <CardContent className="flex items-center gap-3 py-3">
                    <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/30 sm:block" />
                    <span className="w-4 shrink-0 text-xs text-muted-foreground">{lesson.order}.</span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <LessonIcon type={lesson.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lesson.title}</p>
                      <p className="text-[10px] uppercase uppercase-tracking text-muted-foreground">{lesson.type}</p>
                    </div>
                    <div className="flex items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/instructor/lessons/${lesson.id}/edit`} prefetch={false}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {activeLessonForm === moduleItem.id ? (
                <Card className="rounded-lg border p-4">
                  <form onSubmit={(event) => handleAddLesson(event, moduleItem.id)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label htmlFor="lesson-title" className="text-xs font-semibold uppercase text-muted-foreground">Название урока</label>
                        <input id="lesson-title" name="title" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" required />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lesson-type" className="text-xs font-semibold uppercase text-muted-foreground">Тип урока</label>
                        <select id="lesson-type" name="type" className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                          <option value="VIDEO">Видео</option>
                          <option value="TEXT">Текст</option>
                          <option value="VIDEO_DOCUMENT">Видео + документ</option>
                          <option value="QUIZ">Тест</option>
                          <option value="ASSIGNMENT">Задание</option>
                          <option value="MIXED">Смешанный</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lesson-order" className="text-xs font-semibold uppercase text-muted-foreground">Порядок</label>
                        <input
                          id="lesson-order"
                          name="order"
                          type="number"
                          min={1}
                          defaultValue={moduleItem.lessons.length + 1}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label htmlFor="durationMinutes" className="text-xs font-semibold uppercase text-muted-foreground">Минуты</label>
                        <input
                          id="durationMinutes"
                          name="durationMinutes"
                          type="number"
                          min={0}
                          defaultValue={10}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label htmlFor="lesson-summary" className="text-xs font-semibold uppercase text-muted-foreground">Описание</label>
                        <input
                          id="lesson-summary"
                          name="summary"
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          placeholder="Краткое описание урока"
                        />
                      </div>
                    </div>
                    <textarea
                      name="contentText"
                      rows={4}
                      className="w-full rounded-lg border bg-background px-4 py-3 text-sm"
                      placeholder="Основной текст урока"
                    />
                    {lessonError ? <p className="text-sm text-rose-600">{lessonError}</p> : null}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setActiveLessonForm(null)} disabled={pendingLesson}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={pendingLesson}>
                        {pendingLesson ? "Создание..." : "Создать урок"}
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-12 w-full rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary/50 hover:text-primary"
                  onClick={() => setActiveLessonForm(moduleItem.id)}
                >
                  <Plus className="h-4 w-4" />
                  Добавить урок
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
