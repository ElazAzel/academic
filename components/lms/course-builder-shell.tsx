"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CourseOutline } from "@/components/lms/course-outline";
import { CourseSettingsPanel } from "@/components/lms/course-settings-panel";
import { ModuleEditor } from "@/components/lms/module-editor";
import { LessonEditor } from "@/components/lms/lesson-editor";
import type { CourseBuilderDetail, BuilderModuleDetail, BuilderLessonDetail } from "@/types/domain";

type SelectedNode =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "lesson"; moduleId: string; lessonId: string };

export function CourseBuilderShell({ detail: initial }: { detail: CourseBuilderDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState<CourseBuilderDetail>(initial);
  const [selected, setSelected] = useState<SelectedNode>({ type: "course" });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/courses/${detail.id}/builder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detail.title,
          description: detail.description,
          goal: detail.goal,
          coverUrl: detail.coverUrl,
          durationHours: detail.durationHours,
          traversalMode: detail.traversalMode,
          completionThreshold: detail.completionThreshold,
        }),
      });
      if (res.ok) {
        toast.success("Сохранено");
        setDirty(false);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || "Ошибка при сохранении");
      }
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setSaving(false);
    }
  }, [detail, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) handleSave();
      }
      if (e.key === "Escape") setSettingsOpen((o) => !o);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, handleSave]);

  const selectedModule: BuilderModuleDetail | undefined =
    selected.type === "module" ? detail.modules.find((m) => m.id === selected.moduleId)
    : selected.type === "lesson" ? detail.modules.find((m) => m.id === selected.moduleId)
    : undefined;

  const selectedLesson: BuilderLessonDetail | undefined =
    selected.type === "lesson"
      ? selectedModule && "lessons" in selectedModule
        ? (selectedModule as BuilderModuleDetail).lessons.find((l) => l.id === selected.lessonId)
        : undefined
      : undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/instructor/courses">
            <Button size="sm" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-semibold truncate max-w-[400px]">{detail.title}</h1>
            <p className="text-xs text-muted-foreground">
              Статус: {detail.status === "DRAFT" ? "Черновик" : detail.status === "PUBLISHED" ? "Опубликован" : "Архив"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/student/courses/${detail.id}`} target="_blank">
              <Eye className="h-4 w-4 mr-1" />
              Предпросмотр
            </Link>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Outline sidebar */}
        <div className="w-72 shrink-0 border-r overflow-y-auto bg-muted/20">
          <CourseOutline
            modules={detail.modules}
            selected={selected}
            onSelect={setSelected}
            courseId={detail.id}
            onModulesChange={(modules) => { setDetail((d) => ({ ...d, modules })); setDirty(true); }}
          />
        </div>

        {/* Center editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected.type === "course" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Название курса</label>
                <input
                  className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={detail.title}
                  onChange={(e) => { setDetail((d) => ({ ...d, title: e.target.value })); setDirty(true); }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Описание</label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={detail.description}
                  onChange={(e) => { setDetail((d) => ({ ...d, description: e.target.value })); setDirty(true); }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Цель</label>
                  <input
                    className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    value={detail.goal ?? ""}
                    onChange={(e) => { setDetail((d) => ({ ...d, goal: e.target.value })); setDirty(true); }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Длительность (часов)</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    value={detail.durationHours}
                    onChange={(e) => { setDetail((d) => ({ ...d, durationHours: Number(e.target.value) })); setDirty(true); }}
                  />
                </div>
              </div>
            </div>
          )}

          {selected.type === "module" && selectedModule && (
            <ModuleEditor
              module={selectedModule}
              onChange={(updates) => {
                setDetail((d) => ({
                  ...d,
                  modules: d.modules.map((m) => (m.id === selectedModule.id ? { ...m, ...updates } : m)),
                }));
                setDirty(true);
              }}
            />
          )}

          {selected.type === "lesson" && selectedLesson && (
            <LessonEditor
              lesson={selectedLesson}
              courseId={detail.id}
              onChange={(updates) => {
                setDetail((d) => ({
                  ...d,
                  modules: d.modules.map((m) =>
                    m.id === selected.moduleId
                      ? { ...m, lessons: m.lessons.map((l) => (l.id === selected.lessonId ? { ...l, ...updates } : l)) }
                      : m
                  ),
                }));
                setDirty(true);
              }}
            />
          )}
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <div className="w-80 shrink-0 border-l overflow-y-auto bg-muted/10 p-5">
            <CourseSettingsPanel
              selected={selected}
              detail={detail}
              module={selectedModule}
              lesson={selectedLesson}
              onChange={() => setDirty(true)}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-6 py-2 text-xs text-muted-foreground">
        <span>{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</span>
        <span>Ctrl+S — сохранить</span>
      </div>
    </div>
  );
}
