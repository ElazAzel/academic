"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import type { LessonAttendanceRow, StudentAttendanceDetail } from "@/server/actions/attendance";

/* ── Course selector step ──────────────────────────────────────────── */

interface CourseOption {
  id: string;
  title: string;
  status: string;
}

function CourseSelector({ onSelect }: { onSelect: (courseId: string) => void }) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/courses?role=instructor")
      .then((r) => r.json())
      .then((data) => {
        setCourses(Array.isArray(data) ? data : data.data ?? []);
      })
      .catch(() => toast.error("Не удалось загрузить курсы"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-m3-on-surface-variant">
        <span className="animate-pulse">Загрузка курсов...</span>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-m3-on-surface-variant">
          <Icon name="menu_book" size={40} className="opacity-40" />
          <p>У вас пока нет курсов</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <button
          key={course.id}
          type="button"
          onClick={() => onSelect(course.id)}
          className="group rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest p-4 text-left shadow-m3-soft transition-all hover:border-m3-primary hover:shadow-m3-md focus:outline-none focus:ring-2 focus:ring-m3-primary"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-label-md font-label-md text-m3-on-surface group-hover:text-m3-primary transition-colors">
              {course.title}
            </span>
            <Badge variant={course.status === "PUBLISHED" ? "default" : "secondary"}>
              {course.status === "PUBLISHED" ? "Опубликован" : "Черновик"}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Attendance table ──────────────────────────────────────────────── */

function AttendanceTable({
  rows,
  onSelectLesson,
}: {
  rows: LessonAttendanceRow[];
  onSelectLesson: (lessonId: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Модуль</TableHead>
          <TableHead>Урок</TableHead>
          <TableHead className="text-right">Студентов</TableHead>
          <TableHead className="text-right">Просмотрели</TableHead>
          <TableHead className="text-right">%</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.lessonId}>
            <TableCell className="text-m3-on-surface-variant">{row.moduleTitle}</TableCell>
            <TableCell className="font-medium">{row.lessonTitle}</TableCell>
            <TableCell className="text-right">{row.totalStudents}</TableCell>
            <TableCell className="text-right">{row.viewedStudents}</TableCell>
            <TableCell className="text-right">
              <span
                className={
                  row.viewPercent >= 80
                    ? "text-emerald-600"
                    : row.viewPercent >= 50
                      ? "text-amber-600"
                      : "text-rose-600"
                }
              >
                {row.viewPercent}%
              </span>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectLesson(row.lessonId)}
              >
                Детали
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Lesson detail panel ───────────────────────────────────────────── */

function LessonDetail({
  lessonId,
  onBack,
}: {
  lessonId: string;
  onBack: () => void;
}) {
  const [students, setStudents] = useState<StudentAttendanceDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/lessons/${lessonId}/attendance`)
      .then((r) => r.json())
      .then((data) => {
        setStudents(data.data ?? []);
      })
      .catch(() => toast.error("Не удалось загрузить детали"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <Icon name="arrow_back" size={16} className="mr-1" />
          Назад к списку
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-m3-on-surface-variant">
          <span className="animate-pulse">Загрузка...</span>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Студент</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Последний просмотр</TableHead>
              <TableHead className="text-right">Прогресс</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.userId}>
                <TableCell className="font-medium">{s.userName}</TableCell>
                <TableCell className="text-m3-on-surface-variant">{s.email}</TableCell>
                <TableCell>
                  {s.lastLessonAccess
                    ? new Date(s.lastLessonAccess).toLocaleDateString("ru", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Progress value={s.progressPercent} className="h-1.5 w-20" />
                    <span className="text-label-sm font-label-sm text-m3-on-surface-variant w-8 text-right">
                      {s.progressPercent}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────── */

export function AttendanceDashboard() {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<LessonAttendanceRow[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAttendance = useCallback(async (courseId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/attendance`);
      const data = await res.json();
      setAttendanceRows(data.data ?? []);
      setSelectedCourseId(courseId);
    } catch {
      toast.error("Не удалось загрузить посещаемость");
    } finally {
      setLoading(false);
    }
  }, []);

  if (selectedLessonId) {
    return (
      <LessonDetail
        lessonId={selectedLessonId}
        onBack={() => setSelectedLessonId(null)}
      />
    );
  }

  if (!selectedCourseId) {
    return <CourseSelector onSelect={loadAttendance} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => { setSelectedCourseId(null); setAttendanceRows([]); }}>
          <Icon name="arrow_back" size={16} className="mr-1" />
          Выбрать другой курс
        </Button>
        <Badge variant="outline" className="text-m3-on-surface-variant">
          {attendanceRows.length} уроков
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-m3-on-surface-variant">
          <span className="animate-pulse">Загрузка посещаемости...</span>
        </div>
      ) : attendanceRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-m3-on-surface-variant">
            <Icon name="bar_chart" size={40} className="opacity-40" />
            <p>Нет данных о посещаемости</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <AttendanceTable
              rows={attendanceRows}
              onSelectLesson={setSelectedLessonId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
