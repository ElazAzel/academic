"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Replace, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScormBlockEditorProps {
  lessonId: string;
  packageInfo?: {
    id: string;
    title: string;
    version: string;
    organizations: Array<{ identifier: string; title: string }>;
    fileCount: number;
  } | null;
  onPackageChange: (pkg: Record<string, unknown> | null) => void;
}

export function ScormBlockEditor({ lessonId, packageInfo, onPackageChange }: ScormBlockEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      toast.error("Можно загружать только ZIP-файлы");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/lessons/${lessonId}/scorm/import`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message || "Ошибка импорта");
        return;
      }

      onPackageChange(json.data as Record<string, unknown>);
      toast.success("SCORM-пакет загружен");
    } catch {
      toast.error("Ошибка сети при загрузке");
    } finally {
      setUploading(false);
    }
  }, [lessonId, onPackageChange]);

  const handleDelete = useCallback(async () => {
    if (!packageInfo?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/lessons/${lessonId}/scorm/package`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Ошибка удаления");
        return;
      }
      onPackageChange(null);
      toast.success("SCORM-пакет удалён");
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setDeleting(false);
    }
  }, [lessonId, packageInfo?.id, onPackageChange]);

  if (packageInfo) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 mt-0.5 text-m3-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{packageInfo.title}</p>
              <p className="text-sm text-muted-foreground">
                SCORM {packageInfo.version} · {packageInfo.fileCount} файлов
              </p>
              {packageInfo.organizations?.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {packageInfo.organizations.length} организаций
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => document.getElementById("scorm-zip-input")?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
              Заменить
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Удалить
            </Button>
          </div>
          <input id="scorm-zip-input" type="file" accept=".zip" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Загрузите SCORM-пакет (ZIP)</p>
          <Button variant="outline" disabled={uploading} onClick={() => document.getElementById("scorm-zip-input")?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Загрузка..." : "Выбрать ZIP"}
          </Button>
          <input id="scorm-zip-input" type="file" accept=".zip" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }} />
        </div>
      </CardContent>
    </Card>
  );
}
