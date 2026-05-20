"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Plus, Check, Eye, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Student {
  id: string;
  name: string;
  email: string;
  cohortName: string;
  courseTitle: string;
}

interface Popup {
  id: string;
  title: string;
  message: string;
  targetUserIds: string[];
  isActive: boolean;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
  views: Array<{ userId: string; viewedAt: string }>;
}

interface Props {
  students: Student[];
  curatorId: string;
}

export function CuratorPopupClient({ students, curatorId }: Props) {
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: popups = [] } = useQuery<Popup[]>({
    queryKey: ["curator-popups"],
    queryFn: async () => {
      const res = await fetch("/api/v1/popups");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      // Filter to only show popups created by this curator
      return (json.data ?? []).filter((p: Popup) => p.createdBy?.id === curatorId);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedStudents.length === 0) throw new Error("Выберите хотя бы одного слушателя");
      if (!title.trim()) throw new Error("Введите заголовок");
      if (!message.trim()) throw new Error("Введите текст сообщения");

      const res = await fetch("/api/v1/popups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetUserIds: selectedStudents,
          targetRoles: [],
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Ошибка создания");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curator-popups"] });
      setShowForm(false);
      setSelectedStudents([]);
      setTitle("");
      setMessage("");
      toast.success("Уведомление отправлено слушателям");
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    },
  });

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const getViewStats = (popup: Popup) => {
    const viewCount = popup.views?.length ?? 0;
    const totalSent = popup.targetUserIds?.length ?? 0;
    return { viewCount, totalSent };
  };

  return (
    <div className="space-y-6">
      {/* Create new popup section */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Попапы — всплывающие уведомления, которые увидят ваши слушатели при входе в платформу.
        </p>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Отмена" : "Создать уведомление"}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Новое уведомление слушателю</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Выберите слушателей *</Label>
              <div className="max-h-48 overflow-y-auto rounded-lg border p-2 space-y-1">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer text-sm transition-colors ${
                      selectedStudents.includes(student.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                    onClick={() => toggleStudent(student.id)}
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center ${
                        selectedStudents.includes(student.id)
                          ? "bg-primary border-primary"
                          : "border-input"
                      }`}
                    >
                      {selectedStudents.includes(student.id) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {student.courseTitle} · {student.cohortName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedStudents.length === 0 && (
                <p className="text-xs text-muted-foreground">Никто не выбран</p>
              )}
              {selectedStudents.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Выбрано: {selectedStudents.length} из {students.length}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Заголовок *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Напоминание о задании"
              />
            </div>

            <div className="space-y-2">
              <Label>Текст сообщения *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Текст уведомления..."
                rows={3}
              />
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || selectedStudents.length === 0 || !title || !message}
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
                  Отправить уведомление ({selectedStudents.length})
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Popup history */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">История уведомлений</h3>
        {popups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Уведомлений пока нет.
            </CardContent>
          </Card>
        ) : (
          popups.map((popup) => {
            const { viewCount, totalSent } = getViewStats(popup);
            return (
              <Card key={popup.id} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">{popup.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {popup.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {totalSent} получателей
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {viewCount} просмотрели
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(popup.createdAt), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge variant={totalSent > 0 && viewCount === totalSent ? "default" : "secondary"}>
                      {viewCount}/{totalSent}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
