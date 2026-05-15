"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Send, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ROLE_LABELS, type RoleKey } from "@/types/domain";

interface Popup {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  targetRoles: RoleKey[];
  targetCohortIds: string[];
  isActive: boolean;
  createdBy: { id: string; name: string | null; email: string };
  createdAt: string;
}

interface Cohort {
  id: string;
  name: string;
  courseTitle: string;
  status: string;
}

const ALL_ROLES: RoleKey[] = ["admin", "super_curator", "curator", "instructor", "student", "customer_observer"];

export function AdminPopupManagerClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCohortPicker, setShowCohortPicker] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    imageUrl: "",
    linkUrl: "",
    linkText: "",
    targetRoles: [] as RoleKey[],
    targetCohortIds: [] as string[],
    isActive: true,
  });

  const { data: popups = [], isLoading } = useQuery<Popup[]>({
    queryKey: ["admin-popups"],
    queryFn: async () => {
      const res = await fetch("/api/v1/popups");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["admin-cohorts"],
    queryFn: async () => {
      const res = await fetch("/api/v1/cohorts");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/v1/popups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          imageUrl: data.imageUrl || null,
          linkUrl: data.linkUrl || null,
          linkText: data.linkText || null,
          targetRoles: data.targetRoles,
          targetCohortIds: data.targetCohortIds,
          isActive: data.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-popups"] });
      setShowForm(false);
      setShowCohortPicker(false);
      setForm({ title: "", message: "", imageUrl: "", linkUrl: "", linkText: "", targetRoles: [], targetCohortIds: [], isActive: true });
      toast.success("Попап создан и отправлен выбранным ролям");
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/v1/popups/${id}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-popups"] });
      toast.success("Статус попапа изменён");
    },
    onError: () => {
      toast.error("Ошибка при изменении статуса");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/popups/${id}/toggle`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-popups"] });
      toast.success("Попап удалён");
    },
    onError: () => {
      toast.error("Ошибка при удалении попапа");
    },
  });

  const toggleRole = (role: RoleKey) => {
    setForm((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
      // Reset cohort selection if student role is removed
      targetCohortIds: role === "student" && prev.targetRoles.includes("student")
        ? []
        : prev.targetCohortIds,
    }));
    // Show cohort picker when student is selected
    if (role === "student") {
      setShowCohortPicker(true);
    }
  };

  const toggleCohort = (cohortId: string) => {
    setForm((prev) => ({
      ...prev,
      targetCohortIds: prev.targetCohortIds.includes(cohortId)
        ? prev.targetCohortIds.filter((id) => id !== cohortId)
        : [...prev.targetCohortIds, cohortId],
    }));
  };

  const studentSelected = form.targetRoles.includes("student");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Создавайте всплывающие сообщения для пользователей по ролям
        </p>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Отмена" : "Создать попап"}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Новый всплывающий попап</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Заголовок *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Например: Важное объявление"
              />
            </div>

            <div className="space-y-2">
              <Label>Текст сообщения *</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Текст попапа..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>URL изображения (необязательно)</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ссылка (необязательно)</Label>
                <Input
                  value={form.linkUrl}
                  onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Текст ссылки</Label>
                <Input
                  value={form.linkText}
                  onChange={(e) => setForm((p) => ({ ...p, linkText: e.target.value }))}
                  placeholder="Подробнее"
                />
              </div>
            </div>

            {/* Target Roles */}
            <div className="space-y-2">
              <Label>Целевые роли *</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => (
                  <Badge
                    key={role}
                    variant={form.targetRoles.includes(role) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleRole(role)}
                  >
                    {ROLE_LABELS[role]}
                  </Badge>
                ))}
              </div>
              {form.targetRoles.length === 0 && (
                <p className="text-xs text-muted-foreground">Выберите хотя бы одну роль</p>
              )}
            </div>

            {/* Cohort Selection (shown when student role is selected) */}
            {studentSelected && (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Потоки (для слушателей)</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.targetCohortIds.length === 0
                    ? "Не выбрано — попап будет отправлен всем слушателям"
                    : `Выбрано потоков: ${form.targetCohortIds.length}`}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {cohorts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет активных потоков</p>
                  ) : (
                    cohorts.map((cohort) => (
                      <Badge
                        key={cohort.id}
                        variant={form.targetCohortIds.includes(cohort.id) ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleCohort(cohort.id)}
                      >
                        {cohort.name}
                        {cohort.courseTitle && (
                          <span className="ml-1 opacity-70">({cohort.courseTitle})</span>
                        )}
                      </Badge>
                    ))
                  )}
                </div>
                {form.targetCohortIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 mt-1"
                    onClick={() => setForm((p) => ({ ...p, targetCohortIds: [] }))}
                  >
                    Сбросить выбор потоков
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
              <Label>Активен сразу после создания</Label>
            </div>

            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.title || !form.message || form.targetRoles.length === 0}
              className="w-full"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Отправка...
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Отправить попап
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Popups List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : popups.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            Попапов пока нет. Создайте первый попап.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {popups.map((popup) => {
            const cohortNames = popup.targetCohortIds?.length
              ? cohorts.filter((c) => popup.targetCohortIds.includes(c.id)).map((c) => c.name)
              : [];

            return (
              <Card key={popup.id} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium">{popup.title}</h3>
                        <Badge variant={popup.isActive ? "default" : "secondary"} className="text-[10px]">
                          {popup.isActive ? "Активен" : "Неактивен"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{popup.message}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {popup.targetRoles.map((role) => (
                          <Badge key={role} variant="outline" className="text-[10px]">
                            {ROLE_LABELS[role as RoleKey]}
                          </Badge>
                        ))}
                      </div>
                      {cohortNames.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cohortNames.map((name) => (
                            <Badge key={name} variant="secondary" className="text-[10px]">
                              <Users className="h-3 w-3 mr-1" />
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Создал: {popup.createdBy?.name || popup.createdBy?.email}</span>
                        <span>{formatDistanceToNow(new Date(popup.createdAt), { addSuffix: true, locale: ru })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate({ id: popup.id })}
                        title={popup.isActive ? "Деактивировать" : "Активировать"}
                      >
                        {popup.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Удалить попап?")) {
                            deleteMutation.mutate(popup.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
